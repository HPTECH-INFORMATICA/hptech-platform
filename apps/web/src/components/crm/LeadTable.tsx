"use client";

import LeadRow from "./LeadRow";
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
  movingLeadId: string | null;
  onMove: (lead: Lead, status: LeadStatus) => void;
};

export default function LeadTable({
  kanban,
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
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
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
                <h2
                  id={`kanban-${status}-title`}
                  className="font-semibold text-hp-foreground"
                >
                  {STATUS_LABELS[status]}
                </h2>
                <span className="rounded-full border border-hp-border bg-hp-surface-elevated px-2 py-0.5 text-xs font-semibold text-hp-muted">
                  {kanban[status].length}
                </span>
              </header>

              <div className="space-y-3">
                {kanban[status].map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    statusLabels={STATUS_LABELS}
                    isMoving={movingLeadId === lead.id}
                    onMove={onMove}
                  />
                ))}

                {kanban[status].length === 0 && (
                  <div className="rounded-[var(--radius-lg)] border border-dashed border-hp-border-strong px-3 py-8 text-center text-sm text-hp-subtle">
                    Nenhum lead neste estágio. Arraste um lead para cá ou use o
                    seletor de estágio.
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
