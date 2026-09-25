"""
Otaku - Manga OCR & Auto-Translation Module
=============================================
Detects speech-bubble/panel text in manga page images, extracts it via OCR,
and (optionally) translates it — powering the "Translate as you read" and
"Real-time translation layer" features described in the pitch deck.

Three OCR backends are supported:
  0. MangaOCR  - RECOMMENDED for Japanese manga. EasyOCR's CRAFT detector finds
                 text, boxes are merged into bubbles, and the `manga-ocr` model
                 (trained on manga, handles vertical text) reads each bubble.
  1. EasyOCR   - deep-learning based, strong on stylized manga fonts and
                 non-Latin scripts (Japanese, Korean, Chinese). Recommended.
  2. Tesseract - lightweight, CPU-only, good fallback if EasyOCR/torch is
                 too heavy for your deployment target.

Install (pick one or both):
    pip install -r requirements.txt        # mangaocr + easyocr backends
    pip install easyocr opencv-python-headless pillow deep-translator
    pip install pytesseract opencv-python-headless pillow deep-translator
    # Tesseract also needs the system binary:
    #   macOS:  brew install tesseract tesseract-lang
    #   Ubuntu: sudo apt install tesseract-ocr tesseract-ocr-jpn

Usage:
    from otaku_ocr import MangaOCR

    ocr = MangaOCR(backend="mangaocr", languages=["ja", "en"])
    results = ocr.read_page("page_042.jpg", translate_to="en")

    for block in results:
        print(block.original_text, "->", block.translated_text)
"""

from __future__ import annotations

import os
import io
import json
import time
import glob
import queue
import hashlib
import logging
import threading
import functools
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Callable, Any, Iterable

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


# --------------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------------

logger = logging.getLogger("otaku.manga_ocr")
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s", "%H:%M:%S"
    ))
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)


# --------------------------------------------------------------------------
# Data model
# --------------------------------------------------------------------------

@dataclass
class TextBlock:
    """One detected piece of text on a manga page (e.g. one speech bubble)."""
    text: str
    confidence: Optional[float]   # None for the mangaocr backend (model gives no score)
    bbox: Tuple[int, int, int, int]   # (x_min, y_min, x_max, y_max) in pixels
    original_language: Optional[str] = None
    translated_text: Optional[str] = None
    translated_language: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PageResult:
    """OCR + translation result for a full page."""
    image_path: str
    width: int
    height: int
    blocks: List[TextBlock] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "image_path": self.image_path,
            "width": self.width,
            "height": self.height,
            "blocks": [b.to_dict() for b in self.blocks],
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)


# --------------------------------------------------------------------------
# Image preprocessing — improves OCR accuracy on scanned/compressed manga
# --------------------------------------------------------------------------

