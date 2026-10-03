import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { ReportCard } from "@/components/Cards";
import { Loader, EmptyState } from "@/components/common/Primitives";
import api from "@/lib/api";

const TABS = [
  { key: "", label: "All" },
  { key: "submitted", label: "Open" },
  { key: "under_review", label: "In Review" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
];

export default function MyReports() {
  const [reports, setReports] = useState(null);
  const [tab, setTab] = useState("");

  useEffect(() => {
    setReports(null);
    const url = tab ? `/reports/mine?status=${tab}` : "/reports/mine";
    api.get(url).then(({ data }) => setReports(data)).catch(() => setReports([]));
  }, [tab]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">My Reports</h1>
            <p className="text-sm text-slate-400">Track the status of your submitted reports.</p>
          </div>
          <Link to="/report" className="btn-teal inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold"><Plus className="h-4 w-4" /> New</Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.key} data-testid={`mine-tab-${t.key || "all"}`} onClick={() => setTab(t.key)} className={`rounded-full px-4 py-1.5 text-sm ${tab === t.key ? "bg-[#19C3C9] text-[#04131a] font-semibold" : "border border-[#1E2C4A] text-slate-300"}`}>{t.label}</button>
          ))}
        </div>

        <div className="mt-6">
          {reports === null ? <Loader /> : reports.length === 0 ? (
            <EmptyState icon={FileText} title="No reports yet" description="Your submitted reports will appear here."
              action={<Link to="/report" className="btn-teal rounded-lg px-4 py-2 text-sm font-bold">Report a Problem</Link>} />
          ) : (
            <div className="space-y-3">{reports.map((r) => <ReportCard key={r.report_id} report={r} />)}</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
