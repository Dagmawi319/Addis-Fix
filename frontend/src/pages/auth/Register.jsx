import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AuthLayout, { GoogleButton } from "@/pages/auth/AuthLayout";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await register(form.name, form.email, form.password);
    setLoading(false);
    if (res.ok) navigate("/dashboard");
    else setError(res.error);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join AddisFix and help improve your city"
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-[#16B9C4]" data-testid="go-login">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <div data-testid="register-error" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
          <input data-testid="register-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Abebe Kebede" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#19C3C9] focus:outline-none focus:ring-2 focus:ring-[#19C3C9]/20" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input data-testid="register-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#19C3C9] focus:outline-none focus:ring-2 focus:ring-[#19C3C9]/20" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input data-testid="register-password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#19C3C9] focus:outline-none focus:ring-2 focus:ring-[#19C3C9]/20" />
        </div>
        <button data-testid="register-submit" disabled={loading} type="submit" className="btn-teal w-full rounded-lg py-2.5 text-sm font-bold disabled:opacity-60">{loading ? "Creating…" : "Create account"}</button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" /></div>
      <GoogleButton label="Sign up with Google" />
    </AuthLayout>
  );
}
