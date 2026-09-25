const asyncHandler = require("express-async-handler");
const Translation = require("../models/Translation");
const Chapter = require("../models/Chapter");

/**
 * Calls the configured machine-translation provider.
 * Swap this out for your provider of choice (Google Cloud Translation,
 * DeepL, Azure Translator, etc.) — the rest of the app only depends on
 * this function returning a translated string.
 */
async function translateText(text, sourceLanguage, targetLanguage) {
  const res = await fetch(
    `${process.env.TRANSLATION_API_URL}?key=${process.env.TRANSLATION_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: "text",
      }),
    }
  );
  if (!res.ok) throw new Error(`Translation provider error: ${res.status}`);
  const data = await res.json();
  return data?.data?.translations?.[0]?.translatedText || text;
}

// @route GET /api/chapters/:chapterId/translate?page=&lang=
// Auto-detects source language from the chapter, translates every text
// region on the page, and caches the result (Translation model) so the
// next reader — or a re-read — hits the cache instead of the API.
const translatePage = asyncHandler(async (req, res) => {
  const { chapterId } = req.params;
  const { page, lang } = req.query;

  if (!page || !lang) {
    res.status(400);
    throw new Error("page and lang query params are required");
  }

  const chapter = await Chapter.findById(chapterId);
  if (!chapter) {
    res.status(404);
    throw new Error("Chapter not found");
  }

  const pageData = chapter.pages.find((p) => p.pageNumber === Number(page));
  if (!pageData) {
    res.status(404);
    throw new Error("Page not found");
  }

  const results = [];
  for (let i = 0; i < pageData.textRegions.length; i++) {
    const region = pageData.textRegions[i];

    let cached = await Translation.findOne({
      chapter: chapterId,
      pageNumber: Number(page),
      textRegionIndex: i,
      targetLanguage: lang,
    });

    if (!cached) {
      const translatedText = await translateText(region.originalText, chapter.language, lang);
      cached = await Translation.create({
        chapter: chapterId,
        pageNumber: Number(page),
        textRegionIndex: i,
        sourceLanguage: chapter.language,
        targetLanguage: lang,
        translatedText,
      });
    }

    results.push({
      textRegionIndex: i,
      box: { x: region.x, y: region.y, width: region.width, height: region.height },
      text: cached.correctedText || cached.translatedText,
    });
  }

  res.json({ chapterId, page: Number(page), targetLanguage: lang, regions: results });
});

// @route PUT /api/translations/:id/correct
// Community glossary corrections ("Glossary and user corrections to
// improve consistency over time" — Technology slide).
const correctTranslation = asyncHandler(async (req, res) => {
  const { correctedText } = req.body;
  const translation = await Translation.findByIdAndUpdate(
    req.params.id,
    { correctedText, correctedBy: req.user._id, provider: "glossary" },
    { new: true }
  );
  if (!translation) {
    res.status(404);
    throw new Error("Translation not found");
  }
  res.json(translation);
});

module.exports = { translatePage, correctTranslation };
