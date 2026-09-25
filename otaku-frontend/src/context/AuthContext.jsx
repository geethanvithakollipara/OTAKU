import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("otaku_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/users/me")
      .then(setUser)
      .catch(() => localStorage.removeItem("otaku_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.post("/users/login", { email, password }, { auth: false });
    localStorage.setItem("otaku_token", data.token);
    setUser(data);
    return data;
  };

  const register = async (payload) => {
    const data = await api.post("/users/register", payload, { auth: false });
    localStorage.setItem("otaku_token", data.token);
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("otaku_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
