import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <h1>Profile</h1>
      <div className="panel">
        <b>{user?.username}</b>
        <div className="muted">{user?.email}</div>
        <div className="muted mono" style={{ marginTop: 8 }}>Reading language: {user?.preferredLanguage || "en"}</div>
      </div>
      <button className="btn" style={{ marginTop: 16 }} onClick={() => { logout(); navigate("/login"); }}>Log out</button>
    </div>
  );
}
