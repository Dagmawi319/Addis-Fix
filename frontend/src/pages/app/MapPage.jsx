import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import MapView from "@/components/MapView";
import { IncidentCard } from "@/components/Cards";
import { Loader, EmptyState } from "@/components/common/Primitives";
import api from "@/lib/api";
import { STATUS_META, SEVERITY_META } from "@/lib/constants";

export default function MapPage() {
  const [sp] = useSearchParams();
  const [incidents, setIncidents] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ category: "", severity: "", status: "", q: sp.get("q") || "" });

  useEffect(() => { api.get("/categories").then(({ data }) => setCategories(data)).catch(() => {}); }, []);
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    params.append("limit", "200");
    setIncidents(null);
    api.get(`/incidents?${params}`).then(({ data }) => setIncidents(data.items)).catch(() => setIncidents([]));
  }, [filters]);

  const list = incidents || [];

  const rail = (
    <div>
      <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate-400">Recent Incidents</h3>
      {incidents === null ? <Loader /> : list.length === 0 ? (
        <EmptyState title="No incidents found" description="No incidents match your filters." testId="empty-map-rail" />
      ) : (
        <div className="space-y-2">
          {list.map((i) => <IncidentCard key={i.incident_id} incident={i} onClick={(inc) => setSelected(inc.incident_id)} compact />)}
        </div>
      )}
    </div>
  );

  return (
    <AppShell rightRail={rail}>
      <div className="flex h-full flex-col">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1E2C4A] p-3">
          <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          <select data-testid="filter-category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-2.5 py-1.5 text-xs text-slate-200">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
          <select data-testid="filter-severity" value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })} className="rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-2.5 py-1.5 text-xs text-slate-200">
            <option value="">All Severity</option>
            {Object.keys(SEVERITY_META).map((s) => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}
          </select>
          <select data-testid="filter-status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-2.5 py-1.5 text-xs text-slate-200">
            <option value="">All Status</option>
            {Object.keys(STATUS_META).filter((s) => s !== "submitted").map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          {filters.q && <span className="rounded-full bg-[#19C3C9]/10 px-3 py-1 text-xs text-[#19C3C9]">search: {filters.q}</span>}
          <span className="ml-auto text-xs text-slate-500">{list.length} shown</span>
        </div>
        <div className="relative min-h-[400px] flex-1">
          <MapView incidents={list} categories={categories} selectedId={selected} onSelect={(i) => setSelected(i.incident_id)} />
        </div>
      </div>
    </AppShell>
  );
}
