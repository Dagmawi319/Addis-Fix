import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import AuthLayout from "@/pages/auth/AuthLayout";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const token = sp.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      navigate("/login?reset=1");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail));
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Enter a new password for your account"
      footer={<Link to="/login" className="font-semibold text-[#16B9C4]" data-testid="back-to-login">Back to sign in</Link>}
    >
      {!token ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">This reset link is invalid or missing a token.</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div data-testid="reset-error" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
            <input data-testid="reset-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#19C3C9] focus:outline-none focus:ring-2 focus:ring-[#19C3C9]/20" />
          </div>
          <button data-testid="reset-submit" disabled={loading} type="submit" className="btn-teal w-full rounded-lg py-2.5 text-sm font-bold disabled:opacity-60">{loading ? "Updating…" : "Update password"}</button>
        </form>
      )}
    </AuthLayout>
  );
}
