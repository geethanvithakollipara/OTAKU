const express = require("express");
const router = express.Router();
const { upsertProgress, getLibrary } = require("../controllers/progressController");
const { protect } = require("../middleware/auth");

router.put("/", protect, upsertProgress);
router.get("/library", protect, getLibrary);

module.exports = router;
