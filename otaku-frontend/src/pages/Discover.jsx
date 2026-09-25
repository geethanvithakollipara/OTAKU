import { useEffect, useState } from "react";
import { animeApi } from "../api/client";

export default function Discover() {

    const [anime, setAnime] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadAnime();
    }, []);

    async function loadAnime() {
        try {
            setLoading(true);

            const response = await animeApi.getAnime({
                limit: 12
            });

            setAnime(response.data.data);

        } catch (error) {
            console.error("Failed to load anime:", error);
        } finally {
            setLoading(false);
        }
    }

    async function searchAnime(e) {
        e.preventDefault();

        try {
            setLoading(true);

            const response = await animeApi.getAnime({
                q: search,
                limit: 12
            });

            setAnime(response.data.data);

        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="discover-page">

            <h1>Discover Anime</h1>

            <form onSubmit={searchAnime}>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search anime..."
                />

                <button type="submit">
                    Search
                </button>
            </form>

            {loading && <p>Loading anime...</p>}

            <div className="anime-grid">

                {anime.map((item) => (
                    <div className="anime-card" key={item.mal_id}>

                        <img
                            src={item.images?.jpg?.large_image_url ||
                                  item.images?.jpg?.image_url}
                            alt={item.title}
                        />

                        <h3>{item.title}</h3>

                        <p>
                            ⭐ {item.score || "N/A"}
                        </p>

                        <p>
                            {item.type || "Unknown"}
                        </p>

                    </div>
                ))}

            </div>

        </div>
    );
}