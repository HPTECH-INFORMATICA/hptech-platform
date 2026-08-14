"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import LeadFilters from "./LeadFilters";
import LeadSearch from "./LeadSearch";
import LeadTable from "./LeadTable";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import {
  getLeadKanban,
  updateLeadPipeline,
} from "@/services/lead-service";
import type { Lead, LeadKanban, LeadStatus } from "@/types/lead";

const EMPTY_KANBAN: LeadKanban = {
  NEW: [],
  CONTACTED: [],
  QUALIFIED: [],
  PROPOSAL: [],
  WON: [],
  LOST: [],
};

const STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
];

function moveLead(
  kanban: LeadKanban,
  lead: Lead,
  targetStatus: LeadStatus,
): LeadKanban {
  const nextKanban = { ...kanban };

  for (const status of STATUSES) {
    nextKanban[status] = kanban[status].filter(
      (currentLead) => currentLead.id !== lead.id,
    );
  }

  nextKanban[targetStatus] = [
    { ...lead, pipeline_status: targetStatus },
    ...nextKanban[targetStatus],
  ];

  return nextKanban;
}

export default function CRMHome() {
  const [kanban, setKanban] = useState<LeadKanban>(EMPTY_KANBAN);
  const [search, setSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadKanban = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setKanban(await getLeadKanban());
    } catch {
      setError(
        "Não foi possível carregar o Kanban. Verifique a conexão e tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    getLeadKanban()
      .then((data) => {
        if (isActive) {
          setKanban(data);
        }
      })
      .catch(() => {
        if (isActive) {
          setError(
            "Não foi possível carregar o Kanban. Verifique a conexão e tente novamente.",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const sources = useMemo(
    () =>
      Array.from(
        new Set(
          STATUSES.flatMap((status) =>
            kanban[status]
              .map((lead) => lead.source)
              .filter((source): source is string => Boolean(source)),
          ),
        ),
      ).sort((first, second) => first.localeCompare(second, "pt-BR")),
    [kanban],
  );

  const filteredKanban = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    const result = { ...EMPTY_KANBAN };

    for (const status of STATUSES) {
      result[status] = kanban[status].filter((lead) => {
        const matchesSource =
          !selectedSource || lead.source === selectedSource;
        const searchableContent = [
          lead.name,
          lead.phone,
          lead.whatsapp,
          lead.email,
          lead.interest,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR");

        return (
          matchesSource &&
          (!normalizedSearch || searchableContent.includes(normalizedSearch))
        );
      });
    }

    return result;
  }, [kanban, search, selectedSource]);

  const handleMove = useCallback(
    async (lead: Lead, targetStatus: LeadStatus) => {
      if (lead.pipeline_status === targetStatus || movingLeadId) {
        return;
      }

      const previousStatus = lead.pipeline_status;

      setMovingLeadId(lead.id);
      setError(null);
      setKanban((currentKanban) =>
        moveLead(currentKanban, lead, targetStatus),
      );

      try {
        await updateLeadPipeline(lead.id, targetStatus);
      } catch {
        setKanban((currentKanban) =>
          moveLead(
            currentKanban,
            { ...lead, pipeline_status: targetStatus },
            previousStatus,
          ),
        );
        setError(
          `Não foi possível mover ${lead.name}. O estágio anterior foi restaurado.`,
        );
      } finally {
        setMovingLeadId(null);
      }
    },
    [movingLeadId],
  );

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-80 items-center justify-center text-hp-muted"
      >
        Carregando Kanban...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline comercial"
        description="Acompanhe os leads e mova cada oportunidade entre os estágios."
      />

      <Section title="Consulta de leads">
        <div className="flex flex-col gap-3 sm:flex-row">
          <LeadSearch value={search} onChange={setSearch} />
          <LeadFilters
            sources={sources}
            selectedSource={selectedSource}
            onSourceChange={setSelectedSource}
          />
        </div>
      </Section>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-hp-danger bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-hp-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadKanban()}
            className="inline-flex min-h-11 items-center self-start rounded-[var(--radius-md)] px-2 font-semibold underline underline-offset-2 sm:self-auto"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <Section title="Funil comercial">
        <LeadTable
          kanban={filteredKanban}
          movingLeadId={movingLeadId}
          onMove={handleMove}
        />
      </Section>
    </div>
  );
}
