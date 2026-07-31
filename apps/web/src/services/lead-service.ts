import type { LeadKanban, LeadStatus } from "@/types/lead";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID;

function validateEnvironment(): void {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não está configurada.");
  }

  if (!COMPANY_ID) {
    throw new Error("NEXT_PUBLIC_COMPANY_ID não está configurada.");
  }
}

export async function getLeadKanban(): Promise<LeadKanban> {
  validateEnvironment();

  const response = await fetch(
    `${API_URL}/leads/kanban?company_id=${COMPANY_ID}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

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
  validateEnvironment();

  const response = await fetch(
    `${API_URL}/leads/${leadId}/pipeline?company_id=${COMPANY_ID}`,
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