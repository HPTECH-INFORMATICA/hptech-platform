import type { LeadKanban, LeadStatus } from "@/types/lead";

export async function getLeadKanban(): Promise<LeadKanban> {
  const response = await fetch("/api/leads/kanban", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Erro ao carregar o Kanban de leads: ${response.status}`,
    );
  }

  return response.json() as Promise<LeadKanban>;
}

export async function updateLeadPipeline(
  leadId: string,
  pipelineStatus: LeadStatus,
): Promise<void> {
  const response = await fetch(
    `/api/leads/${encodeURIComponent(leadId)}/pipeline`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        pipeline_status: pipelineStatus,
        user_id: null,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Erro ao atualizar o estágio do lead: ${response.status}`,
    );
  }
}
