import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function MangaDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState("");
  const [bookmarking, setBookmarking] = useState(false);

  useEffect(() => {
    api
      .get(`/manga/${id}`)
      .then(setManga)
      .catch((err) => setError(err.message));
    api
      .get(`/manga/${id}/chapters`)
      .then(setChapters)
      .catch(() => {});
  }, [id]);

  const bookmark = async () => {
    setBookmarking(true);
    try {
      await api.put("/progress", { manga: id, bookmarked: true });
    } finally {
      setBookmarking(false);
    }
  };

  if (error) return <div className="container error-banner">{error}</div>;
  if (!manga) return <div className="container muted">Loading…</div>;

  return (
    <div className="container">
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 16 }}>
        <img
          src={manga.coverImageUrl || "https://placehold.co/280x380/16130f/f3eee3?text=Otaku"}
          alt={manga.title}
          style={{ width: 220, border: "1px solid var(--line)" }}
        />
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>{manga.title}</h1>
          <p className="muted">by {manga.author || "Unknown"}</p>
          <div className="pill-row">
            {(manga.genres || []).map((g) => (
              <span key={g} className="pill">
                {g}
              </span>
            ))}
          </div>
          <p>{manga.synopsis || "No synopsis yet."}</p>
          {!manga.officialEnglishRelease && (
            <p className="muted">No official English release — read with autotranslation on.</p>
          )}
          {user && (
            <button className="btn" onClick={bookmark} disabled={bookmarking}>
              {bookmarking ? "Saving…" : "Save to library"}
            </button>
          )}
        </div>
      </div>

      <div className="section-heading">
        <h2>Chapters</h2>
      </div>
      {chapters.length === 0 ? (
        <div className="empty-state">No chapters yet.</div>
      ) : (
        <div className="panel">
          {chapters.map((c) => (
            <div
              key={c._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <Link to={`/read/${c._id}`} style={{ fontWeight: 600 }}>
                Ch. {c.chapterNumber} {c.title ? `— ${c.title}` : ""}
              </Link>
              <span className="muted">
                {new Date(c.releaseDate).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
