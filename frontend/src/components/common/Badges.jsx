import React from "react";
import { STATUS_META, SEVERITY_META } from "@/lib/constants";

export function StatusBadge({ status, className = "" }) {
  const m = STATUS_META[status] || STATUS_META.reported;
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{ backgroundColor: m.bg, color: m.text, border: `1px solid ${m.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.dot }} />
      {m.label}
    </span>
  );
}

export function SeverityBadge({ severity, className = "" }) {
  const m = SEVERITY_META[severity] || SEVERITY_META.medium;
  return (
    <span
      data-testid={`severity-badge-${severity}`}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{ backgroundColor: m.bg, color: m.text, border: `1px solid ${m.border}` }}
    >
      {m.label}
    </span>
  );
}
