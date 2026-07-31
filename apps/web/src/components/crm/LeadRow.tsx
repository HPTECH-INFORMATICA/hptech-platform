"use client";

import type { Lead, LeadStatus } from "@/types/lead";

type LeadRowProps = {
  lead: Lead;
  statusLabels: Record<LeadStatus, string>;
  isMoving: boolean;
  onMove: (lead: Lead, status: LeadStatus) => void;
};

export default function LeadRow({
  lead,
  statusLabels,
  isMoving,
  onMove,
}: LeadRowProps) {
  const contact = lead.whatsapp ?? lead.phone ?? lead.email;

  return (
    <article
      draggable={!isMoving}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", lead.id);
      }}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{lead.name}</h3>
          {lead.interest && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
              {lead.interest}
            </p>
          )}
        </div>

        <span
          className="cursor-grab select-none text-slate-400"
          aria-hidden="true"
        >
          ⋮⋮
        </span>
      </div>

      {contact && (
        <p className="mt-3 truncate text-sm text-slate-500">{contact}</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
          {lead.source || "Sem origem"}
        </span>

        <label className="sr-only" htmlFor={`lead-status-${lead.id}`}>
          Estágio de {lead.name}
        </label>
        <select
          id={`lead-status-${lead.id}`}
          value={lead.pipeline_status}
          disabled={isMoving}
          onChange={(event) =>
            onMove(lead, event.target.value as LeadStatus)
          }
          className="max-w-32 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 disabled:cursor-wait disabled:opacity-60"
        >
          {Object.entries(statusLabels).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
