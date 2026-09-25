import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import MangaCard from "../components/MangaCard";

export default function Zones() {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [recs, setRecs] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/zones").then((data) => {
      setZones(data);
      data.forEach((z) => {
        api
          .get(`/zones/${z._id}/recommendations`)
          .then((manga) => setRecs((prev) => ({ ...prev, [z._id]: manga })))
          .catch(() => {});
      });
    });
  }, []);

  useEffect(() => {
    if (user?.zones) setSelected(new Set(user.zones.map((z) => z._id || z)));
  }, [user]);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const save = async () => {
    await api.put("/users/me/zones", { zoneIds: [...selected] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="container">
      <div className="section-heading">
        <h1>Zones</h1>
        {user && (
          <button className="btn btn-primary" onClick={save}>
            {saved ? "Saved ✓" : "Save my zones"}
          </button>
        )}
      </div>
      <p className="muted">
        Pick the genres and tags you care about — Otaku keeps recommendations tuned to these
        as your taste evolves.
      </p>

      <div className="pill-row">
        {zones.map((z) => (
          <span
            key={z._id}
            className={`pill clickable ${selected.has(z._id) ? "active" : ""}`}
            onClick={() => user && toggle(z._id)}
            title={user ? "Click to toggle" : "Log in to save zones"}
          >
            {z.name}
          </span>
        ))}
      </div>
      {!user && (
        <p className="muted">
          <Link to="/login">Log in</Link> to save your own zone selection.
        </p>
      )}

      {zones.map((z) => (
        <div key={z._id}>
          <div className="section-heading">
            <h2 style={{ fontSize: "1.1rem" }}>{z.name}</h2>
          </div>
          {recs[z._id]?.length ? (
            <div className="manga-grid">
              {recs[z._id].map((m) => (
                <MangaCard key={m._id} manga={m} />
              ))}
            </div>
          ) : (
            <p className="muted">Nothing in this zone yet.</p>
          )}
        </div>
      ))}
    </div>
  );
}
