import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon, { Logo } from "./Icon";

export function TopBar() {
  const { user } = useAuth();
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <Logo />
        <span className="brand-name">OTAKU<small>オタク</small></span>
      </Link>
      <div style={{ display: "flex", gap: 8 }}>
        <Link to="/discover" className="icon-btn" aria-label="Search"><Icon name="search" size={18} />
        <button onClick={() => navigate("/discover")}>
         Discover
        </button>
        </Link>
        <Link to={user ? "/profile" : "/login"} className="icon-btn avatar" aria-label="Profile">
          {user ? (user.username || "U")[0].toUpperCase() : <Icon name="user" size={18} />}
        </Link>
      </div>
    </header>
  );
}

export function TabBar() {
  const { user } = useAuth();
  const tabs = [
    ["/", "Home", "home", true],
    ["/discover", "Discover", "compass"],
    ["/zones", "Zones", "zones"],
    ["/library", "Library", "library"],
    [user ? "/profile" : "/login", "Profile", "user"],
  ];
  return (
    <nav className="tabbar">
      {tabs.map(([to, label, icon, end]) => (
        <NavLink key={label} to={to} end={end} className={({ isActive }) => "tab" + (isActive ? " active" : "")}>
          <Icon name={icon} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
