const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// @route POST /api/users/register
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, preferredLanguage } = req.body;

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) {
    res.status(400);
    throw new Error("User with that email or username already exists");
  }

  const user = await User.create({ username, email, password, preferredLanguage });

  res.status(201).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    token: signToken(user._id),
  });
});

// @route POST /api/users/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: signToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @route GET /api/users/me
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// @route PUT /api/users/me/zones
const updateZones = asyncHandler(async (req, res) => {
  const { zoneIds } = req.body; // array of Zone _ids
  const user = await User.findById(req.user._id);
  user.zones = zoneIds;
  await user.save();
  res.json(user.zones);
});

module.exports = { registerUser, loginUser, getMe, updateZones };
