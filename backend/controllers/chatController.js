const asyncHandler = require("express-async-handler");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// @route POST /api/chat/conversations
// body: { type: "direct" | "group", participantIds: [...], name?, manga?, zone? }
const createConversation = asyncHandler(async (req, res) => {
  const { type, participantIds = [], name, manga, zone } = req.body;
  const participants = [...new Set([...participantIds, String(req.user._id)])];

  if (type === "direct" && participants.length !== 2) {
    res.status(400);
    throw new Error("Direct conversations need exactly 2 participants");
  }

  const conversation = await Conversation.create({ type, name, participants, manga, zone });
  res.status(201).json(conversation);
});

// @route GET /api/chat/conversations
const getMyConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .populate("participants", "username avatarUrl")
    .populate("manga", "title coverImageUrl")
    .sort({ lastMessageAt: -1 });
  res.json(conversations);
});

// @route POST /api/chat/conversations/:id/messages
const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation || !conversation.participants.some((p) => String(p) === String(req.user._id))) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const { text, sharedManga, sharedChapter } = req.body;
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    text,
    sharedManga,
    sharedChapter,
    readBy: [req.user._id],
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();

  res.status(201).json(message);
});

// @route GET /api/chat/conversations/:id/messages?page=&limit=
const getMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const messages = await Message.find({ conversation: req.params.id })
    .populate("sender", "username avatarUrl")
    .populate("sharedManga", "title coverImageUrl")
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  res.json(messages.reverse());
});

module.exports = { createConversation, getMyConversations, sendMessage, getMessages };