def preprocess_for_ocr(image: np.ndarray) -> np.ndarray:
    """
    Cleans up a manga page before OCR:
      - grayscale
      - upscale small images (OCR struggles below ~150dpi-equivalent)
      - denoise
      - adaptive threshold to punch up faint/half-tone screen-toned text
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image

    # Upscale small pages so text isn't sub-pixel
    h, w = gray.shape[:2]
    if max(h, w) < 1600:
        scale = 1600 / max(h, w)
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    thresh = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=15,
    )
    return thresh


def detect_speech_bubbles(image: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Rough speech-bubble localization using contour detection on white/near-white
    blobs with a roughly elliptical shape. This is a lightweight heuristic —
    for production accuracy, swap in a trained bubble-detection model
    (e.g. a YOLO model fine-tuned on manga109) and feed its boxes into
    MangaOCR.read_page(regions=...).
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    _, mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes = []
    img_area = gray.shape[0] * gray.shape[1]
    for cnt in contours:
        area = cv2.contourArea(cnt)
        # filter out noise specks and full-page-sized blobs
        if area < img_area * 0.001 or area > img_area * 0.25:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        aspect = w / max(h, 1)
        if 0.3 < aspect < 3.5:  # bubbles are roughly square/round, not thin slivers
            boxes.append((x, y, x + w, y + h))

    return boxes


def merge_boxes(
    boxes: List[Tuple[int, int, int, int]],
    image_shape: Tuple[int, int],
    gap: Optional[int] = None,
    pad: int = 6,
) -> List[Tuple[int, int, int, int]]:
    """
    Merges many small text boxes (single characters / vertical columns) into
    bubble-sized regions: boxes that touch after being grown by `gap` pixels
    are unioned. Result is padded and clamped to the image. Reading order is
    manga-style: top band first, right-to-left inside a band.
    """
    h, w = image_shape[:2]
    gap = gap if gap is not None else max(8, int(0.03 * min(h, w)))
    rects = [list(b) for b in boxes if b[2] > b[0] and b[3] > b[1]]

    changed = True
    while changed:
        changed = False
        out: List[List[int]] = []
        for r in rects:
            for o in out:
                if (r[0] - gap <= o[2] and o[0] - gap <= r[2] and
                        r[1] - gap <= o[3] and o[1] - gap <= r[3]):
                    o[0], o[1] = min(o[0], r[0]), min(o[1], r[1])
                    o[2], o[3] = max(o[2], r[2]), max(o[3], r[3])
                    changed = True
                    break
            else:
                out.append(r)
        rects = out

    band = max(1, h // 4)
    rects.sort(key=lambda r: (r[1] // band, -r[2]))
    return [(max(0, x1 - pad), max(0, y1 - pad), min(w, x2 + pad), min(h, y2 + pad))
            for x1, y1, x2, y2 in rects]


# --------------------------------------------------------------------------
# Main OCR engine
# --------------------------------------------------------------------------

class MangaOCR:
    def __init__(
        self,
        backend: str = "easyocr",
        languages: Optional[List[str]] = None,
        gpu: bool = False,
        min_confidence: float = 0.35,
        glossary: Optional["TranslationGlossary"] = None,
        cache: Optional["TranslationCache"] = None,
    ):
        """
        backend:      "mangaocr" (best for Japanese), "easyocr" or "tesseract"
        languages:    EasyOCR language codes, e.g. ["ja", "en"], ["ko"], ["ch_sim"]
                      (Tesseract uses its own 3-letter codes internally — mapped below)
        gpu:          use CUDA for EasyOCR if available
        min_confidence: drop OCR results below this confidence score (0-1)
        glossary:     optional TranslationGlossary for consistent character
                      names/terms and reader-submitted corrections
        cache:        optional TranslationCache to skip repeat API calls
        """
        self.backend = backend
        self.languages = languages or ["ja", "en"]
        self.min_confidence = min_confidence
        self.glossary = glossary
        self.cache = cache
        self._reader = None
        self._mocr = None

        if backend == "easyocr":
            import easyocr  # lazy import so tesseract-only installs don't need torch
            self._reader = easyocr.Reader(self.languages, gpu=gpu)
        elif backend == "mangaocr":
            import easyocr                       # CRAFT text detector
            from manga_ocr import MangaOcr       # pip package `manga-ocr` (recognizer)
            self._reader = easyocr.Reader(self.languages, gpu=gpu)
            self._mocr = MangaOcr()              # downloads the model on first run
        elif backend == "tesseract":
            import pytesseract  # noqa: F401  (import check only)
        else:
            raise ValueError(
                f"Unknown backend: {backend!r}. Use 'mangaocr', 'easyocr' or 'tesseract'.")

    # -- backend-specific readers -----------------------------------------

    def _read_with_easyocr(self, image: np.ndarray) -> List[TextBlock]:
        raw_results = self._reader.readtext(image)  # [(bbox, text, conf), ...]
        blocks = []
        for bbox_pts, text, conf in raw_results:
            if conf < self.min_confidence or not text.strip():
                continue
            xs = [p[0] for p in bbox_pts]
            ys = [p[1] for p in bbox_pts]
            blocks.append(TextBlock(
                text=text.strip(),
                confidence=float(conf),
                bbox=(int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))),
            ))
        return blocks

    def _detect_text_boxes(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        horizontal, free = self._reader.detect(
            image, min_size=10, text_threshold=0.5, low_text=0.3,
            link_threshold=0.4, canvas_size=2560, mag_ratio=1.0)
        boxes: List[Tuple[int, int, int, int]] = []
        for x_min, x_max, y_min, y_max in (horizontal[0] if horizontal else []):
            boxes.append((int(x_min), int(y_min), int(x_max), int(y_max)))
        for poly in (free[0] if free else []):
            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            boxes.append((int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))))
        return boxes

    def _read_with_mangaocr(self, image: np.ndarray) -> List[TextBlock]:
        """detect (CRAFT) -> merge into bubbles -> recognize each with manga-ocr."""
        regions = merge_boxes(self._detect_text_boxes(image), image.shape)
        blocks: List[TextBlock] = []
        for (x1, y1, x2, y2) in regions:
            crop = image[y1:y2, x1:x2]
            if crop.size == 0:
                continue
            rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB) if crop.ndim == 3 else crop
            text = str(self._mocr(Image.fromarray(rgb))).strip()
            if text:
                blocks.append(TextBlock(text=text, confidence=None, bbox=(x1, y1, x2, y2)))
        return blocks

    _TESSERACT_LANG_MAP = {
        "ja": "jpn", "en": "eng", "ko": "kor",
        "ch_sim": "chi_sim", "ch_tra": "chi_tra",
    }

    def _read_with_tesseract(self, image: np.ndarray) -> List[TextBlock]:
        import pytesseract
        tess_langs = "+".join(
            self._TESSERACT_LANG_MAP.get(l, l) for l in self.languages
        )
        data = pytesseract.image_to_data(
            image, lang=tess_langs, output_type=pytesseract.Output.DICT
        )

        blocks = []
        n = len(data["text"])
        for i in range(n):
            text = data["text"][i].strip()
            conf_raw = data["conf"][i]
            try:
                conf = float(conf_raw) / 100.0
            except (ValueError, TypeError):
                continue
            if not text or conf < self.min_confidence:
                continue
            x, y, w, h = (data["left"][i], data["top"][i],
                          data["width"][i], data["height"][i])
            blocks.append(TextBlock(
                text=text,
                confidence=conf,
                bbox=(x, y, x + w, y + h),
            ))
        return blocks

    # -- public API ----------------------------------------------------

    def read_page(
        self,
        image_path: str,
        regions: Optional[List[Tuple[int, int, int, int]]] = None,
        translate_to: Optional[str] = None,
        preprocess: bool = True,
    ) -> PageResult:
        """
        Run OCR on one manga page.

        regions:       optional list of (x1,y1,x2,y2) boxes to restrict OCR to
                        (e.g. from a bubble-detection model). If omitted, OCR
                        runs on the whole page.
        translate_to:  target language code (e.g. "en") to auto-translate
                        detected text into. Requires `deep-translator`.
        preprocess:    apply denoise/threshold before OCR (recommended for
                        scanned/compressed pages; can hurt very clean digital
                        source images — try both).
        """
        pil_img = Image.open(image_path).convert("RGB")
        image = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        height, width = image.shape[:2]

        if self.backend == "mangaocr":
            preprocess = False   # manga-ocr expects the original pixels, not a binarized page
        ocr_input = preprocess_for_ocr(image) if preprocess else image

        if regions:
            blocks: List[TextBlock] = []
            for (x1, y1, x2, y2) in regions:
                crop = ocr_input[y1:y2, x1:x2]
                if crop.size == 0:
                    continue
                sub_blocks = self._run_backend(crop)
                # offset bbox coords back into full-page space
                for b in sub_blocks:
                    bx1, by1, bx2, by2 = b.bbox
                    b.bbox = (bx1 + x1, by1 + y1, bx2 + x1, by2 + y1)
                blocks.extend(sub_blocks)
        else:
            blocks = self._run_backend(ocr_input)

        if translate_to:
            self._translate_blocks(blocks, target=translate_to)

        return PageResult(image_path=image_path, width=width, height=height, blocks=blocks)

    def read_page_auto_bubbles(
        self, image_path: str, translate_to: Optional[str] = None
    ) -> PageResult:
        """Convenience: detect bubbles heuristically, then OCR each one.
        (mangaocr does its own detection, so it reads the whole page instead.)"""
        if self.backend == "mangaocr":
            return self.read_page(image_path, translate_to=translate_to)
        pil_img = Image.open(image_path).convert("RGB")
        image = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        boxes = detect_speech_bubbles(image)
        return self.read_page(image_path, regions=boxes, translate_to=translate_to)

    def _run_backend(self, image: np.ndarray) -> List[TextBlock]:
        if self.backend == "mangaocr":
            return self._read_with_mangaocr(image)
        if self.backend == "easyocr":
            return self._read_with_easyocr(image)
        return self._read_with_tesseract(image)

    def _translate_blocks(self, blocks: List[TextBlock], target: str) -> None:
        """Fills in translated_text on each block, using glossary + cache when configured."""
        if not blocks:
            return

        cache = self.cache
        glossary = self.glossary
        translator = None  # built lazily — only paid for if glossary+cache miss

        for b in blocks:
            # 1. Glossary exact/phrase overrides take priority (character names,
            #    honorifics, running jokes — the "learns from user corrections"
            #    behavior described in the pitch deck).
            glossary_hit = glossary.lookup(b.text, target) if glossary else None
            if glossary_hit is not None:
                b.translated_text = glossary_hit
                b.translated_language = target
                continue

            # 2. Cache avoids re-paying the translation API for repeated lines
            #    (very common in manga: "Huh?!", "...", stock exclamations).
            cache_key = cache.make_key(b.text, target) if cache is not None else None
            cached = cache.get(cache_key) if cache is not None else None
            if cached is not None:
                b.translated_text = cached
                b.translated_language = target
                continue

            # 3. Fall back to the live translation API, with retry/backoff.
            try:
                if translator is None:
                    translator = _get_translator(target)
                translated = _translate_with_retry(translator, b.text)
                # apply word-level glossary substitutions (e.g. character names
                # that a generic MT API would otherwise mistranslate)
                if glossary:
                    translated = glossary.apply_substitutions(translated, target)
                b.translated_text = translated
                b.translated_language = target
                if cache is not None:
                    cache.set(cache_key, translated)
            except Exception as e:
                logger.warning("Translation failed for %r: %s", b.text[:40], e)
                b.translated_text = None
                b.translated_language = None


def _get_translator(target: str):
    from deep_translator import GoogleTranslator
    return GoogleTranslator(source="auto", target=target)


def retry(max_attempts: int = 3, base_delay: float = 0.5, exceptions=(Exception,)):
    """Generic retry decorator with exponential backoff, used for flaky network calls
    (translation APIs, remote model downloads) so a single hiccup doesn't sink a page."""
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt == max_attempts:
                        break
                    delay = base_delay * (2 ** (attempt - 1))
                    logger.debug("Retry %d/%d after error: %s (sleeping %.2fs)",
                                 attempt, max_attempts, e, delay)
                    time.sleep(delay)
            raise last_exc
        return wrapper
    return decorator


