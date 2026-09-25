import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon, { Logo } from "../components/Icon";
import SocialButtons from "../components/SocialButtons";

const LANGUAGES = [
  { code: "en", label: "English" }, { code: "es", label: "Spanish" }, { code: "fr", label: "French" },
  { code: "pt", label: "Portuguese" }, { code: "id", label: "Indonesian" }, { code: "de", label: "German" },
];

const strength = (p) =>
  [p.length >= 8, /[a-z]/.test(p) && /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p), p.length >= 12].filter(Boolean).length;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", preferredLanguage: "en" });
  const [show, setShow] = useState(false);
  const [ocr, setOcr] = useState(true); // UI preference only; not sent to the API
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      try { localStorage.setItem("otaku_ocr_preview", ocr ? "1" : "0"); } catch {}
      navigate("/zones");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const score = strength(form.password);

  return (
    <div className="center-form screen-center">
      <div style={{ textAlign: "left" }}>
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back"><Icon name="back" size={18} /></button>
      </div>
      <Logo size={56} />
      <h1 style={{ marginTop: 14 }}>Join the Fandom</h1>
      <p className="muted" style={{ margin: "0 auto 22px" }}>Create your account and get ready to read and unlock real-time manga translations.</p>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
        <div className="field">
          <label htmlFor="username">Username</label>
          <div className="input-wrap"><Icon name="user" size={18} /><input id="username" required value={form.username} onChange={set("username")} /></div>
        </div>
        <div className="field">
          <label htmlFor="email">Email Address</label>
          <div className="input-wrap"><Icon name="mail" size={18} /><input id="email" type="email" required value={form.email} onChange={set("email")} /></div>
        </div>
        <div className="field">
          <label htmlFor="password">Master Passphrase</label>
          <div className="input-wrap">
            <Icon name="lock" size={18} />
            <input id="password" type={show ? "text" : "password"} minLength={8} required value={form.password} onChange={set("password")} />
            <button type="button" className="btn btn-ghost" onClick={() => setShow(!show)} aria-label="Toggle password"><Icon name="eye" size={18} /></button>
          </div>
          <div className="strength">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < score ? "on" : ""} />)}</div>
        </div>
        <div className="field">
          <label htmlFor="lang">Reading language</label>
          <div className="input-wrap">
            <select id="lang" value={form.preferredLanguage} onChange={set("preferredLanguage")}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <div className="toggle-card">
          <div>
            <b style={{ fontSize: ".9rem" }}>Enable Neural OCR Preview</b>
            <div className="muted" style={{ fontSize: ".75rem" }}>Instantly translates sign and effect texts (SFX) and vertical text bubbles.</div>
          </div>
          <button type="button" className={"switch" + (ocr ? " on" : "")} onClick={() => setOcr(!ocr)} aria-pressed={ocr} aria-label="Neural OCR preview" />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? "Creating…" : "⚡ Create Account & Start Reading"}</button>
      </form>
      <SocialButtons providers={["Discord", "Google"]} label="Or speed connect" />
      <p className="muted" style={{ marginTop: 18 }}>Already a member? <Link to="/login">Sign In →</Link></p>
    </div>
  );
}
