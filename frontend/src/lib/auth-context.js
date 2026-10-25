import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth as authApi, http } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("cultora_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      localStorage.removeItem("cultora_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { token, user } = await authApi.login({ email, password });
    localStorage.setItem("cultora_token", token);
    setUser(user);
    return user;
  };

  const register = async (name, email, password) => {
    const { token, user } = await authApi.register({ name, email, password });
    localStorage.setItem("cultora_token", token);
    setUser(user);
    return user;
  };

  const logout = async () => {
    try { await http.post("/auth/logout"); } catch (_) {}
    localStorage.removeItem("cultora_token");
    setUser(null);
  };

  const logoutAll = async () => {
    try { await http.post("/auth/logout-all"); } catch (_) {}
    localStorage.removeItem("cultora_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, logoutAll, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
