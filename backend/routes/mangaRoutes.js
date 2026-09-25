const express = require("express");
const router = express.Router();
const {
  getMangaList,
  getMangaById,
  createManga,
  updateManga,
  deleteManga,
  getChaptersForManga,
} = require("../controllers/mangaController");
const { addChapter } = require("../controllers/chapterController");
const { protect } = require("../middleware/auth");

router.route("/").get(getMangaList).post(protect, createManga);
router.route("/:id").get(getMangaById).put(protect, updateManga).delete(protect, deleteManga);
router.route("/:id/chapters").get(getChaptersForManga);
router.route("/:mangaId/chapters").post(protect, addChapter);

module.exports = router;
