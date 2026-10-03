import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ClipboardList } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { IncidentCard } from "@/components/Cards";
import { Loader, EmptyState } from "@/components/common/Primitives";
import api from "@/lib/api";
import { STATUS_META } from "@/lib/constants";

export default function IncidentsBrowse() {
  const [sp] = useSearchParams();
  const [items, setItems] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ q: sp.get("q") || "", category: "", status: "" });

  useEffect(() => { api.get("/categories").then(({ data }) => setCategories(data)).catch(() => {}); }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && p.append(k, v));
    p.append("limit", "100");
    setItems(null);
    api.get(`/incidents?${p}`).then(({ data }) => setItems(data.items)).catch(() => setItems([]));
  }, [filters]);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-5 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-white">Browse Incidents</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input data-testid="browse-search" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search by title, code or location" className="w-full rounded-lg border border-[#1E2C4A] bg-[#0B1220] py-2 pl-9 pr-3 text-sm text-slate-200" />
          </div>
          <select data-testid="browse-category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
          <select data-testid="browse-status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200">
            <option value="">All Status</option>
            {Object.keys(STATUS_META).filter((s) => s !== "submitted").map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>
        <div className="mt-6">
          {items === null ? <Loader /> : items.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No incidents found" description="No incidents match your filters." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">{items.map((i) => <IncidentCard key={i.incident_id} incident={i} />)}</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
