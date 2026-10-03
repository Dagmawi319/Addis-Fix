import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, Building2, Users, ScrollText, Tag,
  TrendingUp, Plus, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { StatusBadge, SeverityBadge } from "@/components/common/Badges";
import { Loader, EmptyState } from "@/components/common/Primitives";
import api, { formatApiError } from "@/lib/api";

const TABS = [
  { key: "overview", label: "Dashboard", icon: LayoutDashboard },
  { key: "incidents", label: "Incidents", icon: ClipboardList },
  { key: "users", label: "Users", icon: Users },
  { key: "departments", label: "Departments", icon: Building2 },
  { key: "categories", label: "Categories", icon: Tag },
  { key: "audit", label: "Audit Logs", icon: ScrollText },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  return (
    <AppShell>
      <div className="p-5 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-white">Admin</h1>
        <p className="text-sm text-slate-400">System configuration, management and real statistics.</p>
        <div className="mt-5 flex flex-wrap gap-2 border-b border-[#1E2C4A] pb-3">
          {TABS.map((t) => (
            <button key={t.key} data-testid={`admin-tab-${t.key}`} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${tab === t.key ? "bg-[#17233B] text-white" : "text-slate-400 hover:text-white"}`}><t.icon className="h-4 w-4" /> {t.label}</button>
          ))}
        </div>
        <div className="mt-6">
          {tab === "overview" && <Overview />}
          {tab === "incidents" && <IncidentsAdmin />}
          {tab === "users" && <UsersAdmin />}
          {tab === "departments" && <DeptAdmin />}
          {tab === "categories" && <CatAdmin />}
          {tab === "audit" && <AuditAdmin />}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, delta }) {
  return (
    <div className="card-dark p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold text-white">{value}</div>
      {delta != null && <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400"><TrendingUp className="h-3 w-3" /> {delta} this week</div>}
    </div>
  );
}

function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => setStats(false)); }, []);
  if (stats === null) return <Loader />;
  if (stats === false) return <EmptyState title="Unable to load statistics" />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Incidents" value={stats.total_incidents} delta={stats.new_this_week} />
        <StatCard label="Open" value={stats.open} />
        <StatCard label="In Progress" value={stats.in_progress} />
        <StatCard label="Resolved" value={stats.resolved} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Users" value={stats.total_users} />
        <StatCard label="Reports" value={stats.total_reports} />
      </div>
      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-white">Priority incidents</h3>
        {stats.priority_incidents.length === 0 ? <EmptyState title="No active incidents" /> : (
          <div className="card-dark overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E2C4A] text-left text-xs text-slate-400"><th className="px-4 py-2.5">Incident</th><th className="px-4 py-2.5">Reports</th><th className="px-4 py-2.5">Severity</th><th className="px-4 py-2.5">Status</th></tr></thead>
              <tbody>
                {stats.priority_incidents.map((i) => (
                  <tr key={i.incident_id} className="cursor-pointer border-b border-[#1E2C4A]/60 hover:bg-[#17233B]" onClick={() => navigate(`/incidents/${i.incident_id}`)}>
                    <td className="px-4 py-3"><span className="font-mono text-xs text-[#19C3C9]">{i.code}</span> <span className="text-slate-200">{i.title}</span></td>
                    <td className="px-4 py-3 text-slate-300">{i.report_count}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={i.severity} /></td>
                    <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function IncidentsAdmin() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { api.get(`/incidents?limit=100${q ? `&q=${q}` : ""}`).then(({ data }) => setItems(data.items)).catch(() => setItems([])); }, [q]);
  return (
    <div>
      <input data-testid="admin-incident-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search incidents…" className="mb-4 w-full max-w-sm rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200" />
      {items === null ? <Loader /> : items.length === 0 ? <EmptyState title="No incidents" /> : (
        <div className="card-dark overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1E2C4A] text-left text-xs text-slate-400"><th className="px-4 py-2.5">Code</th><th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Severity</th><th className="px-4 py-2.5">Status</th></tr></thead>
            <tbody>{items.map((i) => (
              <tr key={i.incident_id} className="cursor-pointer border-b border-[#1E2C4A]/60 hover:bg-[#17233B]" onClick={() => navigate(`/incidents/${i.incident_id}`)}>
                <td className="px-4 py-3 font-mono text-xs text-[#19C3C9]">{i.code}</td><td className="px-4 py-3 text-slate-200">{i.title}</td><td className="px-4 py-3 text-slate-300">{i.category}</td><td className="px-4 py-3"><SeverityBadge severity={i.severity} /></td><td className="px-4 py-3"><StatusBadge status={i.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsersAdmin() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const load = () => api.get(`/admin/users${q ? `?q=${q}` : ""}`).then(({ data }) => setUsers(data)).catch(() => setUsers([]));
  useEffect(() => { load(); }, [q]);
  const setRole = async (id, role) => { try { await api.patch(`/admin/users/${id}/role`, { role }); toast.success("Role updated"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  const setStatus = async (id, status) => { try { await api.patch(`/admin/users/${id}/status`, { status }); toast.success("Status updated"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  return (
    <div>
      <input data-testid="admin-user-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="mb-4 w-full max-w-sm rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200" />
      {users === null ? <Loader /> : (
        <div className="card-dark overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1E2C4A] text-left text-xs text-slate-400"><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5">Status</th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.user_id} className="border-b border-[#1E2C4A]/60">
                <td className="px-4 py-3 text-slate-200">{u.name}{u.is_demo && <span className="ml-1 text-[10px] text-amber-400">DEMO</span>}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3">
                  <select data-testid={`role-select-${u.user_id}`} value={u.role} onChange={(e) => setRole(u.user_id, e.target.value)} className="rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-2 py-1 text-xs text-slate-200">
                    <option value="citizen">citizen</option><option value="authority">authority</option><option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button data-testid={`toggle-status-${u.user_id}`} onClick={() => setStatus(u.user_id, u.status === "active" ? "disabled" : "active")} className={`rounded-lg px-2 py-1 text-xs ${u.status === "active" ? "text-emerald-400 border border-emerald-500/30" : "text-red-400 border border-red-500/30"}`}>{u.status}</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CrudList({ kind, endpoint, extraField }) {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ name: "", color: "#19C3C9", description: "" });
  const load = () => api.get(`/${endpoint}?all=true`).then(({ data }) => setItems(data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!form.name) return;
    try { await api.post(`/${endpoint}`, form); setForm({ name: "", color: "#19C3C9", description: "" }); toast.success(`${kind} created`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const toggle = async (it) => {
    try { await api.put(`/${endpoint}/${it.key}`, { ...it, active: !it.active }); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <div>
      <div className="card-dark mb-4 flex flex-wrap items-end gap-2 p-4">
        <div><label className="mb-1 block text-xs text-slate-400">Name</label><input data-testid={`${kind}-name-input`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200" /></div>
        {extraField === "color" && <div><label className="mb-1 block text-xs text-slate-400">Color</label><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-14 rounded border border-[#1E2C4A] bg-[#0B1220]" /></div>}
        {extraField === "description" && <div className="flex-1"><label className="mb-1 block text-xs text-slate-400">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200" /></div>}
        <button data-testid={`${kind}-create-btn`} onClick={create} className="btn-teal inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-bold"><Plus className="h-4 w-4" /> Add</button>
      </div>
      {items === null ? <Loader /> : (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((it) => (
            <div key={it.key} className="card-dark flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-sm text-slate-200">{it.color && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: it.color }} />}{it.name}</span>
              <button data-testid={`toggle-${kind}-${it.key}`} onClick={() => toggle(it)} className={`rounded-lg px-2 py-1 text-xs ${it.active ? "text-emerald-400 border border-emerald-500/30" : "text-slate-500 border border-[#1E2C4A]"}`}>{it.active ? "Active" : "Disabled"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeptAdmin() { return <CrudList kind="department" endpoint="departments" extraField="description" />; }
function CatAdmin() { return <CrudList kind="category" endpoint="categories" extraField="color" />; }

function AuditAdmin() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { api.get(`/admin/audit-logs?limit=100${q ? `&q=${q}` : ""}`).then(({ data }) => setData(data)).catch(() => setData({ items: [] })); }, [q]);
  return (
    <div>
      <input data-testid="audit-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by actor or target…" className="mb-4 w-full max-w-sm rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200" />
      {data === null ? <Loader /> : data.items.length === 0 ? <EmptyState icon={ScrollText} title="No audit logs" /> : (
        <div className="card-dark overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1E2C4A] text-left text-xs text-slate-400"><th className="px-4 py-2.5">Time</th><th className="px-4 py-2.5">Actor</th><th className="px-4 py-2.5">Action</th><th className="px-4 py-2.5">Target</th></tr></thead>
            <tbody>{data.items.map((l) => (
              <tr key={l.id} className="border-b border-[#1E2C4A]/60">
                <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-slate-300">{l.actor_name} <span className="text-[10px] text-slate-500">({l.actor_role})</span></td>
                <td className="px-4 py-2.5"><span className="font-mono text-xs text-[#19C3C9]">{l.action}</span></td>
                <td className="px-4 py-2.5 text-xs text-slate-400">{l.target_type}:{l.target_id?.slice(0, 12)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
