const mongoose = require("mongoose");

// Tracks per-user progress so recommendations can "learn from saves, likes,
// and reading history" (Solution slide) and power the library/bookmarks view.
const readingProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    manga: { type: mongoose.Schema.Types.ObjectId, ref: "Manga", required: true },
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: true },
    lastPageRead: { type: Number, default: 1 },
    completed: { type: Boolean, default: false },
    liked: { type: Boolean, default: false },
    bookmarked: { type: Boolean, default: false },
    preferredReadingLanguage: { type: String }, // per-title language override
  },
  { timestamps: true }
);

readingProgressSchema.index({ user: 1, manga: 1 }, { unique: true });

module.exports = mongoose.model("ReadingProgress", readingProgressSchema);
