import { Link } from "react-router-dom";

export default function MangaCard({ manga }) {
  return (
    <Link to={`/manga/${manga._id}`} className="manga-card">
      {manga.status && <span className="card-badge mono">{manga.status}</span>}
      <img
        className="manga-card-cover"
        src={manga.coverImageUrl || "https://placehold.co/300x400/1a1a3a/a78bfa?text=Otaku"}
        alt={manga.title}
        loading="lazy"
      />
      <div className="manga-card-body">
        <div className="manga-card-title">{manga.title}</div>
        <div className="manga-card-meta">{(manga.genres || []).slice(0, 2).join(" · ") || "Manga"}</div>
      </div>
    </Link>
  );
}
