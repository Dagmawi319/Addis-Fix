import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, AlertCircle, CheckCircle2, Activity, PlayCircle, ThumbsUp } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { StatusBadge, SeverityBadge } from "@/components/common/Badges";
import { Loader, EmptyState } from "@/components/common/Primitives";
import api from "@/lib/api";
import { STATUS_META, SEVERITY_META } from "@/lib/constants";

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="card-dark p-4">
      <div className="flex items-center justify-between"><span className="text-xs text-slate-400">{label}</span><Icon className="h-4 w-4" style={{ color }} /></div>
      <div className="mt-2 font-display text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

export default function AuthorityDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get("/authority/stats").then(({ data }) => setStats(data)).catch(() => setStats(false)); }, []);

  if (stats === null) return <AppShell><Loader /></AppShell>;
  if (stats === false) return <AppShell><EmptyState title="Unable to load" description="Could not load authority statistics." /></AppShell>;

  const totalCat = stats.by_category.reduce((a, c) => a + c.count, 0) || 1;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-5 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-white">Authority Dashboard</h1>
        <p className="text-sm text-slate-400">Operational overview of reports and incidents.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={ClipboardList} label="Total Reports" value={stats.total_reports} color="#19C3C9" />
          <Stat icon={AlertCircle} label="Awaiting Review" value={stats.awaiting_review} color="#F59E0B" />
          <Stat icon={CheckCircle2} label="Verified" value={stats.by_status.verified} color="#60A5FA" />
          <Stat icon={Activity} label="Assigned" value={stats.by_status.assigned} color="#C084FC" />
          <Stat icon={PlayCircle} label="In Progress" value={stats.by_status.in_progress} color="#FBBF24" />
          <Stat icon={CheckCircle2} label="Resolved" value={stats.by_status.resolved} color="#22C55E" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 font-display text-lg font-semibold text-white">Assignment queue</h2>
            {stats.assignment_queue.length === 0 ? <EmptyState icon={ClipboardList} title="Queue is empty" description="No incidents awaiting action." /> : (
              <div className="card-dark overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#1E2C4A] text-left text-xs text-slate-400">
                    <th className="px-4 py-2.5">Incident</th><th className="px-4 py-2.5">Severity</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5"></th>
                  </tr></thead>
                  <tbody>
                    {stats.assignment_queue.map((i) => (
                      <tr key={i.incident_id} className="border-b border-[#1E2C4A]/60 hover:bg-[#17233B]">
                        <td className="px-4 py-3"><div className="font-medium text-slate-200">{i.title}</div><div className="font-mono text-[11px] text-[#19C3C9]">{i.code}</div></td>
                        <td className="px-4 py-3"><SeverityBadge severity={i.severity} /></td>
                        <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                        <td className="px-4 py-3 text-right"><button data-testid={`review-${i.incident_id}`} onClick={() => navigate(`/authority/incidents/${i.incident_id}`)} className="rounded-lg border border-[#19C3C9] px-3 py-1.5 text-xs font-semibold text-[#19C3C9]">Review</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="card-dark p-4">
              <h3 className="mb-3 font-display text-sm font-semibold text-white">Severity distribution</h3>
              {["high", "medium", "low"].map((s) => (
                <div key={s} className="mb-2">
                  <div className="flex justify-between text-xs"><span style={{ color: SEVERITY_META[s].text }}>{SEVERITY_META[s].label}</span><span className="text-slate-400">{stats.by_severity[s]}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-[#0B1220]"><div className="h-full rounded-full" style={{ width: `${(stats.by_severity[s] / (stats.total_incidents || 1)) * 100}%`, backgroundColor: SEVERITY_META[s].color }} /></div>
                </div>
              ))}
            </div>
            <div className="card-dark p-4">
              <h3 className="mb-3 font-display text-sm font-semibold text-white">By category</h3>
              {stats.by_category.length === 0 ? <p className="text-xs text-slate-500">No data yet.</p> : stats.by_category.map((c) => (
                <div key={c.key} className="mb-2">
                  <div className="flex justify-between text-xs"><span className="flex items-center gap-1 text-slate-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</span><span className="text-slate-400">{c.count}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-[#0B1220]"><div className="h-full rounded-full" style={{ width: `${(c.count / totalCat) * 100}%`, backgroundColor: c.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
