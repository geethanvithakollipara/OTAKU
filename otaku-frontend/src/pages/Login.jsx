import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon, { Logo } from "../components/Icon";
import SocialButtons from "../components/SocialButtons";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-form screen-center">
      <div style={{ textAlign: "left" }}>
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back"><Icon name="back" size={18} /></button>
      </div>
      <Logo size={56} />
      <h1 style={{ marginTop: 14 }}>Welcome Back</h1>
      <p className="muted" style={{ margin: "0 auto 22px" }}>Enter your credentials to sign your reading way in and get zoned into the zones.</p>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
        <div className="field">
          <label htmlFor="email">Reader ID / Email</label>
          <div className="input-wrap">
            <Icon name="mail" size={18} />
            <input id="email" type="email" required placeholder="read@otaku.io" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="password">Secret Key</label>
          <div className="input-wrap">
            <Icon name="lock" size={18} />
            <input id="password" type={show ? "text" : "password"} required placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" className="btn-ghost btn" onClick={() => setShow(!show)} aria-label="Toggle password"><Icon name="eye" size={18} /></button>
          </div>
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign In to OTAKU ⚡"}</button>
      </form>
      <SocialButtons />
      <p className="muted" style={{ marginTop: 18 }}>Don't have an account? <Link to="/register">Sign Up</Link></p>
    </div>
  );
}
