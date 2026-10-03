import React from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

// Shared split-screen shell for auth pages: left dark brand panel, right light card.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 lg:flex" style={{ backgroundColor: "#0B1220" }}>
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ backgroundColor: "rgba(25,195,201,0.15)" }}>
            <MapPin className="h-5 w-5 text-[#19C3C9]" />
          </span>
          <span className="font-display text-2xl font-extrabold"><span className="text-white">Addis</span><span className="text-[#19C3C9]">Fix</span></span>
        </Link>
        <div className="relative">
          <svg viewBox="0 0 400 180" className="w-full opacity-40" fill="none" stroke="#19C3C9" strokeWidth="1.5">
            <path d="M0 160 H400 M30 160 V90 h30 V160 M80 160 V60 h40 V160 M140 160 V100 h25 V160 M185 160 V40 h20 V160 M225 160 V75 h35 V160 M280 160 V55 h30 V160 M330 160 V95 h40 V160" />
            <circle cx="195" cy="28" r="6" />
            <path d="M195 10 V22" />
          </svg>
          <p className="mt-6 font-display text-xl font-semibold text-white">Stronger communities.</p>
          <p className="text-xl font-semibold text-[#19C3C9]">A better Addis.</p>
          <p className="mt-3 text-sm text-slate-400">Report · Track · Improve</p>
        </div>
        <p className="text-xs text-slate-600">© 2026 AddisFix — civic-tech prototype.</p>
      </div>

      {/* Right form card */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 flex justify-center">
            <Link to="/" className="font-display text-2xl font-extrabold"><span className="text-[#0F172A]">Addis</span><span className="text-[#19C3C9]">Fix</span></Link>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

const GOOGLE_SVG = (
  <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
);

export function GoogleButton({ label = "Continue with Google" }) {
  const startGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <button type="button" onClick={startGoogle} data-testid="google-login-btn" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
      {GOOGLE_SVG} {label}
    </button>
  );
}
