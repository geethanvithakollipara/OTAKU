const asyncHandler = require("express-async-handler");
const Zone = require("../models/Zone");
const Manga = require("../models/Manga");

// @route GET /api/zones
const getZones = asyncHandler(async (req, res) => {
  const zones = await Zone.find().sort({ name: 1 });
  res.json(zones);
});

// @route POST /api/zones
const createZone = asyncHandler(async (req, res) => {
  const zone = await Zone.create(req.body);
  res.status(201).json(zone);
});

// @route GET /api/zones/:id/recommendations
// "Surface new titles aligned to each zone's interests" (Discovery slide)
const getZoneRecommendations = asyncHandler(async (req, res) => {
  const manga = await Manga.find({ zones: req.params.id })
    .sort({ rating: -1, updatedAt: -1 })
    .limit(20);
  res.json(manga);
});

module.exports = { getZones, createZone, getZoneRecommendations };
