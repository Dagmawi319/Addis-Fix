import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/common/Primitives";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="app-dark grid min-h-screen place-items-center"><Loader /></div>;
  if (user === null) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
