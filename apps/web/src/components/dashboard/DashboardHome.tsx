"use client";

import { useCallback, useEffect, useState } from "react";

import StatsGrid, { type DashboardStat } from "./StatsGrid";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Skeleton from "@/components/ui/Skeleton";
import { getLeadKanban } from "@/services/lead-service";
import type { LeadKanban, LeadStatus } from "@/types/lead";

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
  PROPOSAL: "Propostas",
  WON: "Ganhos",
  LOST: "Perdidos",
};

export default function DashboardHome() {
  const [kanban, setKanban] = useState<LeadKanban | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setKanban(await getLeadKanban());
    } catch {
      setKanban(null);
      setError("Não foi possível carregar os indicadores do CRM.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    void getLeadKanban()
      .then((data) => {
        if (isActive) {
          setKanban(data);
        }
      })
      .catch(() => {
        if (isActive) {
          setKanban(null);
          setError("Não foi possível carregar os indicadores do CRM.");
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

  const totalLeads = kanban
    ? STATUSES.reduce((total, status) => total + kanban[status].length, 0)
    : 0;
  const stats: DashboardStat[] = kanban
    ? [
        { label: "Total de leads", value: totalLeads },
        ...STATUSES.map((status) => ({
          label: STATUS_LABELS[status],
          value: kanban[status].length,
        })),
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação comercial."
      />

      <Section title="Indicadores comerciais">
        {isLoading ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">Carregando indicadores do CRM...</span>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 7 }, (_, index) => (
                <Skeleton key={index} height={112} radius="lg" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Alert
            variant="danger"
            live="assertive"
            description={error}
            action={
              <Button variant="outline" onClick={() => void loadDashboard()}>
                Tentar novamente
              </Button>
            }
          />
        ) : kanban && totalLeads === 0 ? (
          <EmptyState
            title="Nenhum lead encontrado"
            description="Ainda não existem leads para compor os indicadores comerciais."
            titleAs="h3"
          />
        ) : (
          <StatsGrid stats={stats} />
        )}
      </Section>
    </div>
  );
}
