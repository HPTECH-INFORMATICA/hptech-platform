import type { Lead, LeadKanban, LeadStatus } from "@/types/lead";

export type LeadWriteInput = {
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  source: string | null;
  interest: string | null;
  notes: string | null;
};

export class LeadApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/leads${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new LeadApiError(
      response.status,
      body?.detail ?? body?.error ?? "Não foi possível concluir a operação.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

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
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Erro ao atualizar o estágio do lead: ${response.status}`,
    );
  }
}

export function createLead(data: LeadWriteInput) {
  return request<Lead>("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateLead(leadId: string, data: LeadWriteInput) {
  return request<Lead>(`/${encodeURIComponent(leadId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteLead(leadId: string) {
  return request<void>(`/${encodeURIComponent(leadId)}`, {
    method: "DELETE",
  });
}
