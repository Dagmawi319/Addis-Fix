import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Sparkles, MapPin, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { StatusBadge, SeverityBadge } from "@/components/common/Badges";
import { Loader, EmptyState } from "@/components/common/Primitives";
import api, { fileRawUrl, formatApiError } from "@/lib/api";
import { STATUS_META } from "@/lib/constants";

export default function ReviewIncident() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [note, setNote] = useState("");
  const [dept, setDept] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/incidents/${id}/full`).then(({ data }) => setData(data)).catch(() => setData(false));
  useEffect(() => { load(); api.get("/departments").then(({ data }) => setDepartments(data)).catch(() => {}); }, [id]);

  if (data === null) return <AppShell><Loader /></AppShell>;
  if (data === false) return <AppShell><EmptyState title="Not found" /></AppShell>;
  const inc = data.incident;

  const changeStatus = async (status, resolutionNote) => {
    setBusy(true);
    try { await api.patch(`/incidents/${id}/status`, { status, note: resolutionNote || null }); toast.success(`Status → ${STATUS_META[status]?.label || status}`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    setBusy(false);
  };
  const assign = async () => {
    if (!dept) return toast.error("Select a department");
    setBusy(true);
    try { await api.post(`/incidents/${id}/assign`, { department: dept }); toast.success("Assigned"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    setBusy(false);
  };
  const addNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try { await api.post(`/incidents/${id}/notes`, { note }); setNote(""); toast.success("Internal note added"); load(); } catch (e) { console.error("Add note failed:", e); toast.error("Could not add the note. Please try again."); }
    setBusy(false);
  };

  const transitions = data.allowed_transitions || [];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-5 sm:p-8">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><h1 className="font-display text-2xl font-bold text-white">{inc.title}</h1><span className="font-mono text-xs text-[#19C3C9]">{inc.code}</span></div>
            <div className="mt-1 flex items-center gap-1 text-sm text-slate-400"><MapPin className="h-3.5 w-3.5" /> {inc.location_description}</div>
          </div>
          <div className="flex gap-2"><SeverityBadge severity={inc.severity} /><StatusBadge status={inc.status} /></div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="card-dark p-4">
              <h3 className="mb-2 font-display text-sm font-semibold text-white">Description</h3>
              <p className="text-sm text-slate-300">{inc.description}</p>
            </div>

            {/* Related reports + evidence + AI */}
            <div>
              <h3 className="mb-3 font-display text-sm font-semibold text-white">Related reports ({data.reports.length})</h3>
              <div className="space-y-3">
                {data.reports.map((r) => (
                  <div key={r.report_id} className="card-dark p-4">
                    <div className="flex gap-3">
                      {r.image_ids?.[0] && <img src={fileRawUrl(r.image_ids[0])} alt="" className="h-20 w-20 rounded-lg object-cover" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-200">{r.title}</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{r.description}</p>
                        {r.ai_analysis && (
                          <div className="mt-2 rounded-lg border border-[#19C3C9]/30 bg-[#17233B]/70 p-2 text-xs">
                            <span className="flex items-center gap-1 font-semibold text-[#19C3C9]"><Sparkles className="h-3 w-3" /> AI suggestion</span>
                            {r.ai_analysis.available ? (
                              <span className="text-slate-300"> {r.ai_analysis.category} · {r.ai_analysis.severity}{r.ai_analysis.confidence != null ? ` · ${(r.ai_analysis.confidence * 100).toFixed(0)}% (assistive)` : ""}</span>
                            ) : <span className="text-amber-400"> {r.ai_analysis.message}</span>}
                          </div>
                        )}
                        <div className="mt-2 flex gap-2">
                          <button data-testid={`verify-report-${r.report_id}`} onClick={() => api.patch(`/reports/${r.report_id}/review`, { review_state: "verified" }).then(load)} className="flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2 py-1 text-xs text-emerald-400"><Check className="h-3 w-3" /> Verify</button>
                          <button data-testid={`reject-report-${r.report_id}`} onClick={() => api.patch(`/reports/${r.report_id}/review`, { review_state: "rejected" }).then(load)} className="flex items-center gap-1 rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-400"><X className="h-3 w-3" /> Reject</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Internal notes */}
            <div className="card-dark p-4">
              <h3 className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold text-white"><Lock className="h-3.5 w-3.5 text-amber-400" /> Internal notes <span className="text-xs font-normal text-slate-500">(staff only)</span></h3>
              <div className="flex gap-2">
                <input data-testid="note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" className="flex-1 rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200" />
                <button data-testid="add-note-btn" onClick={addNote} disabled={busy} className="btn-teal rounded-lg px-3 text-sm"><Send className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 space-y-2">
                {data.notes.length === 0 ? <p className="text-xs text-slate-500">No internal notes yet.</p> : data.notes.map((n) => (
                  <div key={n.id} className="rounded-lg bg-[#0B1220] p-2 text-xs"><span className="text-slate-300">{n.note}</span><div className="text-[10px] text-slate-500">{n.author_name} · {new Date(n.created_at).toLocaleString()}</div></div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-6">
            <div className="card-dark p-4">
              <h3 className="mb-3 font-display text-sm font-semibold text-white">Advance status</h3>
              {transitions.length === 0 ? <p className="text-xs text-slate-500">No further transitions available.</p> : (
                <div className="space-y-2">
                  {transitions.map((t) => (
                    <button key={t} data-testid={`transition-${t}`} disabled={busy} onClick={() => {
                      if (t === "resolved") { const rn = window.prompt("Resolution note:"); if (rn) changeStatus("resolved", rn); }
                      else changeStatus(t);
                    }} className="w-full rounded-lg border border-[#1E2C4A] px-3 py-2 text-left text-sm text-slate-200 hover:border-[#19C3C9]">→ {STATUS_META[t]?.label || t}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="card-dark p-4">
              <h3 className="mb-3 font-display text-sm font-semibold text-white">Assign department</h3>
              <select data-testid="assign-dept-select" value={dept} onChange={(e) => setDept(e.target.value)} className="w-full rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200">
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
              </select>
              <button data-testid="assign-btn" onClick={assign} disabled={busy} className="btn-teal mt-2 w-full rounded-lg py-2 text-sm font-bold">Assign</button>
              {inc.assigned_department && <p className="mt-2 text-xs text-slate-400">Currently: {departments.find((d) => d.key === inc.assigned_department)?.name || inc.assigned_department}</p>}
            </div>

            <div className="card-dark p-4">
              <h3 className="mb-2 font-display text-sm font-semibold text-white">Stats</h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div><div className="font-display text-lg font-bold text-white">{data.reports.length}</div><div className="text-slate-400">Reports</div></div>
                <div><div className="font-display text-lg font-bold text-white">{inc.confirmation_count}</div><div className="text-slate-400">Confirms</div></div>
                <div><div className="font-display text-lg font-bold text-white">{inc.follower_count}</div><div className="text-slate-400">Followers</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
