const express = require("express");
const router = express.Router();
const { correctTranslation } = require("../controllers/translationController");
const { protect } = require("../middleware/auth");

router.put("/:id/correct", protect, correctTranslation);

module.exports = router;
