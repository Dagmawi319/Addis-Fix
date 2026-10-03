import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ThumbsUp, Bell, Plus, Activity } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { ReportCard } from "@/components/Cards";
import { EmptyState, Loader } from "@/components/common/Primitives";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="card-dark p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="mt-2 font-display text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState(null);
  const [notifs, setNotifs] = useState({ items: [], unread_count: 0 });

  useEffect(() => {
    api.get("/reports/mine").then(({ data }) => setReports(data)).catch(() => setReports([]));
    api.get("/notifications").then(({ data }) => setNotifs(data)).catch(() => {});
  }, []);

  const counts = {
    total: reports?.length || 0,
    open: reports?.filter((r) => !["resolved", "rejected"].includes(r.status)).length || 0,
    resolved: reports?.filter((r) => r.status === "resolved").length || 0,
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Welcome, {user?.name?.split(" ")[0]}</h1>
            <p className="text-sm text-slate-400">Here's an overview of your civic activity.</p>
          </div>
          <Link to="/report" data-testid="dashboard-report-btn" className="btn-teal inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold"><Plus className="h-4 w-4" /> Report a Problem</Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={FileText} label="My Reports" value={counts.total} color="#19C3C9" />
          <Stat icon={Activity} label="Open" value={counts.open} color="#F59E0B" />
          <Stat icon={ThumbsUp} label="Resolved" value={counts.resolved} color="#22C55E" />
          <Stat icon={Bell} label="Unread" value={notifs.unread_count} color="#60A5FA" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 font-display text-lg font-semibold text-white">Recent reports</h2>
            {reports === null ? <Loader /> : reports.length === 0 ? (
              <EmptyState icon={FileText} title="No reports yet" description="Report your first issue to start tracking it here."
                action={<Link to="/report" className="btn-teal rounded-lg px-4 py-2 text-sm font-bold">Report a Problem</Link>} />
            ) : (
              <div className="space-y-3">{reports.slice(0, 6).map((r) => <ReportCard key={r.report_id} report={r} />)}</div>
            )}
          </div>
          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-white">Notifications</h2>
            {notifs.items.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications" testId="empty-notifs" />
            ) : (
              <div className="space-y-2">
                {notifs.items.slice(0, 6).map((n) => (
                  <div key={n.id} className={`card-dark p-3 ${!n.read ? "border-l-2 border-l-[#19C3C9]" : ""}`}>
                    <div className="text-sm font-medium text-slate-200">{n.title}</div>
                    <div className="text-xs text-slate-400">{n.message}</div>
                  </div>
                ))}
                <Link to="/notifications" className="block text-center text-xs text-[#19C3C9]">View all</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
