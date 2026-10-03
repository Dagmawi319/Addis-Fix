import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Map, FileText, Bell, User, LayoutDashboard, ShieldCheck, Menu, X,
  Search, Plus, LogOut, ClipboardList, Building2, Users, ScrollText, Tag,
} from "lucide-react";
import { Logo } from "@/components/common/Primitives";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function navForRole(role) {
  const base = [
    { to: "/map", label: "Map", icon: Map },
    { to: "/incidents", label: "Browse Incidents", icon: ClipboardList },
  ];
  if (!role) return [{ to: "/", label: "Home", icon: Home }, ...base];
  const citizen = [
    { to: "/dashboard", label: "Dashboard", icon: Home },
    ...base,
    { to: "/report", label: "Report a Problem", icon: Plus, highlight: true },
    { to: "/my-reports", label: "My Reports", icon: FileText },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/profile", label: "Profile", icon: User },
  ];
  if (role === "citizen") return citizen;
  const authority = [
    { to: "/authority", label: "Authority Dashboard", icon: LayoutDashboard },
    ...base,
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/profile", label: "Profile", icon: User },
  ];
  if (role === "authority") return authority;
  // admin
  return [
    { to: "/admin", label: "Admin Dashboard", icon: ShieldCheck },
    { to: "/authority", label: "Operations", icon: LayoutDashboard },
    ...base,
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/profile", label: "Profile", icon: User },
  ];
}

function NavLinks({ onNavigate }) {
  const { user } = useAuth();
  const location = useLocation();
  const items = navForRole(user?.role);
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const active = location.pathname === it.to;
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onNavigate}
            data-testid={`nav-${it.to.replace(/\//g, "") || "home"}`}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-[#17233B] text-white" : "text-slate-400 hover:bg-[#111A2E] hover:text-white"
            } ${it.highlight ? "text-[#19C3C9]" : ""}`}
          >
            <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5"><Logo /></div>
      <div className="flex-1 overflow-y-auto px-3 pb-6"><NavLinks onNavigate={onNavigate} /></div>
      <div className="px-5 py-3 text-[11px] text-slate-600 border-t border-[#1E2C4A]">
        AddisFix · Prototype for future institutional integration
      </div>
    </div>
  );
}

export default function AppShell({ children, rightRail }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get("/notifications?unread=true").then(({ data }) => setUnread(data.unread_count)).catch(() => {});
  }, [user]);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(`/incidents?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="app-dark flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-[#1E2C4A]" style={{ backgroundColor: "var(--bg-sidebar)" }}>
        <SidebarInner />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#1E2C4A] px-4 py-3 backdrop-blur-md" style={{ backgroundColor: "rgba(11,18,32,0.85)" }}>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button data-testid="mobile-menu-btn" className="lg:hidden rounded-lg p-2 text-slate-300 hover:bg-[#111A2E]">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[270px] border-r border-[#1E2C4A] p-0" style={{ backgroundColor: "var(--bg-sidebar)" }}>
              <SidebarInner onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <form onSubmit={submitSearch} className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              data-testid="global-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search incidents, locations…"
              className="w-full rounded-lg border border-[#1E2C4A] bg-[#0B1220] py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-[#19C3C9] focus:outline-none"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/notifications" data-testid="header-notifications" className="relative rounded-lg p-2 text-slate-300 hover:bg-[#111A2E]">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#19C3C9] px-1 text-[10px] font-bold text-[#04131a]">{unread}</span>}
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-slate-200">{user.name}</div>
                  <div className="text-[10px] uppercase tracking-wide text-[#19C3C9]">{user.role}</div>
                </div>
                <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#17233B] text-sm font-bold text-slate-200">
                  {user.picture ? <img src={user.picture} alt="" className="h-full w-full object-cover" /> : (user.name?.[0] || "U")}
                </div>
                <button data-testid="logout-btn" onClick={async () => { await logout(); navigate("/"); }} className="rounded-lg p-2 text-slate-400 hover:bg-[#111A2E] hover:text-white">
                  <LogOut className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </button>
              </div>
            ) : (
              <Link to="/login" data-testid="header-signin" className="btn-teal rounded-lg px-4 py-2 text-sm">Sign In</Link>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
          {rightRail && (
            <aside className="hidden xl:block w-[360px] shrink-0 overflow-y-auto border-l border-[#1E2C4A] p-4">{rightRail}</aside>
          )}
        </div>
      </div>
    </div>
  );
}
