import React, { useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import AuthLayout from "@/pages/auth/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Always show the same confirmation regardless of outcome (prevents account enumeration).
    try { await api.post("/auth/forgot-password", { email }); } catch (e) { console.error("Forgot-password request error:", e); }
    setLoading(false);
    setSent(true);
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a secure reset link"
      footer={<Link to="/login" className="font-semibold text-[#16B9C4]" data-testid="back-to-login">Back to sign in</Link>}
    >
      {sent ? (
        <div data-testid="forgot-sent" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          If that email is registered, a reset link has been sent. Check your inbox.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input data-testid="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#19C3C9] focus:outline-none focus:ring-2 focus:ring-[#19C3C9]/20" />
          </div>
          <button data-testid="forgot-submit" disabled={loading} type="submit" className="btn-teal w-full rounded-lg py-2.5 text-sm font-bold disabled:opacity-60">{loading ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
    </AuthLayout>
  );
}
