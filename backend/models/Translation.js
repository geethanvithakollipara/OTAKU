const mongoose = require("mongoose");

// Caches machine-translated text per page/region/language so re-reads and
// other users don't pay the translation-API cost twice ("Scalable reading
// pipeline" + "Glossary and user corrections to improve consistency").
const translationSchema = new mongoose.Schema(
  {
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: true },
    pageNumber: { type: Number, required: true },
    textRegionIndex: { type: Number, required: true }, // index into Chapter.pages[n].textRegions
    sourceLanguage: { type: String, required: true },
    targetLanguage: { type: String, required: true },
    translatedText: { type: String, required: true },
    // Community/glossary corrections layered on top of the raw MT output
    correctedText: { type: String },
    correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    provider: { type: String, default: "machine" }, // "machine" | "glossary" | "human"
  },
  { timestamps: true }
);

translationSchema.index(
  { chapter: 1, pageNumber: 1, textRegionIndex: 1, targetLanguage: 1 },
  { unique: true }
);

module.exports = mongoose.model("Translation", translationSchema);