@retry(max_attempts=3, base_delay=0.5)
def _translate_with_retry(translator, text: str) -> str:
    return translator.translate(text)


# --------------------------------------------------------------------------
# Glossary — keeps character names, honorifics, and running terms consistent
# across a whole series, and lets readers correct mistranslations that then
# stick ("Glossary and user corrections to improve consistency over time").
# --------------------------------------------------------------------------

class TranslationGlossary:
    """
    A per-series (or global) dictionary of fixed translations.

    Two kinds of entries:
      - exact_overrides: whole source string -> fixed target string
                          (great for stock sound effects: "…" , "ドキドキ" -> "thump thump")
      - substitutions:   source substring -> target substring, applied to
                          the *translated* text (great for character names
                          a generic MT model keeps getting wrong, e.g.
                          rendering "Luffy" as "Rufi").
    """

    def __init__(self, path: Optional[str] = None):
        self.path = path
        self.exact_overrides: Dict[str, Dict[str, str]] = {}   # {target_lang: {source: translation}}
        self.substitutions: Dict[str, Dict[str, str]] = {}     # {target_lang: {wrong: right}}
        if path and os.path.exists(path):
            self.load(path)

    def load(self, path: str) -> None:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.exact_overrides = data.get("exact_overrides", {})
        self.substitutions = data.get("substitutions", {})
        logger.info("Loaded glossary from %s (%d exact, %d substitution langs)",
                    path, sum(len(v) for v in self.exact_overrides.values()),
                    len(self.substitutions))

    def save(self, path: Optional[str] = None) -> None:
        path = path or self.path
        if not path:
            raise ValueError("No path given to save glossary to.")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "exact_overrides": self.exact_overrides,
                "substitutions": self.substitutions,
            }, f, ensure_ascii=False, indent=2)

    def lookup(self, source_text: str, target_lang: str) -> Optional[str]:
        return self.exact_overrides.get(target_lang, {}).get(source_text.strip())

    def apply_substitutions(self, translated_text: str, target_lang: str) -> str:
        subs = self.substitutions.get(target_lang, {})
        for wrong, right in subs.items():
            translated_text = translated_text.replace(wrong, right)
        return translated_text

    def add_correction(self, source_text: str, target_lang: str, corrected_translation: str) -> None:
        """Call this when a reader edits a translation in-app — the fix is
        remembered for every future occurrence of that exact line."""
        self.exact_overrides.setdefault(target_lang, {})[source_text.strip()] = corrected_translation
        logger.info("Glossary updated: %r -> %r (%s)", source_text, corrected_translation, target_lang)

    def add_name_substitution(self, target_lang: str, wrong: str, right: str) -> None:
        self.substitutions.setdefault(target_lang, {})[wrong] = right


