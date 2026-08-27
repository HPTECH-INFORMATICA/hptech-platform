"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import LeadPatientDialog from "./LeadPatientDialog";
import type { Lead, LeadStatus } from "@/types/lead";

type LeadRowProps = {
  lead: Lead;
  canUpdate: boolean;
  canDelete: boolean;
  canViewPatients: boolean;
  canCreatePatient: boolean;
  canLinkPatient: boolean;
  canUnlinkPatient: boolean;
  statusLabels: Record<LeadStatus, string>;
  isMoving: boolean;
  onMove: (lead: Lead, status: LeadStatus) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
};

export default function LeadRow({
  lead,
  canUpdate,
  canDelete,
  canViewPatients,
  canCreatePatient,
  canLinkPatient,
  canUnlinkPatient,
  statusLabels,
  isMoving,
  onMove,
  onEdit,
  onDelete,
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

      {canViewPatients || canUpdate || canDelete ? (
        <div
          className="mt-3 flex flex-wrap justify-end gap-2 border-t border-hp-border pt-3"
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {canUpdate ? (
            <Button size="sm" variant="ghost" onClick={() => onEdit(lead)}>
              Editar
            </Button>
          ) : null}
          {canViewPatients ? (
            <LeadPatientDialog
              lead={lead}
              canCreate={canCreatePatient}
              canLink={canLinkPatient}
              canUnlink={canUnlinkPatient}
            />
          ) : null}
          {canDelete ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDelete(lead)}
            >
              Remover
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
