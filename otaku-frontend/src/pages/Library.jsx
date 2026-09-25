import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Library() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/progress/library")
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="container">
      <h1>My library</h1>
      <p className="muted">Everything you're reading, bookmarked, or have liked.</p>

      {error && <div className="error-banner">{error}</div>}

      {items.length === 0 ? (
        <div className="empty-state">
          Nothing saved yet — bookmark a title from its page to see it here.
        </div>
      ) : (
        <div className="panel">
          {items.map((item) => (
            <div
              key={item._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid var(--line)",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Link to={`/manga/${item.manga?._id}`} style={{ fontWeight: 700 }}>
                  {item.manga?.title}
                </Link>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {item.chapter ? `Ch. ${item.chapter.chapterNumber}` : "Not started"} · page{" "}
                  {item.lastPageRead}
                  {item.completed ? " · completed" : ""}
                  {item.liked ? " · liked" : ""}
                </div>
              </div>
              {item.chapter && (
                <Link to={`/read/${item.chapter._id}`} className="btn">
                  Continue reading
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
