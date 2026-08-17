"use client";

import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import type { Lead, LeadStatus } from "@/types/lead";

type LeadRowProps = {
  lead: Lead;
  canUpdate: boolean;
  statusLabels: Record<LeadStatus, string>;
  isMoving: boolean;
  onMove: (lead: Lead, status: LeadStatus) => void;
};

export default function LeadRow({
  lead,
  canUpdate,
  statusLabels,
  isMoving,
  onMove,
}: LeadRowProps) {
  const contact = lead.whatsapp ?? lead.phone ?? lead.email;
  const statusOptions = Object.entries(statusLabels).map(([status, label]) => ({
    value: status,
    label,
  }));

  return (
    <article
      draggable={canUpdate && !isMoving}
      aria-busy={isMoving}
      onDragStart={(event) => {
        if (!canUpdate) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", lead.id);
      }}
      className="rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-4 shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] hover:border-hp-primary hover:shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate font-semibold text-hp-foreground">
            {lead.name}
          </h4>
          {lead.interest && (
            <p className="mt-1 line-clamp-2 text-sm text-hp-muted">
              {lead.interest}
            </p>
          )}
        </div>

        {canUpdate && (
          <span
            className="cursor-grab select-none text-hp-subtle"
            aria-hidden="true"
          >
            ⋮⋮
          </span>
        )}
      </div>

      {contact && (
        <p className="mt-3 truncate text-sm text-hp-muted">{contact}</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <Badge variant="neutral" size="sm" className="min-w-0 truncate">
          {lead.source || "Sem origem"}
        </Badge>

        <Select
          id={`lead-status-${lead.id}`}
          label={<span className="sr-only">Estágio de {lead.name}</span>}
          value={lead.pipeline_status}
          disabled={!canUpdate || isMoving}
          onChange={(event) =>
            onMove(lead, event.target.value as LeadStatus)
          }
          options={statusOptions}
          className="max-w-40"
          selectClassName="text-xs"
        />
      </div>
    </article>
  );
}
