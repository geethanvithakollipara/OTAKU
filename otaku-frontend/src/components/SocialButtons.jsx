import { useState } from "react";

// Social sign-in isn't wired to the backend yet; the buttons render per the design.
export default function SocialButtons({ providers = ["Google", "Apple", "Discord"], label = "Or continue with" }) {
  const [msg, setMsg] = useState("");
  return (
    <>
      <div className="divider mono">{label}</div>
      <div className="social-row">
        {providers.map((p) => (
          <button key={p} type="button" className="btn" onClick={() => setMsg(`${p} sign-in isn't connected yet.`)}>{p}</button>
        ))}
      </div>
      {msg && <p className="notice">{msg}</p>}
    </>
  );
}
