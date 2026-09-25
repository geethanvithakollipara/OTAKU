const asyncHandler = require("express-async-handler");

const OCR_URL = process.env.OCR_SERVICE_URL || "http://127.0.0.1:8000";

// @route POST /api/ocr   body: { imageBase64, translateTo? }   (auth required)
// Forwards the page to the Python OCR service (backend/ocr/otaku_ocr.py serve)
// and returns { width, height, blocks: [{ text, bbox, translated_text, ... }] }.
// Only base64 uploads are accepted (no remote URLs) to avoid SSRF.
const ocrPage = asyncHandler(async (req, res) => {
  const { imageBase64, translateTo } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400);
    throw new Error("imageBase64 is required");
  }

  const buf = Buffer.from(imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
  const form = new FormData();
  form.append("file", new Blob([buf]), "page.jpg");
  if (translateTo) form.append("translate_to", String(translateTo));
  form.append("auto_bubbles", "false");

  let r;
  try {
    r = await fetch(`${OCR_URL}/ocr`, { method: "POST", body: form, signal: AbortSignal.timeout(180000) });
  } catch {
    res.status(503);
    throw new Error("OCR service is not running. Start it: python otaku_ocr.py serve");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    res.status(502);
    throw new Error(data.detail || "OCR service error");
  }
  res.json(data);
});

const ocrHealth = asyncHandler(async (req, res) => {
  try {
    const r = await fetch(`${OCR_URL}/health`, { signal: AbortSignal.timeout(3000) });
    res.json({ ocr: "up", ...(await r.json()) });
  } catch {
    res.status(503).json({ ocr: "down" });
  }
});

module.exports = { ocrPage, ocrHealth };