# --------------------------------------------------------------------------
# Translation cache — avoids re-translating identical lines (very common in
# manga: repeated exclamations, sound effects, catchphrases) and keeps the
# app responsive/offline-friendly per the "on-device caching" architecture
# slide. Backed by a simple JSON file; swap in Redis/SQLite for production.
# --------------------------------------------------------------------------

class TranslationCache:
    def __init__(self, path: Optional[str] = None, autosave_every: int = 20):
        self.path = path
        self._store: Dict[str, str] = {}
        self._dirty_count = 0
        self.autosave_every = autosave_every
        self._lock = threading.Lock()
        if path and os.path.exists(path):
            self._load()

    @staticmethod
    def make_key(text: str, target_lang: str) -> str:
        digest = hashlib.sha256(f"{target_lang}::{text.strip()}".encode("utf-8")).hexdigest()
        return digest

    def _load(self) -> None:
        with open(self.path, "r", encoding="utf-8") as f:
            self._store = json.load(f)
        logger.info("Loaded translation cache: %d entries from %s", len(self._store), self.path)

    def get(self, key: Optional[str]) -> Optional[str]:
        if key is None:
            return None
        with self._lock:
            return self._store.get(key)

    def set(self, key: Optional[str], value: str) -> None:
        if key is None:
            return
        with self._lock:
            self._store[key] = value
            self._dirty_count += 1
            if self.path and self._dirty_count >= self.autosave_every:
                self._flush()

    def _flush(self) -> None:
        if not self.path:
            return
        tmp_path = f"{self.path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(self._store, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, self.path)
        self._dirty_count = 0
        logger.debug("Flushed translation cache (%d entries) to %s", len(self._store), self.path)

    def flush(self) -> None:
        with self._lock:
            self._flush()

    def __len__(self) -> int:
        return len(self._store)

    def __bool__(self) -> bool:
        # Without this, `if cache:` would be False for a freshly-created,
        # empty-but-valid cache (since Python falls back to __len__ for
        # truthiness) — always truthy for an existing instance instead.
        return True


