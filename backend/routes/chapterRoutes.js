const express = require("express");
const router = express.Router();
const { getChapterById } = require("../controllers/chapterController");
const { translatePage } = require("../controllers/translationController");

router.get("/:id", getChapterById);
router.get("/:chapterId/translate", translatePage);

module.exports = router;
