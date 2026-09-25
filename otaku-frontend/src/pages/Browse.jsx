import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import MangaCard from "../components/MangaCard";
import Icon from "../components/Icon";

/** mode="home" -> hero, resume, trending, zones. mode="discover" -> search + zone filter grid. */
export default function Browse({ mode = "home" }) {
  const { user } = useAuth();
  const [manga, setManga] = useState([]);
  const [zones, setZones] = useState([]);
  const [library, setLibrary] = useState([]);
  const [search, setSearch] = useState("");
  const [activeZone, setActiveZone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { api.get("/zones").then(setZones).catch(() => {}); }, []);
  useEffect(() => {
    if (mode === "home" && user) api.get("/progress/library").then(setLibrary).catch(() => {});
  }, [mode, user]);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeZone) params.set("zone", activeZone);
    api.get(`/manga?${params.toString()}`)
      .then((data) => setManga(data.results))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, activeZone]);

  const grid = loading ? (
    <p className="muted">Loading…</p>
  ) : manga.length === 0 ? (
    <div className="empty-state">No titles match yet. Try a different search or zone — or seed the backend (<code>npm run seed</code>) for sample data.</div>
  ) : (
    <div className="manga-grid">{manga.map((m) => <MangaCard key={m._id} manga={m} />)}</div>
  );

  if (mode === "discover") {
    return (
      <div className="container" style={{ paddingTop: 8 }}>
        <h1>Discover</h1>
        <div className="input-wrap" style={{ marginBottom: 10 }}>
          <Icon name="search" size={18} />
          <input placeholder="Search by title, tag, or synopsis…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {zones.length > 0 && (
          <div className="pill-row">
            <span className={`pill clickable ${activeZone === "" ? "active" : ""}`} onClick={() => setActiveZone("")}>All Feeds</span>
            {zones.map((z) => (
              <span key={z._id} className={`pill clickable ${activeZone === z._id ? "active" : ""}`} onClick={() => setActiveZone(z._id)}>{z.name}</span>
            ))}
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
        {grid}
      </div>
    );
  }

  const cover = manga[0]?.coverImageUrl;
  const resume = library.filter((i) => i.chapter).slice(0, 6);
  return (
    <>
      <section className="hero" style={cover ? { backgroundImage: `linear-gradient(180deg, rgba(10,10,26,.1), rgba(10,10,26,.95)), url(${cover})` } : undefined}>
        <span className="live mono">● Live · Translation Exclusive</span>
        <h1>Read Beyond Language.</h1>
        <p>Discover new manga &amp; light novels direct from Tokyo's Seoul, instant, spaced bubbles, and real-time translations.</p>
        <Link to={manga[0] ? `/manga/${manga[0]._id}` : "/discover"} className="btn btn-primary btn-block">
          <Icon name="play" size={16} /> Start Reading Now
        </Link>
      </section>

      <div className="container">
        {resume.length > 0 && (
          <>
            <div className="section-heading"><h2>Jump Right Back In</h2><span className="mono muted">{resume.length} in-flight</span></div>
            <div className="h-scroll">
              {resume.map((i) => (
                <div key={i._id} className="resume-card">
                  <b>{i.manga?.title}</b>
                  <span className="muted" style={{ fontSize: ".78rem" }}>Ch. {i.chapter.chapterNumber} · page {i.lastPageRead}</span>
                  <div className="progress"><i style={{ width: i.completed ? "100%" : `${Math.min(95, (i.lastPageRead || 0) * 4)}%` }} /></div>
                  <Link to={`/read/${i.chapter._id}`} className="btn btn-block" style={{ padding: 8 }}>Resume</Link>
                </div>
              ))}
            </div>
          </>
        )}

        {zones.length > 0 && (
          <div className="pill-row" style={{ marginTop: 18 }}>
            <span className={`pill clickable ${activeZone === "" ? "active" : ""}`} onClick={() => setActiveZone("")}>All Feeds</span>
            {zones.map((z) => (
              <span key={z._id} className={`pill clickable ${activeZone === z._id ? "active" : ""}`} onClick={() => setActiveZone(z._id)}>{z.name}</span>
            ))}
          </div>
        )}

        <div className="section-heading" style={{ marginTop: 8 }}>
          <div><h2 style={{ marginBottom: 0 }}>Trending Worldwide</h2><span className="muted" style={{ fontSize: ".78rem" }}>Real-time fanbase &amp; community reads</span></div>
          <Link to="/discover" className="mono">Top 100 →</Link>
        </div>
        {error && <div className="error-banner">{error}</div>}
        {grid}

        <div className="panel" style={{ marginTop: 24 }}>
          <h2>Community Translation Zones</h2>
          <p className="muted" style={{ fontSize: ".82rem", marginTop: 0 }}>Join synchronized reading rooms where human translators and AI models collaborate in real time.</p>
          {zones.slice(0, 3).map((z) => (
            <div key={z._id} className="zone-row"><b>{z.name}</b><Link to="/zones" className="mono">Enter →</Link></div>
          ))}
          <Link to="/zones" className="btn btn-block" style={{ marginTop: 10 }}>Enter Translation Zone</Link>
        </div>
      </div>
    </>
  );
}
