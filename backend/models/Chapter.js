const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    manga: { type: mongoose.Schema.Types.ObjectId, ref: "Manga", required: true },
    chapterNumber: { type: Number, required: true },
    title: { type: String, trim: true },
    language: { type: String, default: "ja" }, // language of the source pages
    pages: [
      {
        pageNumber: { type: Number, required: true },
        imageUrl: { type: String, required: true },
        // Detected text regions for the "translate as you read" overlay
        textRegions: [
          {
            x: Number,
            y: Number,
            width: Number,
            height: Number,
            originalText: String,
          },
        ],
      },
    ],
    releaseDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

chapterSchema.index({ manga: 1, chapterNumber: 1 }, { unique: true });

module.exports = mongoose.model("Chapter", chapterSchema);
