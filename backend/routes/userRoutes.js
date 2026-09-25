const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getMe, updateZones } = require("../controllers/userController");
const { protect } = require("../middleware/auth");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.put("/me/zones", protect, updateZones);

module.exports = router;
