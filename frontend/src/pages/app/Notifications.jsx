import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { EmptyState, Loader } from "@/components/common/Primitives";
import api from "@/lib/api";

export default function Notifications() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  const load = () => api.get("/notifications").then(({ data }) => setData(data)).catch(() => setData({ items: [], unread_count: 0 }));
  useEffect(() => { load(); }, []);

  const markAll = async () => { await api.post("/notifications/read-all"); load(); };
  const open = async (n) => {
    if (!n.read) await api.post(`/notifications/${n.id}/read`);
    if (n.incident_id) navigate(`/incidents/${n.incident_id}`); else load();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-white">Notifications</h1>
          {data?.unread_count > 0 && <button data-testid="mark-all-read" onClick={markAll} className="flex items-center gap-1 text-sm text-[#19C3C9]"><Check className="h-4 w-4" /> Mark all read</button>}
        </div>
        <div className="mt-6 space-y-2">
          {data === null ? <Loader /> : data.items.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" description="Updates about your reports and followed incidents will show up here." />
          ) : data.items.map((n) => (
            <button key={n.id} data-testid={`notif-${n.id}`} onClick={() => open(n)} className={`card-dark w-full p-4 text-left ${!n.read ? "border-l-2 border-l-[#19C3C9]" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">{n.title}</span>
                <span className="text-[11px] text-slate-500">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-400">{n.message}</p>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
