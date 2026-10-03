import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/common/Primitives";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;
    (async () => {
      if (!sessionId) { navigate("/login", { replace: true }); return; }
      try {
        const { data } = await api.post("/auth/google/session", {}, { headers: { "X-Session-ID": sessionId } });
        setUser(data);
        window.history.replaceState(null, "", window.location.pathname);
        const dest = data.role === "admin" ? "/admin" : data.role === "authority" ? "/authority" : "/dashboard";
        navigate(dest, { replace: true });
      } catch {
        navigate("/login?error=google", { replace: true });
      }
    })();
  }, []); // eslint-disable-line

  return <div className="app-dark grid min-h-screen place-items-center"><Loader label="Signing you in…" /></div>;
}
