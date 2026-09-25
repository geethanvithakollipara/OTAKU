const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true },
    // Lets users "share recommendations directly from a title or chapter"
    sharedManga: { type: mongoose.Schema.Types.ObjectId, ref: "Manga" },
    sharedChapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
