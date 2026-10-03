import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, LogOut } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="mx-auto max-w-xl p-5 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-white">Profile</h1>
        <div className="card-dark mt-6 p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-[#17233B] text-2xl font-bold text-slate-200">
              {user?.picture ? <img src={user.picture} alt="" className="h-full w-full object-cover" /> : user?.name?.[0]}
            </div>
            <div>
              <div className="font-display text-lg font-semibold text-white">{user?.name}</div>
              <div className="flex items-center gap-1 text-sm text-slate-400"><Mail className="h-3.5 w-3.5" /> {user?.email}</div>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-[#1E2C4A] px-4 py-3">
              <span className="flex items-center gap-2 text-slate-300"><Shield className="h-4 w-4 text-[#19C3C9]" /> Role</span>
              <span className="font-semibold capitalize text-white">{user?.role}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#1E2C4A] px-4 py-3">
              <span className="text-slate-300">Account status</span>
              <span className="capitalize text-emerald-400">{user?.status}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#1E2C4A] px-4 py-3">
              <span className="text-slate-300">In-app notifications</span>
              <span className="text-slate-200">Enabled</span>
            </div>
            <p className="text-xs text-slate-500">External email/SMS delivery is not connected in this prototype — notifications are delivered in-app.</p>
          </div>
          <button data-testid="profile-logout" onClick={async () => { await logout(); navigate("/"); }} className="mt-6 flex items-center gap-2 rounded-lg border border-[#1E2C4A] px-4 py-2 text-sm text-slate-300 hover:text-white"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </div>
    </AppShell>
  );
}
