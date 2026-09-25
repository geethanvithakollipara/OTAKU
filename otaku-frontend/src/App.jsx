import { useCallback, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { TopBar, TabBar } from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Splash from "./components/Splash";
import Browse from "./pages/Browse";
import Zones from "./pages/Zones";
import MangaDetail from "./pages/MangaDetail";
import Reader from "./pages/Reader";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Welcome from "./pages/Welcome";
import Profile from "./pages/Profile";
import Library from "./pages/Library";
import Chat from "./pages/Chat";
import { useAuth } from "./context/AuthContext";

const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const BARE = ["/welcome", "/login", "/register"]; // full-screen flows: no top bar / tab bar

export default function App() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [splash, setSplash] = useState(() => !sessionStorage.getItem("otaku_splash"));
  const endSplash = useCallback(() => {
    try { sessionStorage.setItem("otaku_splash", "1"); } catch {}
    setSplash(false);
  }, []);

  if (splash) return <Splash onDone={endSplash} />;
  if (loading) return null;

  // first-time visitors land on onboarding before the home feed
  if (pathname === "/" && !user && !safeGet("otaku_seen_welcome")) return <Navigate to="/welcome" replace />;

  const bare = BARE.includes(pathname) || pathname.startsWith("/read/");
  return (
    <div className={"app-shell" + (bare ? " bare" : "")}>
      {!bare && <TopBar />}
      <Routes>
        <Route path="/" element={<Browse mode="home" />} />
        <Route path="/discover" element={<Browse mode="discover" />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/zones" element={<Zones />} />
        <Route path="/manga/:id" element={<MangaDetail />} />
        <Route path="/read/:id" element={<Reader />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      </Routes>
      {!bare && <TabBar />}
    </div>
  );
}
import Discover from "./pages/Discover";
<Route path="/discover" element={<Discover />} />