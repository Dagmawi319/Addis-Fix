export const STATUS_META = {
  reported: { label: "Reported", bg: "#1E293B", text: "#94A3B8", border: "#334155", dot: "#94A3B8" },
  under_review: { label: "Under Review", bg: "rgba(34,211,238,0.15)", text: "#22D3EE", border: "rgba(34,211,238,0.3)", dot: "#22D3EE" },
  verified: { label: "Verified", bg: "rgba(59,130,246,0.15)", text: "#60A5FA", border: "rgba(59,130,246,0.3)", dot: "#3B82F6" },
  assigned: { label: "Assigned", bg: "rgba(168,85,247,0.15)", text: "#C084FC", border: "rgba(168,85,247,0.3)", dot: "#A855F7" },
  in_progress: { label: "In Progress", bg: "rgba(245,158,11,0.15)", text: "#FBBF24", border: "rgba(245,158,11,0.3)", dot: "#F59E0B" },
  resolved: { label: "Resolved", bg: "rgba(34,197,94,0.15)", text: "#4ADE80", border: "rgba(34,197,94,0.3)", dot: "#22C55E" },
  rejected: { label: "Rejected", bg: "rgba(239,68,68,0.15)", text: "#F87171", border: "rgba(239,68,68,0.3)", dot: "#EF4444" },
  submitted: { label: "Submitted", bg: "#1E293B", text: "#94A3B8", border: "#334155", dot: "#94A3B8" },
};

export const SEVERITY_META = {
  high: { label: "High", bg: "rgba(239,68,68,0.15)", text: "#F87171", border: "rgba(239,68,68,0.3)", color: "#EF4444" },
  medium: { label: "Medium", bg: "rgba(245,158,11,0.15)", text: "#FBBF24", border: "rgba(245,158,11,0.3)", color: "#F59E0B" },
  low: { label: "Low", bg: "rgba(59,130,246,0.15)", text: "#60A5FA", border: "rgba(59,130,246,0.3)", color: "#3B82F6" },
};

export const STATUS_ORDER = ["reported", "under_review", "verified", "assigned", "in_progress", "resolved"];

export const CATEGORY_FALLBACK_COLOR = "#64748B";

import {
  Construction, Trash2, Droplets, Zap, Lightbulb, Waves, Footprints,
  Building2, TrafficCone, Leaf, CircleHelp, MapPin,
} from "lucide-react";

export const CATEGORY_ICONS = {
  roads: Construction,
  potholes: Construction,
  waste: Trash2,
  illegal_dumping: Trash2,
  water: Droplets,
  drainage: Waves,
  streetlights: Lightbulb,
  electricity: Zap,
  traffic: TrafficCone,
  sidewalks: Footprints,
  public_property: Building2,
  environmental: Leaf,
  other: CircleHelp,
};

export function categoryIcon(key) {
  return CATEGORY_ICONS[key] || MapPin;
}
