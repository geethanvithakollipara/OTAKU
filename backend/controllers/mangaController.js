const asyncHandler = require("express-async-handler");
const Manga = require("../models/Manga");
const Chapter = require("../models/Chapter");

// @route GET /api/manga  (supports ?search=&genre=&zone=&page=&limit=)
const getMangaList = asyncHandler(async (req, res) => {
  const { search, genre, zone, page = 1, limit = 20 } = req.query;
  const query = {};

  if (search) query.$text = { $search: search };
  if (genre) query.genres = genre;
  if (zone) query.zones = zone;

  const results = await Manga.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ updatedAt: -1 });

  const total = await Manga.countDocuments(query);

  res.json({ results, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// @route GET /api/manga/:id
const getMangaById = asyncHandler(async (req, res) => {
  const manga = await Manga.findById(req.params.id).populate("zones", "name slug");
  if (!manga) {
    res.status(404);
    throw new Error("Manga not found");
  }
  res.json(manga);
});

// @route POST /api/manga
const createManga = asyncHandler(async (req, res) => {
  const manga = await Manga.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(manga);
});

// @route PUT /api/manga/:id
const updateManga = asyncHandler(async (req, res) => {
  const manga = await Manga.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!manga) {
    res.status(404);
    throw new Error("Manga not found");
  }
  res.json(manga);
});

// @route DELETE /api/manga/:id
const deleteManga = asyncHandler(async (req, res) => {
  const manga = await Manga.findByIdAndDelete(req.params.id);
  if (!manga) {
    res.status(404);
    throw new Error("Manga not found");
  }
  await Chapter.deleteMany({ manga: manga._id });
  res.json({ message: "Manga and its chapters removed" });
});

// @route GET /api/manga/:id/chapters
const getChaptersForManga = asyncHandler(async (req, res) => {
  const chapters = await Chapter.find({ manga: req.params.id })
    .select("chapterNumber title language releaseDate")
    .sort({ chapterNumber: 1 });
  res.json(chapters);
});

module.exports = {
  getMangaList,
  getMangaById,
  createManga,
  updateManga,
  deleteManga,
  getChaptersForManga,
};
