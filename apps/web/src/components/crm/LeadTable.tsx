"use client";

import LeadRow from "./LeadRow";
import Badge from "@/components/ui/Badge";
import type { Lead, LeadKanban, LeadStatus } from "@/types/lead";

const STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Novos",
  CONTACTED: "Contatados",
  QUALIFIED: "Qualificados",
  PROPOSAL: "Proposta",
  WON: "Ganhos",
  LOST: "Perdidos",
};

const STATUS_ACCENTS: Record<LeadStatus, string> = {
  NEW: "border-t-hp-primary",
  CONTACTED: "border-t-hp-secondary",
  QUALIFIED: "border-t-hp-info",
  PROPOSAL: "border-t-hp-warning",
  WON: "border-t-hp-success",
  LOST: "border-t-hp-danger",
};

type LeadTableProps = {
  kanban: LeadKanban;
  canUpdate: boolean;
  movingLeadId: string | null;
  onMove: (lead: Lead, status: LeadStatus) => void;
};

export default function LeadTable({
  kanban,
  canUpdate,
  movingLeadId,
  onMove,
}: LeadTableProps) {
  const leadsById = new Map(
    STATUSES.flatMap((status) => kanban[status]).map((lead) => [
      lead.id,
      lead,
    ]),
  );

  return (
    <div>
      <p id="kanban-scroll-hint" className="mb-3 text-sm text-hp-muted lg:hidden">
        Deslize horizontalmente para visualizar todos os estágios.
      </p>
      <div
        role="region"
        aria-label="Kanban do pipeline comercial"
        aria-describedby="kanban-scroll-hint"
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-[var(--radius-md)] pb-4 [scrollbar-gutter:stable]"
      >
        <div className="grid w-max grid-flow-col auto-cols-[minmax(17rem,20rem)] gap-4">
          {STATUSES.map((status) => (
            <section
              key={status}
              aria-labelledby={`kanban-${status}-title`}
              onDragOver={(event) => {
                if (!canUpdate) {
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                if (!canUpdate) {
                  return;
                }
                event.preventDefault();
                const lead = leadsById.get(
                  event.dataTransfer.getData("text/plain"),
                );

                if (lead) {
                  onMove(lead, status);
                }
              }}
              className={`min-h-96 rounded-[var(--radius-lg)] border border-hp-border border-t-4 bg-hp-surface-subtle p-3 ${STATUS_ACCENTS[status]}`}
            >
              <header className="mb-3 flex items-center justify-between gap-2 px-1">
                <h3
                  id={`kanban-${status}-title`}
                  className="font-semibold text-hp-foreground"
                >
                  {STATUS_LABELS[status]}
                </h3>
                <Badge variant="neutral" size="sm">
                  {kanban[status].length}
                </Badge>
              </header>

              <div className="space-y-3">
                {kanban[status].map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    canUpdate={canUpdate}
                    statusLabels={STATUS_LABELS}
                    isMoving={movingLeadId === lead.id}
                    onMove={onMove}
                  />
                ))}

                {kanban[status].length === 0 && (
                  <div className="rounded-[var(--radius-lg)] border border-dashed border-hp-border-strong px-3 py-8 text-center text-sm text-hp-subtle">
                    {canUpdate
                      ? "Nenhum lead neste estágio. Arraste um lead para cá ou use o seletor de estágio."
                      : "Nenhum lead neste estágio."}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
