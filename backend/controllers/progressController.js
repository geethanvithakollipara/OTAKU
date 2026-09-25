const asyncHandler = require("express-async-handler");
const ReadingProgress = require("../models/ReadingProgress");

// @route PUT /api/progress
// Upserts progress for the logged-in user on a given manga/chapter.
const upsertProgress = asyncHandler(async (req, res) => {
  const { manga, chapter, lastPageRead, completed, liked, bookmarked } = req.body;

  const progress = await ReadingProgress.findOneAndUpdate(
    { user: req.user._id, manga },
    {
      $set: {
        chapter,
        ...(lastPageRead !== undefined && { lastPageRead }),
        ...(completed !== undefined && { completed }),
        ...(liked !== undefined && { liked }),
        ...(bookmarked !== undefined && { bookmarked }),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json(progress);
});

// @route GET /api/progress/library
// Powers the "My Library" view — everything the user has bookmarked or is reading.
const getLibrary = asyncHandler(async (req, res) => {
  const items = await ReadingProgress.find({ user: req.user._id })
    .populate("manga", "title coverImageUrl genres")
    .populate("chapter", "chapterNumber title")
    .sort({ updatedAt: -1 });
  res.json(items);
});

module.exports = { upsertProgress, getLibrary };
