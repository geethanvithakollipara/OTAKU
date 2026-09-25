require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const userRoutes = require("./routes/userRoutes");
const mangaRoutes = require("./routes/mangaRoutes");
const chapterRoutes = require("./routes/chapterRoutes");
const translationRoutes = require("./routes/translationRoutes");
const zoneRoutes = require("./routes/zoneRoutes");
const progressRoutes = require("./routes/progressRoutes");
const chatRoutes = require("./routes/chatRoutes");

// Connect to MongoDB (see config/db.js) before the app starts handling requests
connectDB();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" })); // manga pages can carry many text regions
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Basic protection against brute-force / scraping
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/users", userRoutes);
app.use("/api/manga", mangaRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/translations", translationRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/chat", chatRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Otaku API running on port ${PORT}`));

module.exports = app;

const animeRoutes = require("./routes/anime");

app.use("/api/anime", animeRoutes);