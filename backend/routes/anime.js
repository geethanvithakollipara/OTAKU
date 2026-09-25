const express = require("express");

const router = express.Router();

const JIKAN_URL = "https://api.jikan.moe/v4";

// Get anime list/search
router.get("/", async (req, res) => {
    try {
        const { q, page = 1, limit = 12 } = req.query;

        const params = new URLSearchParams({
            page,
            limit,
        });

        if (q) {
            params.append("q", q);
        }

        const response = await fetch(
            `${JIKAN_URL}/anime?${params.toString()}`
        );

        if (!response.ok) {
            return res.status(response.status).json({
                message: "Jikan API request failed",
            });
        }

        const data = await response.json();

        res.json(data);

    } catch (error) {
        console.error("Anime API error:", error);

        res.status(500).json({
            message: "Failed to fetch anime",
        });
    }
});


// Get anime details
router.get("/:id", async (req, res) => {
    try {
        const response = await fetch(
            `${JIKAN_URL}/anime/${req.params.id}/full`
        );

        if (!response.ok) {
            return res.status(response.status).json({
                message: "Anime not found",
            });
        }

        const data = await response.json();

        res.json(data);

    } catch (error) {
        console.error("Anime details error:", error);

        res.status(500).json({
            message: "Failed to fetch anime details",
        });
    }
});

module.exports = router;