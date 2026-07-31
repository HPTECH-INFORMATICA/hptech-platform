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
  NEW: "border-t-blue-500",
  CONTACTED: "border-t-cyan-500",
  QUALIFIED: "border-t-violet-500",
  PROPOSAL: "border-t-amber-500",
  WON: "border-t-emerald-500",
  LOST: "border-t-rose-500",
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
    <div className="overflow-x-auto pb-4">
      <div className="grid min-w-[1200px] grid-cols-6 gap-4">
        {STATUSES.map((status) => (
          <section
            key={status}
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
            className={`min-h-96 rounded-xl border border-slate-200 border-t-4 bg-slate-50 p-3 ${STATUS_ACCENTS[status]}`}
          >
            <header className="mb-3 flex items-center justify-between gap-2 px-1">
              <h2 className="font-semibold text-slate-800">
                {STATUS_LABELS[status]}
              </h2>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
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
                <div className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-400">
                  Arraste um lead para cá
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
