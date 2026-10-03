import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthLayout, { GoogleButton } from "@/pages/auth/AuthLayout";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(sp.get("error") === "google" ? "Google sign-in failed. Please try again." : "");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      const r = res.user.role;
      navigate(r === "admin" ? "/admin" : r === "authority" ? "/authority" : "/dashboard");
    } else setError(res.error);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account"
      footer={<>Don't have an account? <Link to="/register" className="font-semibold text-[#16B9C4]" data-testid="go-register">Sign up</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <div data-testid="login-error" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email or phone number</label>
          <input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#19C3C9] focus:outline-none focus:ring-2 focus:ring-[#19C3C9]/20" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <input data-testid="login-password" type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-[#19C3C9] focus:outline-none focus:ring-2 focus:ring-[#19C3C9]/20" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" className="rounded border-slate-300" /> Remember me</label>
          <Link to="/forgot-password" className="font-medium text-[#16B9C4]" data-testid="forgot-link">Forgot password?</Link>
        </div>
        <button data-testid="login-submit" disabled={loading} type="submit" className="btn-teal w-full rounded-lg py-2.5 text-sm font-bold disabled:opacity-60">{loading ? "Signing in…" : "Sign In"}</button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" /></div>
      <GoogleButton />
    </AuthLayout>
  );
}
