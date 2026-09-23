export type FinancialTransactionType = "INCOME" | "EXPENSE";
export type FinancialTransactionStatus = "PENDING" | "PAID" | "CANCELED";

export type FinancialTransactionData = {
  id: string;
  lead_id: string | null;
  appointment_id: string | null;
  description: string;
  transaction_type: FinancialTransactionType;
  category: string | null;
  amount: string;
  due_date: string;
  paid_date: string | null;
  status: FinancialTransactionStatus;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialTransactionList = {
  items: FinancialTransactionData[];
  total: number;
  page: number;
  page_size: number;
};

export type FinancialTransactionCreateInput = {
  transaction_type: FinancialTransactionType;
  description: string;
  amount: string;
  due_date: string;
  category: string | null;
  lead_id: string | null;
  appointment_id: string | null;
  notes: string | null;
};

export type FinancialTransactionUpdateInput = Pick<
  FinancialTransactionCreateInput,
  "description" | "amount" | "due_date" | "category" | "notes"
>;

export type FinancialTransactionPaymentInput = {
  paid_date: string;
  payment_method: string;
};

export class FinancialApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as
    | { detail?: string; error?: string }
    | null;
  throw new FinancialApiError(
    response.status,
    body?.detail ?? body?.error ?? "Não foi possível concluir a operação.",
  );
}

async function requestTransaction(
  path: string,
  init?: RequestInit,
): Promise<FinancialTransactionData> {
  const response = await fetch(`/api/financial/transactions${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) return parseError(response);
  return response.json() as Promise<FinancialTransactionData>;
}

export async function listFinancialTransactions(
  params: URLSearchParams,
): Promise<FinancialTransactionList> {
  const response = await fetch(
    `/api/financial/transactions?${params.toString()}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  if (!response.ok) return parseError(response);
  return response.json() as Promise<FinancialTransactionList>;
}

export function createFinancialTransaction(
  data: FinancialTransactionCreateInput,
) {
  return requestTransaction("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateFinancialTransaction(
  id: string,
  data: FinancialTransactionUpdateInput,
) {
  return requestTransaction(`/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function payFinancialTransaction(
  id: string,
  data: FinancialTransactionPaymentInput,
) {
  return requestTransaction(`/${encodeURIComponent(id)}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function cancelFinancialTransaction(id: string) {
  return requestTransaction(`/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

export async function deleteFinancialTransaction(id: string): Promise<void> {
  const response = await fetch(
    `/api/financial/transactions/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!response.ok) return parseError(response);
}
