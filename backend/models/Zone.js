const mongoose = require("mongoose");

// "Pre-set zones by genre, tags, and language preference" (Personalization / Discovery slides)
const zoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // e.g. "Shonen Action", "Isekai", "Romance"
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Zone", zoneSchema);