# --------------------------------------------------------------------------
# Overlay rendering — draws translated text back onto the page image so the
# reader can "toggle original vs translated text instantly" as described in
# the Product Concept slide, without leaving the chapter view.
# --------------------------------------------------------------------------

class OverlayRenderer:
    """
    Renders a translated version of a manga page by whiting-out each detected
    text region and drawing wrapped translated text in its place.

    This is a readable, functional baseline (not full typesetting/lettering
    automation) — good enough for an MVP "reading-first" translation overlay.
    """

    def __init__(self, font_path: Optional[str] = None, min_font_size: int = 10,
                 max_font_size: int = 28, padding: int = 4):
        self.font_path = font_path  # None -> PIL default bitmap font
        self.min_font_size = min_font_size
        self.max_font_size = max_font_size
        self.padding = padding

    def render(self, image_path: str, result: "PageResult", use_translation: bool = True) -> Image.Image:
        img = Image.open(image_path).convert("RGB")
        draw = ImageDraw.Draw(img)

        for block in result.blocks:
            text = (block.translated_text if use_translation else block.text) or ""
            if not text.strip():
                continue
            x1, y1, x2, y2 = block.bbox
            box_w, box_h = max(x2 - x1, 1), max(y2 - y1, 1)

            # white-out the original text region before drawing the replacement
            draw.rectangle([x1, y1, x2, y2], fill="white")

            font_size, wrapped_lines = self._fit_text(draw, text, box_w, box_h)
            font = self._load_font(font_size)

            line_height = font_size + 2
            total_text_h = line_height * len(wrapped_lines)
            y = y1 + max((box_h - total_text_h) // 2, 0)
            for line in wrapped_lines:
                line_w = draw.textlength(line, font=font) if hasattr(draw, "textlength") else font_size * len(line) * 0.6
                x = x1 + max((box_w - line_w) // 2, 0)
                draw.text((x, y), line, fill="black", font=font)
                y += line_height

        return img

    def render_to_file(self, image_path: str, result: "PageResult",
                        out_path: str, use_translation: bool = True) -> str:
        rendered = self.render(image_path, result, use_translation=use_translation)
        rendered.save(out_path)
        return out_path

    def _load_font(self, size: int):
        try:
            if self.font_path:
                return ImageFont.truetype(self.font_path, size)
            return ImageFont.load_default()
        except Exception:
            return ImageFont.load_default()

    def _fit_text(self, draw: "ImageDraw.ImageDraw", text: str,
                   box_w: int, box_h: int) -> Tuple[int, List[str]]:
        """Shrinks font size and word-wraps until the text fits the bubble box."""
        for size in range(self.max_font_size, self.min_font_size - 1, -1):
            font = self._load_font(size)
            words = text.split()
            lines, current = [], ""
            for word in words:
                trial = f"{current} {word}".strip()
                w = draw.textlength(trial, font=font) if hasattr(draw, "textlength") else size * len(trial) * 0.6
                if w <= box_w - self.padding * 2:
                    current = trial
                else:
                    if current:
                        lines.append(current)
                    current = word
            if current:
                lines.append(current)

            total_h = (size + 2) * len(lines)
            if total_h <= box_h - self.padding * 2:
                return size, lines

        # nothing fit cleanly — return smallest size with best-effort wrap
        return self.min_font_size, [text]


# --------------------------------------------------------------------------
# Batch processing — OCR + translate an entire chapter (directory of pages)
# with simple progress reporting. Mirrors the "server-side queues for burst
# traffic and large chapters" item from the architecture slide.
# --------------------------------------------------------------------------

@dataclass
class ChapterResult:
    chapter_dir: str
    pages: List[PageResult] = field(default_factory=list)
    errors: List[Dict[str, str]] = field(default_factory=list)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps({
            "chapter_dir": self.chapter_dir,
            "pages": [p.to_dict() for p in self.pages],
            "errors": self.errors,
        }, ensure_ascii=False, indent=indent)


def process_chapter(
    ocr: "MangaOCR",
    chapter_dir: str,
    translate_to: Optional[str] = None,
    auto_bubbles: bool = True,
    extensions: Tuple[str, ...] = (".jpg", ".jpeg", ".png", ".webp"),
    on_progress: Optional[Callable[[int, int, str], None]] = None,
) -> ChapterResult:
    """
    Runs OCR (+ optional translation) across every page image in a directory,
    in natural filename order (page_001.jpg, page_002.jpg, ...).
    """
    paths = sorted(
        p for p in glob.glob(os.path.join(chapter_dir, "*"))
        if os.path.splitext(p)[1].lower() in extensions
    )
    result = ChapterResult(chapter_dir=chapter_dir)

    for i, path in enumerate(paths, start=1):
        try:
            if auto_bubbles:
                page = ocr.read_page_auto_bubbles(path, translate_to=translate_to)
            else:
                page = ocr.read_page(path, translate_to=translate_to)
            result.pages.append(page)
            logger.info("OCR'd page %d/%d: %s (%d text blocks)",
                        i, len(paths), os.path.basename(path), len(page.blocks))
        except Exception as e:
            logger.error("Failed on page %s: %s", path, e)
            result.errors.append({"page": path, "error": str(e)})

        if on_progress:
            on_progress(i, len(paths), path)

    return result


# --------------------------------------------------------------------------
# Lightweight worker-pool queue — decouples page-upload from OCR processing
# so a spike in reader traffic doesn't block the request thread (the
# "scalable reading pipeline" from the architecture slide).
# --------------------------------------------------------------------------

class OCRJobQueue:
    """
    Minimal in-process producer/consumer queue for background OCR jobs.
    In production this role is filled by a real broker (SQS, Redis Streams,
    Celery/RQ) — this class exists so the module is runnable standalone and
    so the queueing *shape* of the pipeline is testable without extra infra.
    """

    def __init__(self, ocr: "MangaOCR", num_workers: int = 2):
        self.ocr = ocr
        self._queue: "queue.Queue[Tuple[str, dict, Callable]]" = queue.Queue()
        self._workers: List[threading.Thread] = []
        self._stop = threading.Event()
        for _ in range(num_workers):
            t = threading.Thread(target=self._worker_loop, daemon=True)
            t.start()
            self._workers.append(t)

    def submit(self, image_path: str, options: Optional[dict] = None,
               callback: Optional[Callable[[PageResult], None]] = None) -> None:
        self._queue.put((image_path, options or {}, callback))

    def _worker_loop(self) -> None:
        while not self._stop.is_set():
            try:
                image_path, options, callback = self._queue.get(timeout=0.5)
            except queue.Empty:
                continue
            try:
                result = self.ocr.read_page(image_path, **options)
                if callback:
                    callback(result)
            except Exception as e:
                logger.error("OCR job failed for %s: %s", image_path, e)
            finally:
                self._queue.task_done()

    def wait_all(self) -> None:
        self._queue.join()

    def shutdown(self) -> None:
        self._stop.set()


# --------------------------------------------------------------------------
# REST API layer — exposes the pipeline as HTTP endpoints so the mobile app /
# reader front-end can call it directly. This backs the "Web + mobile
# delivery" architecture item. Requires: pip install fastapi uvicorn python-multipart
# Run with:  python otaku_ocr.py serve   (or uvicorn otaku_ocr:create_app --factory)
# --------------------------------------------------------------------------

def _safe_upload_path(upload_dir: str, filename: Optional[str]) -> str:
    """Never trust client filenames (path traversal / collisions)."""
    ext = os.path.splitext(os.path.basename(filename or ""))[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    return os.path.join(upload_dir, f"{hashlib.sha1(os.urandom(16)).hexdigest()}{ext}")


def build_app(
    backend: str = "mangaocr",
    languages: Optional[List[str]] = None,
    glossary_path: Optional[str] = None,
    cache_path: Optional[str] = None,
):
    """
    Builds a FastAPI app around a shared MangaOCR instance. Kept as a factory
    function (rather than a bare module-level app) so tests and multiple
    deployments can configure separate backends/glossaries.
    """
    from fastapi import FastAPI, UploadFile, File, Form, HTTPException
    from fastapi.responses import JSONResponse, FileResponse

    glossary = TranslationGlossary(glossary_path) if glossary_path else TranslationGlossary()
    cache = TranslationCache(cache_path) if cache_path else TranslationCache()
    ocr = MangaOCR(backend=backend, languages=languages, glossary=glossary, cache=cache)
    renderer = OverlayRenderer()

    app = FastAPI(title="Otaku Manga OCR Service", version="1.0")
    UPLOAD_DIR = os.path.join(__import__("tempfile").gettempdir(), "otaku_uploads")
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    @app.get("/health")
    def health():
        return {"status": "ok", "backend": backend, "languages": languages or ["ja", "en"]}

    @app.post("/ocr")
    async def ocr_page(
        file: UploadFile = File(...),
        translate_to: Optional[str] = Form(default=None),
        auto_bubbles: bool = Form(default=True),
    ):
        dest = _safe_upload_path(UPLOAD_DIR, file.filename)
        with open(dest, "wb") as f:
            f.write(await file.read())

        try:
            if auto_bubbles:
                result = ocr.read_page_auto_bubbles(dest, translate_to=translate_to)
            else:
                result = ocr.read_page(dest, translate_to=translate_to)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"OCR failed: {e}")

        return JSONResponse(result.to_dict())

    @app.post("/ocr/overlay")
    async def ocr_page_with_overlay(
        file: UploadFile = File(...),
        translate_to: str = Form(default="en"),
        auto_bubbles: bool = Form(default=True),
    ):
        """Returns a rendered page image with translated text drawn in place —
        what the reader sees when translation mode is toggled on."""
        dest = _safe_upload_path(UPLOAD_DIR, file.filename)
        with open(dest, "wb") as f:
            f.write(await file.read())

        result = (ocr.read_page_auto_bubbles(dest, translate_to=translate_to)
                   if auto_bubbles else ocr.read_page(dest, translate_to=translate_to))

        out_path = os.path.join(UPLOAD_DIR, "translated_" + os.path.basename(dest))
        renderer.render_to_file(dest, result, out_path, use_translation=True)
        return FileResponse(out_path)

    @app.post("/glossary/correction")
    def submit_correction(source_text: str = Form(...), target_lang: str = Form(...),
                           corrected_translation: str = Form(...)):
        """Lets a reader fix a mistranslation in-app; the fix is remembered
        for every future occurrence of that line."""
        glossary.add_correction(source_text, target_lang, corrected_translation)
        if glossary_path:
            glossary.save(glossary_path)
        return {"status": "saved"}

    @app.get("/cache/stats")
    def cache_stats():
        return {"cached_translations": len(cache)}

    return app


def create_app():
    """For `uvicorn otaku_ocr:create_app --factory`. Built lazily so importing this
    module never loads ML models. Backend via env OTAKU_OCR_BACKEND (default mangaocr)."""
    return build_app(backend=os.environ.get("OTAKU_OCR_BACKEND", "mangaocr"))


# --------------------------------------------------------------------------
# CLI: manual testing, single page or whole chapters
# --------------------------------------------------------------------------

def _cli_single_page(ocr: "MangaOCR", args) -> PageResult:
    if args.auto_bubbles:
        return ocr.read_page_auto_bubbles(args.image, translate_to=args.translate_to)
    return ocr.read_page(args.image, translate_to=args.translate_to)


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Otaku manga OCR & translation CLI.")
    sub = parser.add_subparsers(dest="command", required=True)

    # `page` — OCR a single image
    page_p = sub.add_parser("page", help="OCR a single manga page")
    page_p.add_argument("image", help="Path to manga page image")
    page_p.add_argument("--backend", default="mangaocr", choices=["mangaocr", "easyocr", "tesseract"])
    page_p.add_argument("--langs", nargs="+", default=["ja", "en"])
    page_p.add_argument("--translate-to", default=None, help="e.g. en, es, fr")
    page_p.add_argument("--auto-bubbles", action="store_true",
                         help="Detect speech bubbles first, OCR each separately")
    page_p.add_argument("--glossary", default=None, help="Path to glossary JSON")
    page_p.add_argument("--cache", default=None, help="Path to translation cache JSON")
    page_p.add_argument("--render-overlay", default=None,
                         help="If set, also write a translated-overlay image to this path")
    page_p.add_argument("--out", default=None, help="Write JSON result to this path")

    # `chapter` — OCR a whole directory of pages
    chap_p = sub.add_parser("chapter", help="OCR every page image in a directory")
    chap_p.add_argument("chapter_dir", help="Directory of page images")
    chap_p.add_argument("--backend", default="mangaocr", choices=["mangaocr", "easyocr", "tesseract"])
    chap_p.add_argument("--langs", nargs="+", default=["ja", "en"])
    chap_p.add_argument("--translate-to", default=None)
    chap_p.add_argument("--glossary", default=None)
    chap_p.add_argument("--cache", default=None)
    chap_p.add_argument("--out", default=None, help="Write chapter JSON result to this path")

    # `serve` — run the REST API
    serve_p = sub.add_parser("serve", help="Run the FastAPI service (needs fastapi+uvicorn)")
    serve_p.add_argument("--backend", default="mangaocr", choices=["mangaocr", "easyocr", "tesseract"])
    serve_p.add_argument("--langs", nargs="+", default=["ja", "en"])
    serve_p.add_argument("--glossary", default=None)
    serve_p.add_argument("--cache", default=None)
    serve_p.add_argument("--host", default="0.0.0.0")
    serve_p.add_argument("--port", type=int, default=8000)

    args = parser.parse_args()

    if args.command == "page":
        glossary = TranslationGlossary(args.glossary) if args.glossary else None
        cache = TranslationCache(args.cache) if args.cache else None
        ocr = MangaOCR(backend=args.backend, languages=args.langs, glossary=glossary, cache=cache)

        result = _cli_single_page(ocr, args)
        output_json = result.to_json()
        print(output_json)

        if args.out:
            with open(args.out, "w", encoding="utf-8") as f:
                f.write(output_json)

        if args.render_overlay:
            OverlayRenderer().render_to_file(args.image, result, args.render_overlay)
            logger.info("Wrote translated overlay to %s", args.render_overlay)

        if cache is not None:
            cache.flush()

    elif args.command == "chapter":
        glossary = TranslationGlossary(args.glossary) if args.glossary else None
        cache = TranslationCache(args.cache) if args.cache else None
        ocr = MangaOCR(backend=args.backend, languages=args.langs, glossary=glossary, cache=cache)

        def progress(i, total, path):
            print(f"[{i}/{total}] {os.path.basename(path)}")

        chapter_result = process_chapter(ocr, args.chapter_dir,
                                          translate_to=args.translate_to,
                                          on_progress=progress)
        output_json = chapter_result.to_json()
        if args.out:
            with open(args.out, "w", encoding="utf-8") as f:
                f.write(output_json)
        else:
            print(output_json)

        if cache is not None:
            cache.flush()

    elif args.command == "serve":
        import uvicorn
        service_app = build_app(backend=args.backend, languages=args.langs,
                                 glossary_path=args.glossary, cache_path=args.cache)
        uvicorn.run(service_app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
