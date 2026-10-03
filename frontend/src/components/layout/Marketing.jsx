import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/common/Primitives";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/map", label: "Map" },
  { to: "/about", label: "About" },
  { to: "/#how", label: "How It Works" },
  { to: "/contact", label: "Contact" },
];

export function MarketingNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const dest = user ? (user.role === "admin" ? "/admin" : user.role === "authority" ? "/authority" : "/dashboard") : "/login";
  return (
    <header className="sticky top-0 z-40 border-b border-[#1E2C4A] backdrop-blur-md" style={{ backgroundColor: "rgba(11,18,32,0.8)" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <a key={l.label} href={l.to} className="text-sm font-medium text-slate-300 hover:text-white transition-colors" data-testid={`mkt-nav-${l.label.replace(/\s/g,"").toLowerCase()}`}>{l.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to={dest} data-testid="nav-signin-btn" className="btn-teal hidden sm:inline-flex rounded-lg px-4 py-2 text-sm">
            {user ? "Open App" : "Sign In"}
          </Link>
          <button className="md:hidden rounded-lg p-2 text-slate-300" onClick={() => setOpen(!open)} data-testid="mkt-mobile-toggle">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-[#1E2C4A] px-5 py-3">
          {LINKS.map((l) => (
            <a key={l.label} href={l.to} className="block py-2 text-sm text-slate-300" onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <Link to={dest} className="btn-teal mt-2 inline-flex rounded-lg px-4 py-2 text-sm">{user ? "Open App" : "Sign In"}</Link>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#1E2C4A] bg-[#080E1A]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-2 text-xs text-slate-500">Report · Track · Improve — a community platform for a better Addis.</p>
        </div>
        <div className="text-xs text-slate-500">
          <p>© 2026 AddisFix. Authority workflow prototype for future institutional integration.</p>
          <div className="mt-1 flex gap-4">
            <Link to="/about" className="hover:text-slate-300">About</Link>
            <Link to="/contact" className="hover:text-slate-300">Contact</Link>
            <span>Privacy by design</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
