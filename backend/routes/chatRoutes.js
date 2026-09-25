const express = require("express");
const router = express.Router();
const {
  createConversation,
  getMyConversations,
  sendMessage,
  getMessages,
} = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

router.route("/conversations").get(protect, getMyConversations).post(protect, createConversation);
router
  .route("/conversations/:id/messages")
  .get(protect, getMessages)
  .post(protect, sendMessage);

module.exports = router;
