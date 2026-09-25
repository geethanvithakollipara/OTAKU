const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    displayName: { type: String, trim: true },
    avatarUrl: { type: String },

    // "Personalized by your zone" — reading-language + preferred content zones
    preferredLanguage: { type: String, default: "en" }, // ISO 639-1
    zones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Zone" }],

    // Library / social graph
    library: [{ type: mongoose.Schema.Types.ObjectId, ref: "Manga" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    role: { type: String, enum: ["reader", "moderator", "admin"], default: "reader" },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
