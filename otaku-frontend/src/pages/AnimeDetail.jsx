import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { animeApi } from "../api/client";

/** Full anime details from /api/anime/:id (Jikan "full" payload). */
export default function AnimeDetail() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setAnime(null);
    setError("");
    animeApi.getAnimeById(id)
      .then((res) => setAnime(res.data)) // { data: {...} }
      .catch((err) => setError(err.message || "Failed to load anime"));
  }, [id]);

  if (error) return <main className="page"><div className="empty-state">{error}</div><Link to="/anime">← Back</Link></main>;
  if (!anime) return <main className="page"><p className="muted">Loading…</p></main>;

  const names = (list) => (list || []).map((x) => x.name).join(", ") || "—";
  return (
    <main className="page anime-detail">
      <Link to="/anime">← Back</Link>
      <div className="anime-detail-head">
        <img src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url} alt={anime.title} />
        <div>
          <h1>{anime.title}</h1>
          {anime.title_japanese && <p className="muted">{anime.title_japanese}</p>}
          <p>⭐ {anime.score ?? "N/A"} · {anime.type || "Unknown"} · {anime.episodes ?? "?"} eps · {anime.status || ""}</p>
          <p><b>Genres:</b> {names(anime.genres)}</p>
          <p><b>Studios:</b> {names(anime.studios)}</p>
          <p><b>Aired:</b> {anime.aired?.string || "—"}</p>
        </div>
      </div>
      <h3>Synopsis</h3>
      <p>{anime.synopsis || "No synopsis available."}</p>
    </main>
  );
}
