const mongoose = require("mongoose");

const mangaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    // Titles in other languages, so search/discovery works across locales
    altTitles: [{ language: String, title: String }],

    author: { type: String, trim: true },
    coverImageUrl: { type: String },
    synopsis: { type: String },

    genres: [{ type: String }], // e.g. ["Action", "Fantasy"]
    tags: [{ type: String }],
    zones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Zone" }],

    originalLanguage: { type: String, default: "ja" }, // ISO 639-1
    status: { type: String, enum: ["ongoing", "completed", "hiatus"], default: "ongoing" },

    // "New/niche titles often have no official English release"
    officialEnglishRelease: { type: Boolean, default: false },

    chapterCount: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // uploader / scanlation team
  },
  { timestamps: true }
);

mangaSchema.index({ title: "text", synopsis: "text", tags: "text" });

module.exports = mongoose.model("Manga", mangaSchema);
