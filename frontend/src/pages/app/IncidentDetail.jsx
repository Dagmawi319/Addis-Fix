import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Users, ThumbsUp, Bell, BellOff, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { StatusBadge, SeverityBadge } from "@/components/common/Badges";
import { Loader, EmptyState, DemoBadge } from "@/components/common/Primitives";
import { useAuth } from "@/context/AuthContext";
import api, { fileRawUrl } from "@/lib/api";
import { STATUS_META, STATUS_ORDER, categoryIcon } from "@/lib/constants";

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inc, setInc] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/incidents/${id}`).then(({ data }) => setInc(data)).catch(() => setInc(false));
  useEffect(() => { load(); }, [id]);

  if (inc === null) return <AppShell><Loader /></AppShell>;
  if (inc === false) return <AppShell><EmptyState title="Incident not found" description="This incident may have been removed." /></AppShell>;

  const Icon = categoryIcon(inc.category);
  const reached = (s) => {
    const idx = STATUS_ORDER.indexOf(inc.status);
    return STATUS_ORDER.indexOf(s) <= idx;
  };

  const confirm = async () => {
    if (!user) return navigate("/login");
    setBusy(true);
    try { const { data } = await api.post(`/incidents/${id}/confirm`); setInc({ ...inc, confirmation_count: data.confirmation_count, confirmed_by_me: true }); toast.success("Thanks for confirming!"); } catch {}
    setBusy(false);
  };
  const toggleFollow = async () => {
    if (!user) return navigate("/login");
    setBusy(true);
    try {
      if (inc.following) { await api.delete(`/incidents/${id}/follow`); setInc({ ...inc, following: false, follower_count: Math.max(0, inc.follower_count - 1) }); }
      else { await api.post(`/incidents/${id}/follow`); setInc({ ...inc, following: true, follower_count: inc.follower_count + 1 }); toast.success("You're now following this incident."); }
    } catch {}
    setBusy(false);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-5 sm:p-8">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#19C3C9]/10"><Icon className="h-6 w-6 text-[#19C3C9]" /></span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-white">{inc.title}</h1>
                {inc.is_demo && <DemoBadge />}
              </div>
              <div className="mt-1 flex items-center gap-3 text-sm text-slate-400">
                <span className="font-mono text-xs text-[#19C3C9]">{inc.code}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {inc.location_description || "Addis Ababa"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2"><SeverityBadge severity={inc.severity} /><StatusBadge status={inc.status} /></div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {inc.representative_image_id && (
              <img src={fileRawUrl(inc.representative_image_id)} alt="" className="h-64 w-full rounded-xl object-cover sm:h-72" />
            )}
            <div>
              <h3 className="mb-2 font-display font-semibold text-white">Description</h3>
              <p className="text-sm leading-relaxed text-slate-300">{inc.description}</p>
            </div>

            {inc.status === "resolved" && inc.resolution_note && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <h3 className="font-display text-sm font-semibold text-emerald-400">Resolution</h3>
                <p className="mt-1 text-sm text-slate-300">{inc.resolution_note}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button data-testid="confirm-btn" onClick={confirm} disabled={busy || inc.confirmed_by_me} className="inline-flex items-center gap-2 rounded-lg border border-[#19C3C9] px-5 py-2.5 text-sm font-semibold text-[#19C3C9] disabled:opacity-60">
                {inc.confirmed_by_me ? <Check className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />} I see this too ({inc.confirmation_count})
              </button>
              <button data-testid="follow-btn" onClick={toggleFollow} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-[#1E2C4A] px-5 py-2.5 text-sm text-slate-200">
                {inc.following ? <><BellOff className="h-4 w-4" /> Unfollow</> : <><Bell className="h-4 w-4" /> Follow this incident</>}
              </button>
            </div>
          </div>

          {/* Right: timeline + stats */}
          <div className="space-y-6">
            <div className="card-dark p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="font-display text-xl font-bold text-white">{inc.report_count ?? inc.report_ids?.length ?? 0}</div><div className="text-[11px] text-slate-400">Reports</div></div>
                <div><div className="font-display text-xl font-bold text-white">{inc.confirmation_count}</div><div className="text-[11px] text-slate-400">Confirmations</div></div>
                <div><div className="font-display text-xl font-bold text-white">{inc.follower_count}</div><div className="text-[11px] text-slate-400">Followers</div></div>
              </div>
            </div>

            <div className="card-dark p-4">
              <h3 className="mb-4 font-display text-sm font-semibold text-white">Status</h3>
              <div className="space-y-0">
                {STATUS_ORDER.map((s, i) => {
                  const done = reached(s);
                  const active = inc.status === s;
                  const m = STATUS_META[s];
                  const histItem = inc.timeline?.find((t) => t.to_status === s);
                  return (
                    <div key={s} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`grid h-6 w-6 place-items-center rounded-full border-2 ${done ? "border-[#19C3C9]" : "border-[#1E2C4A]"}`} style={{ backgroundColor: active ? "#19C3C9" : done ? "rgba(25,195,201,0.2)" : "transparent" }}>
                          {done && <Check className="h-3 w-3" style={{ color: active ? "#04131a" : "#19C3C9" }} />}
                        </span>
                        {i < STATUS_ORDER.length - 1 && <span className={`w-0.5 flex-1 ${done ? "bg-[#19C3C9]/40" : "bg-[#1E2C4A]"}`} style={{ minHeight: 24 }} />}
                      </div>
                      <div className="pb-5">
                        <div className={`text-sm font-medium ${done ? "text-slate-200" : "text-slate-500"}`}>{m.label}</div>
                        {histItem && <div className="flex items-center gap-1 text-[11px] text-slate-500"><Clock className="h-3 w-3" /> {new Date(histItem.created_at).toLocaleDateString()}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
