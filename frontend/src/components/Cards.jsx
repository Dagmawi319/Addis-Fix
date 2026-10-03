import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Users } from "lucide-react";
import { StatusBadge, SeverityBadge } from "@/components/common/Badges";
import { DemoBadge } from "@/components/common/Primitives";
import { fileRawUrl } from "@/lib/api";
import { categoryIcon } from "@/lib/constants";

export function IncidentCard({ incident, onClick, compact = false }) {
  const navigate = useNavigate();
  const Icon = categoryIcon(incident.category);
  const handle = () => (onClick ? onClick(incident) : navigate(`/incidents/${incident.incident_id}`));
  return (
    <button
      data-testid={`incident-card-${incident.incident_id}`}
      onClick={handle}
      className="card-dark card-hover-lift w-full text-left p-3 flex gap-3 items-start"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#0B1220] grid place-items-center">
        {incident.representative_image_id ? (
          <img src={fileRawUrl(incident.representative_image_id)} alt={incident.title} className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-6 w-6 text-slate-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate font-semibold text-slate-100 text-sm">{incident.title}</h4>
          {incident.is_demo && <DemoBadge />}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="h-3 w-3" /> <span className="truncate">{incident.location_description || "Addis Ababa"}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={incident.status} />
          <SeverityBadge severity={incident.severity} />
          {!compact && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Users className="h-3 w-3" />{(incident.report_ids?.length ?? incident.report_count ?? 0)} reports
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ReportCard({ report }) {
  const navigate = useNavigate();
  const Icon = categoryIcon(report.category);
  return (
    <button
      data-testid={`report-card-${report.report_id}`}
      onClick={() => report.incident_id && navigate(`/incidents/${report.incident_id}`)}
      className="card-dark card-hover-lift w-full text-left p-3 flex gap-3 items-start"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#0B1220] grid place-items-center">
        {report.image_ids?.[0] ? (
          <img src={fileRawUrl(report.image_ids[0])} alt={report.title} className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-6 w-6 text-slate-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-semibold text-slate-100 text-sm">{report.title}</h4>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="h-3 w-3" /> <span className="truncate">{report.location_description || "Addis Ababa"}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={report.status} />
          <SeverityBadge severity={report.severity} />
          <span className="text-[11px] text-slate-500">{new Date(report.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </button>
  );
}
