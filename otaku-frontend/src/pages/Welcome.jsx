import { Link, useNavigate } from "react-router-dom";
import Icon, { Logo } from "../components/Icon";

const FEATURES = [
  ["bolt", "Instant Neural OCR", "Context-aware typesetting that preserves layout and speech bubbles (99%+ accuracy)."],
  ["compass", "Real-Time Translation", "Seamless conversion for JP ↔ KR ↔ EN, Spanish, French, and 20+ global languages without latency."],
  ["chat", "Global Fandom & Safe Chats", "Join millions of manga fans worldwide. Build your profile, get recommendations, and chat safely."],
];

export default function Welcome() {
  const navigate = useNavigate();
  const go = () => {
    try { localStorage.setItem("otaku_seen_welcome", "1"); } catch {}
    navigate("/register");
  };
  return (
    <div className="container screen-center" style={{ paddingTop: 28, paddingBottom: 32 }}>
      <Logo size={56} />
      <div style={{ margin: "14px 0" }}><span className="chip mono">◆ VS Neural Engine Live</span></div>
      <h1 style={{ fontSize: "2rem" }}>Breaking Language Barriers in Manga</h1>
      <p className="muted" style={{ margin: "0 auto 18px" }}>
        Read raw Japanese &amp; Korean manga instantly with real-time neural translation, context-aware suggestions, and global reader communities.
      </p>
      <div style={{ textAlign: "left" }}>
        {FEATURES.map(([icon, title, body]) => (
          <div key={title} className="panel feature">
            <span className="feature-icon"><Icon name={icon} /></span>
            <div><h3>{title}</h3><p>{body}</p></div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-block" onClick={go}>Get Started / Create Account →</button>
      <p className="muted" style={{ marginTop: 14, fontSize: ".85rem" }}>
        Already a member? <Link to="/login">Sign in</Link>
      </p>
      <p className="muted" style={{ fontSize: ".7rem" }}>By continuing, you agree to our Terms of Service &amp; Privacy Policy</p>
    </div>
  );
}
