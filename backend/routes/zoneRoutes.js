const express = require("express");
const router = express.Router();
const { getZones, createZone, getZoneRecommendations } = require("../controllers/zoneController");
const { protect } = require("../middleware/auth");

router.route("/").get(getZones).post(protect, createZone);
router.get("/:id/recommendations", getZoneRecommendations);

module.exports = router;
