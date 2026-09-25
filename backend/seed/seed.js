// Populates a fresh database with a few zones and one sample title so you
// can verify the connection and API end-to-end.
require("dotenv").config();
const connectDB = require("../config/db");
const Zone = require("../models/Zone");
const Manga = require("../models/Manga");
const Chapter = require("../models/Chapter");

const run = async () => {
  await connectDB();

  await Zone.deleteMany();
  await Manga.deleteMany();
  await Chapter.deleteMany();

  const zones = await Zone.insertMany([
    { name: "Shonen Action", slug: "shonen-action", tags: ["action", "shonen"] },
    { name: "Isekai", slug: "isekai", tags: ["fantasy", "isekai"] },
    { name: "Romance", slug: "romance", tags: ["romance", "slice-of-life"] },
  ]);

  const manga = await Manga.create({
    title: "Ember Wraith",
    altTitles: [{ language: "ja", title: "エンバーレイス" }],
    author: "K. Sato",
    genres: ["Action", "Fantasy"],
    tags: ["fire", "revenge"],
    zones: [zones[0]._id],
    originalLanguage: "ja",
    officialEnglishRelease: false,
  });

  await Chapter.create({
    manga: manga._id,
    chapterNumber: 1,
    title: "Ignition",
    language: "ja",
    pages: [
      {
        pageNumber: 1,
        imageUrl: "https://example.com/ember-wraith/ch1/p1.jpg",
        textRegions: [
          { x: 10, y: 20, width: 120, height: 40, originalText: "燃えろ、俺の心" },
        ],
      },
    ],
  });

  console.log("Seed complete.");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
