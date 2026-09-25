import { useEffect } from "react";
import { Logo } from "./Icon";

export default function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="panel screen-center" style={{ padding: "36px 40px" }}>
        <Logo size={72} />
        <h2 style={{ marginTop: 14, letterSpacing: ".12em" }}>OTAKU</h2>
        <div className="mono muted">Manga Readers</div>
      </div>
    </div>
  );
}
