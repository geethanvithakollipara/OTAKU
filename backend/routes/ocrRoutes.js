const express = require("express");
const router = express.Router();
const { ocrPage, ocrHealth } = require("../controllers/ocrController");
const { protect } = require("../middleware/auth");

router.get("/health", ocrHealth);
router.post("/", protect, ocrPage);

module.exports = router;
