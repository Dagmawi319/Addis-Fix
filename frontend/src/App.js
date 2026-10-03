import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/components/AuthCallback";

import Landing from "@/pages/marketing/Landing";
import About from "@/pages/marketing/About";
import Contact from "@/pages/marketing/Contact";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

import CitizenDashboard from "@/pages/app/CitizenDashboard";
import MapPage from "@/pages/app/MapPage";
import ReportPage from "@/pages/app/ReportPage";
import IncidentDetail from "@/pages/app/IncidentDetail";
import IncidentsBrowse from "@/pages/app/IncidentsBrowse";
import MyReports from "@/pages/app/MyReports";
import Notifications from "@/pages/app/Notifications";
import Profile from "@/pages/app/Profile";

import AuthorityDashboard from "@/pages/authority/AuthorityDashboard";
import ReviewIncident from "@/pages/authority/ReviewIncident";
import AdminDashboard from "@/pages/admin/AdminDashboard";

function AppRoutes() {
  const location = useLocation();
  // Process Google OAuth callback synchronously before any route/auth check
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public app views */}
      <Route path="/map" element={<MapPage />} />
      <Route path="/incidents" element={<IncidentsBrowse />} />
      <Route path="/incidents/:id" element={<IncidentDetail />} />

      {/* Citizen */}
      <Route path="/dashboard" element={<ProtectedRoute><CitizenDashboard /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
      <Route path="/my-reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* Authority */}
      <Route path="/authority" element={<ProtectedRoute roles={["authority", "admin"]}><AuthorityDashboard /></ProtectedRoute>} />
      <Route path="/authority/incidents/:id" element={<ProtectedRoute roles={["authority", "admin"]}><ReviewIncident /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Landing />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" theme="dark" toastOptions={{ style: { background: "#111A2E", border: "1px solid #1E2C4A", color: "#F1F5F9" } }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
