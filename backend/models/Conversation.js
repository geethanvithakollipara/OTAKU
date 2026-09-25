const mongoose = require("mongoose");

// "Built-in community chat" — supports both 1:1 DMs and group chats for
// fandoms/genres/reading clubs.
const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["direct", "group"], required: true },
    name: { type: String, trim: true }, // used for group chats (e.g. "One Piece Discussion")
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    // Optional: tie a group chat to a title/zone, per "Share and discuss" slide
    manga: { type: mongoose.Schema.Types.ObjectId, ref: "Manga" },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
