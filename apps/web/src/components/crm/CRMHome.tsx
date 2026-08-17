"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import LeadFilters from "./LeadFilters";
import LeadSearch from "./LeadSearch";
import LeadTable from "./LeadTable";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Skeleton from "@/components/ui/Skeleton";
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

type CRMHomeProps = {
  canUpdate: boolean;
};

export default function CRMHome({ canUpdate }: CRMHomeProps) {
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

  const hasLeads = STATUSES.some((status) => kanban[status].length > 0);
  const hasFilteredLeads = STATUSES.some(
    (status) => filteredKanban[status].length > 0,
  );

  const handleMove = useCallback(
    async (lead: Lead, targetStatus: LeadStatus) => {
      if (!canUpdate || lead.pipeline_status === targetStatus || movingLeadId) {
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
    [canUpdate, movingLeadId],
  );

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-full space-y-6 overflow-hidden"
      >
        <span className="sr-only">Carregando Kanban...</span>
        <Skeleton height={76} radius="lg" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton height={44} className="flex-1" />
          <Skeleton height={44} className="w-full sm:w-52" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {STATUSES.map((status) => (
            <div key={status} className="space-y-3">
              <Skeleton height={40} />
              <Skeleton height={112} />
              <Skeleton height={112} />
            </div>
          ))}
        </div>
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
        <Alert
          variant="danger"
          live="assertive"
          description={error}
          action={
            <Button variant="outline" onClick={() => void loadKanban()}>
              Tentar novamente
            </Button>
          }
        />
      )}

      <Section title="Funil comercial">
        {!hasLeads ? (
          <EmptyState
            title="Nenhum lead encontrado"
            description="Ainda não existem leads no funil comercial."
            titleAs="h3"
          />
        ) : !hasFilteredLeads ? (
          <EmptyState
            title="Nenhum resultado encontrado"
            description="A busca ou o filtro atual não encontrou leads."
            titleAs="h3"
          />
        ) : (
          <LeadTable
            kanban={filteredKanban}
            canUpdate={canUpdate}
            movingLeadId={movingLeadId}
            onMove={handleMove}
          />
        )}
      </Section>
    </div>
  );
}
