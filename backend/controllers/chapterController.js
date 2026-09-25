const asyncHandler = require("express-async-handler");
const Chapter = require("../models/Chapter");
const Manga = require("../models/Manga");

// @route POST /api/manga/:mangaId/chapters
const addChapter = asyncHandler(async (req, res) => {
  const manga = await Manga.findById(req.params.mangaId);
  if (!manga) {
    res.status(404);
    throw new Error("Manga not found");
  }

  const chapter = await Chapter.create({ ...req.body, manga: manga._id });
  manga.chapterCount += 1;
  await manga.save();

  res.status(201).json(chapter);
});

// @route GET /api/chapters/:id
// Returns the chapter in its original language, ready for the
// "translate as you read" overlay on the frontend.
const getChapterById = asyncHandler(async (req, res) => {
  const chapter = await Chapter.findById(req.params.id).populate("manga", "title genres");
  if (!chapter) {
    res.status(404);
    throw new Error("Chapter not found");
  }
  res.json(chapter);
});

module.exports = { addChapter, getChapterById };
