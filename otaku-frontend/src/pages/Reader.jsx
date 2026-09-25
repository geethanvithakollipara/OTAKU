import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "pt", label: "Portuguese" },
  { code: "id", label: "Indonesian" },
  { code: "de", label: "German" },
];

export default function Reader() {
  const { id } = useParams();
  const { user } = useAuth();
  const [chapter, setChapter] = useState(null);
  const [error, setError] = useState("");
  const [translationsOn, setTranslationsOn] = useState(true);
  const [targetLang, setTargetLang] = useState(user?.preferredLanguage || "en");
  const [pageTranslations, setPageTranslations] = useState({}); // pageNumber -> regions[]
  const [loadingPage, setLoadingPage] = useState(null);

  useEffect(() => {
    api
      .get(`/chapters/${id}`)
      .then(setChapter)
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (user?.preferredLanguage) setTargetLang(user.preferredLanguage);
  }, [user]);

  const loadTranslation = async (pageNumber) => {
    setLoadingPage(pageNumber);
    try {
      const data = await api.get(
        `/chapters/${id}/translate?page=${pageNumber}&lang=${targetLang}`
      );
      setPageTranslations((prev) => ({ ...prev, [pageNumber]: data.regions }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPage(null);
    }
  };

  // Re-fetch translations for every page already on screen when the
  // language changes, so toggling doesn't require a full page reload.
  useEffect(() => {
    if (!chapter || !translationsOn) return;
    setPageTranslations({});
    chapter.pages.forEach((p) => loadTranslation(p.pageNumber));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, targetLang, translationsOn]);

  if (error) return <div className="container error-banner">{error}</div>;
  if (!chapter) return <div className="container muted">Loading…</div>;

  return (
    <div>
      <div className="reader-toolbar">
        <Link to={`/manga/${chapter.manga?._id}`} className="btn btn-ghost">
          ← {chapter.manga?.title}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              checked={translationsOn}
              onChange={(e) => setTranslationsOn(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Translate as you read
          </label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            disabled={!translationsOn}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="container">
        <h1 style={{ marginTop: 20 }}>
          Ch. {chapter.chapterNumber} {chapter.title ? `— ${chapter.title}` : ""}
        </h1>

        {chapter.pages.map((page) => (
          <div key={page.pageNumber} className="reader-page">
            <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} />
            {translationsOn &&
              (pageTranslations[page.pageNumber] || []).map((region) => (
                <div
                  key={region.textRegionIndex}
                  className="translation-box"
                  style={{
                    left: `${region.box.x}px`,
                    top: `${region.box.y}px`,
                    width: `${region.box.width}px`,
                  }}
                >
                  {region.text}
                </div>
              ))}
            {translationsOn && loadingPage === page.pageNumber && (
              <div className="translation-box" style={{ left: 10, top: 10 }}>
                Translating…
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
