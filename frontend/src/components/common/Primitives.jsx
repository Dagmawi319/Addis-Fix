import React from "react";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo({ className = "", onDark = true, to = "/" }) {
  return (
    <Link to={to} data-testid="logo-link" className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ backgroundColor: "rgba(25,195,201,0.15)" }}>
        <MapPin className="h-5 w-5" style={{ color: "#19C3C9" }} />
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight">
        <span style={{ color: onDark ? "#FFFFFF" : "#0F172A" }}>Addis</span>
        <span style={{ color: "#19C3C9" }}>Fix</span>
      </span>
    </Link>
  );
}

export function Loader({ label = "Loading…" }) {
  return (
    <div data-testid="loader" className="flex items-center justify-center py-16 text-slate-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-[#19C3C9]" />
      <span className="ml-3 text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, testId = "empty-state" }) {
  return (
    <div data-testid={testId} className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E2C4A] py-16 px-6 text-center">
      {Icon && (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-full" style={{ backgroundColor: "rgba(25,195,201,0.1)" }}>
          <Icon className="h-7 w-7" style={{ color: "#19C3C9" }} />
        </span>
      )}
      <h3 className="font-display text-lg font-semibold text-slate-100">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function DemoBadge() {
  return (
    <span
      data-testid="demo-badge"
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: "rgba(250,204,21,0.15)", color: "#FACC15", border: "1px solid rgba(250,204,21,0.3)" }}
      title="Demonstration data — not real Addis Ababa records"
    >
      Demo
    </span>
  );
}
