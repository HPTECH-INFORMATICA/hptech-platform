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
      aria-busy={isMoving}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", lead.id);
      }}
      className="rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-4 shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] hover:border-hp-primary hover:shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-hp-foreground">
            {lead.name}
          </h3>
          {lead.interest && (
            <p className="mt-1 line-clamp-2 text-sm text-hp-muted">
              {lead.interest}
            </p>
          )}
        </div>

        <span
          className="cursor-grab select-none text-hp-subtle"
          aria-hidden="true"
        >
          ⋮⋮
        </span>
      </div>

      {contact && (
        <p className="mt-3 truncate text-sm text-hp-muted">{contact}</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="truncate text-xs font-medium uppercase tracking-wide text-hp-subtle">
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
          className="min-h-11 max-w-40 rounded-[var(--radius-md)] border border-hp-border-strong bg-hp-surface px-3 text-xs text-hp-foreground transition-colors duration-[var(--duration-fast)] hover:border-hp-primary focus:border-hp-primary disabled:cursor-wait disabled:opacity-60"
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
