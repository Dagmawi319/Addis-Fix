import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = checking, null = not authed, object = authed
  const [user, setUser] = useState(undefined);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) {
      // AuthCallback will establish the session first
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return { ok: true, user: data };
    } catch (e) {
      return { ok: false, error: formatApiError(e.response?.data?.detail) };
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      setUser(data);
      return { ok: true, user: data };
    } catch (e) {
      return { ok: false, error: formatApiError(e.response?.data?.detail) };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
