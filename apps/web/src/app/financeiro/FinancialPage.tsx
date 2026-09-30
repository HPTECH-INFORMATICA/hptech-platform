"use client";

import { useEffect, useState, type FormEvent } from "react";

import { hasPermission, type CurrentUser } from "@/auth/types";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import Section from "@/components/ui/Section";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import useToast from "@/hooks/useToast";
import {
  cancelFinancialTransaction,
  createFinancialTransaction,
  deleteFinancialTransaction,
  FinancialApiError,
  getFinancialSummary,
  listFinancialTransactions,
  payFinancialTransaction,
  updateFinancialTransaction,
  type FinancialTransactionData,
  type FinancialTransactionType,
  type FinancialSummaryData,
} from "@/services/financial-service";

const PAGE_SIZE = 20;
const typeOptions = [
  { value: "", label: "Todos os tipos" },
  { value: "INCOME", label: "Receitas" },
  { value: "EXPENSE", label: "Despesas" },
];
const statusOptions = [
  { value: "", label: "Todos os status" },
  { value: "PENDING", label: "Pendente" },
  { value: "PAID", label: "Pago" },
  { value: "CANCELED", label: "Cancelado" },
];
const paymentMethodOptions = [
  { value: "", label: "Selecione" },
  { value: "PIX", label: "Pix" },
  { value: "CASH", label: "Dinheiro" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
  { value: "DEBIT_CARD", label: "Cartão de débito" },
  { value: "BANK_TRANSFER", label: "Transferência bancária" },
  { value: "OTHER", label: "Outro" },
];

type TransactionDraft = {
  transactionType: FinancialTransactionType;
  description: string;
  amount: string;
  dueDate: string;
  category: string;
  notes: string;
};

function emptyDraft(initialDate: string): TransactionDraft {
  return {
    transactionType: "INCOME",
    description: "",
    amount: "",
    dueDate: initialDate,
    category: "",
    notes: "",
  };
}

function draftFromTransaction(item: FinancialTransactionData): TransactionDraft {
  return {
    transactionType: item.transaction_type,
    description: item.description,
    amount: item.amount,
    dueDate: item.due_date,
    category: item.category ?? "",
    notes: item.notes ?? "",
  };
}

function optionalText(value: string): string | null {
  return value.trim() || null;
}

function errorMessage(error: unknown): string {
  if (!(error instanceof FinancialApiError)) return "Ocorreu um erro inesperado.";
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) return "Você não possui permissão para esta operação.";
  if (error.status === 404) return "O lançamento não foi encontrado nesta empresa.";
  if (error.status === 409) return error.message;
  if (error.status === 422) return "Revise os dados informados e tente novamente.";
  if (error.status >= 500) return "O serviço financeiro está temporariamente indisponível.";
  return error.message;
}

function formatMoney(value: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function StatusBadge({ item }: { item: FinancialTransactionData }) {
  if (item.status === "PAID") return <Badge variant="success">Pago</Badge>;
  if (item.status === "CANCELED") return <Badge variant="neutral">Cancelado</Badge>;
  return <Badge variant="warning">Pendente</Badge>;
}

function typeLabel(type: FinancialTransactionType): string {
  return type === "INCOME" ? "Receita" : "Despesa";
}

type FinancialPageProps = {
  currentUser: CurrentUser;
  initialDate: string;
};

export default function FinancialPage({ currentUser, initialDate }: FinancialPageProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<FinancialTransactionData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialTransactionData | null>(null);
  const [draft, setDraft] = useState(() => emptyDraft(initialDate));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [payTarget, setPayTarget] = useState<FinancialTransactionData | null>(null);
  const [paidDate, setPaidDate] = useState(initialDate);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cancelTarget, setCancelTarget] = useState<FinancialTransactionData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialTransactionData | null>(null);
  const [acting, setActing] = useState(false);

  const canCreate = hasPermission(currentUser, "FINANCIAL", "CREATE");
  const canUpdate = hasPermission(currentUser, "FINANCIAL", "UPDATE");
  const canDelete = hasPermission(currentUser, "FINANCIAL", "DELETE");
  const hasActions = canUpdate || canDelete;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filterError =
    dueFrom && dueTo && dueFrom > dueTo
      ? "A data inicial deve ser anterior à final."
      : null;

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (dueFrom) params.set("due_from", dueFrom);
    if (dueTo) params.set("due_to", dueTo);

    async function load() {
      setLoading(true);
      setLoadError(null);
      if (filterError) {
        if (active) setLoading(false);
        return;
      }
      try {
        const result = await listFinancialTransactions(params);
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
      } catch (error) {
        if (active) setLoadError(errorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [dueFrom, dueTo, filterError, page, reload, statusFilter, typeFilter]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (dueFrom) params.set("due_from", dueFrom);
    if (dueTo) params.set("due_to", dueTo);

    async function loadSummary() {
      setSummaryLoading(true);
      setSummaryError(null);
      if (filterError) {
        if (active) setSummaryLoading(false);
        return;
      }
      try {
        const result = await getFinancialSummary(params);
        if (active) setSummary(result);
      } catch (error) {
        if (active) setSummaryError(errorMessage(error));
      } finally {
        if (active) setSummaryLoading(false);
      }
    }
    void loadSummary();
    return () => { active = false; };
  }, [dueFrom, dueTo, filterError, reload]);

  function refresh(message: string) {
    toast({ variant: "success", description: message });
    setReload((value) => value + 1);
  }

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft(initialDate));
    setFormError(null);
    setEditorOpen(true);
  }

  function openEdit(item: FinancialTransactionData) {
    setEditing(item);
    setDraft(draftFromTransaction(item));
    setFormError(null);
    setEditorOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(draft.amount.replace(",", "."));
    if (!draft.description.trim()) return setFormError("Informe a descrição do lançamento.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Informe um valor maior que zero.");
    if (!draft.dueDate) return setFormError("Informe a data de vencimento.");

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateFinancialTransaction(editing.id, {
          description: draft.description.trim(),
          amount: amount.toFixed(2),
          due_date: draft.dueDate,
          category: optionalText(draft.category),
          notes: optionalText(draft.notes),
        });
        refresh("Lançamento atualizado.");
      } else {
        await createFinancialTransaction({
          transaction_type: draft.transactionType,
          description: draft.description.trim(),
          amount: amount.toFixed(2),
          due_date: draft.dueDate,
          category: optionalText(draft.category),
          lead_id: null,
          appointment_id: null,
          notes: optionalText(draft.notes),
        });
        refresh("Lançamento criado.");
      }
      setEditorOpen(false);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payTarget || !paidDate || !paymentMethod) return;
    setActing(true);
    try {
      await payFinancialTransaction(payTarget.id, { paid_date: paidDate, payment_method: paymentMethod });
      setPayTarget(null);
      refresh("Pagamento registrado.");
    } catch (error) {
      toast({ variant: "danger", description: errorMessage(error) });
    } finally { setActing(false); }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setActing(true);
    try {
      await cancelFinancialTransaction(cancelTarget.id);
      setCancelTarget(null);
      refresh("Lançamento cancelado.");
    } catch (error) {
      toast({ variant: "danger", description: errorMessage(error) });
    } finally { setActing(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActing(true);
    try {
      await deleteFinancialTransaction(deleteTarget.id);
      setDeleteTarget(null);
      refresh("Lançamento removido da operação.");
    } catch (error) {
      toast({ variant: "danger", description: errorMessage(error) });
    } finally { setActing(false); }
  }

  function transactionActions(item: FinancialTransactionData) {
    const pending = item.status === "PENDING";
    return (
      <div className="flex flex-wrap gap-1">
        {canUpdate && pending ? <>
          <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>Editar</Button>
          <Button size="sm" variant="outline" onClick={() => { setPaidDate(initialDate); setPaymentMethod(""); setPayTarget(item); }}>Marcar pago</Button>
          <Button size="sm" variant="ghost" onClick={() => setCancelTarget(item)}>Cancelar</Button>
        </> : null}
        {canDelete && item.status !== "PAID" ? <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>Remover</Button> : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financeiro"
        description="Gerencie receitas e despesas da operação com rastreabilidade por empresa."
        metadata={<span>{total} {total === 1 ? "lançamento" : "lançamentos"}</span>}
        actions={canCreate ? <Button onClick={openCreate}>Novo lançamento</Button> : undefined}
      />

      {!canCreate && !canUpdate && !canDelete ? <Alert variant="info" title="Acesso somente leitura" description="Seu papel permite consultar o financeiro, sem alterar lançamentos." /> : null}

      <Section
        title="Fluxo de caixa"
        description={dueFrom || dueTo ? "Totais consolidados para o período de vencimento selecionado." : "Totais consolidados de todos os lançamentos ativos."}
      >
        {summaryError ? <Alert variant="danger" title="Não foi possível consolidar o fluxo de caixa" description={summaryError} /> : null}
        {summaryLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Carregando fluxo de caixa">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />)}
          </div>
        ) : summary && !summaryError ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card status="success" statusLabel="Receitas pagas">
              <p className="text-sm font-medium text-hp-muted">Receitas pagas</p>
              <p className="mt-2 text-2xl font-semibold text-hp-success">{formatMoney(summary.paid_income)}</p>
              <p className="mt-2 text-sm text-hp-muted">{formatMoney(summary.pending_income)} pendentes</p>
            </Card>
            <Card status="danger" statusLabel="Despesas pagas">
              <p className="text-sm font-medium text-hp-muted">Despesas pagas</p>
              <p className="mt-2 text-2xl font-semibold text-hp-danger">{formatMoney(summary.paid_expense)}</p>
              <p className="mt-2 text-sm text-hp-muted">{formatMoney(summary.pending_expense)} pendentes</p>
            </Card>
            <Card status={Number(summary.realized_balance) >= 0 ? "success" : "danger"} statusLabel="Saldo realizado">
              <p className="text-sm font-medium text-hp-muted">Saldo realizado</p>
              <p className="mt-2 text-2xl font-semibold text-hp-foreground">{formatMoney(summary.realized_balance)}</p>
              <p className="mt-2 text-sm text-hp-muted">Somente pagamentos concluídos</p>
            </Card>
            <Card status="info" statusLabel="Saldo projetado">
              <p className="text-sm font-medium text-hp-muted">Saldo projetado</p>
              <p className="mt-2 text-2xl font-semibold text-hp-foreground">{formatMoney(summary.projected_balance)}</p>
              <p className="mt-2 text-sm text-hp-muted">{summary.transaction_count} {summary.transaction_count === 1 ? "lançamento ativo" : "lançamentos ativos"}</p>
            </Card>
          </div>
        ) : null}
      </Section>

      <Section title="Lançamentos" description="Filtre por tipo, status e período de vencimento.">
        <Card variant="subtle" padding="md">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Select label="Tipo" value={typeFilter} options={typeOptions} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} />
            <Select label="Status" value={statusFilter} options={statusOptions} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} />
            <Input label="Vencimento inicial" type="date" value={dueFrom} error={filterError ?? undefined} onChange={(event) => { setDueFrom(event.target.value); setPage(1); }} />
            <Input label="Vencimento final" type="date" value={dueTo} error={filterError ?? undefined} onChange={(event) => { setDueTo(event.target.value); setPage(1); }} />
          </div>
        </Card>

        {loadError ? <Alert variant="danger" title="Não foi possível carregar os lançamentos" description={loadError} action={<Button variant="outline" onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button>} /> : null}

        {loading ? (
          <div className="space-y-3" aria-label="Carregando lançamentos">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>
        ) : !loadError && items.length === 0 ? (
          <EmptyState title="Nenhum lançamento encontrado" description="Ajuste os filtros ou registre o primeiro lançamento financeiro." action={canCreate ? <Button onClick={openCreate}>Cadastrar lançamento</Button> : undefined} />
        ) : !loadError ? (
          <>
            <div className="hidden overflow-x-auto rounded-[var(--radius-lg)] border border-hp-border md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead>{hasActions ? <TableHead>Ações</TableHead> : null}</TableRow></TableHeader>
                <TableBody>{items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><div className="max-w-72"><p className="font-medium text-hp-foreground">{item.description}</p><p className="truncate text-xs text-hp-muted">{item.category ?? "Sem categoria"}</p></div></TableCell>
                    <TableCell>{typeLabel(item.transaction_type)}</TableCell>
                    <TableCell>{formatDate(item.due_date)}</TableCell>
                    <TableCell><StatusBadge item={item} /></TableCell>
                    <TableCell className={`text-right font-semibold ${item.transaction_type === "INCOME" ? "text-hp-success" : "text-hp-danger"}`}>{item.transaction_type === "INCOME" ? "+" : "−"} {formatMoney(item.amount)}</TableCell>
                    {hasActions ? <TableCell>{transactionActions(item)}</TableCell> : null}
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">{items.map((item) => (
              <Card key={item.id} padding="sm" status={item.status === "PAID" ? "success" : item.status === "CANCELED" ? "neutral" : "warning"}>
                <div className="flex h-full min-w-0 flex-col gap-3">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-hp-foreground">{item.description}</h3><p className="text-sm text-hp-muted">{item.category ?? "Sem categoria"}</p></div><StatusBadge item={item} /></div>
                  <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-hp-muted">Tipo</dt><dd>{typeLabel(item.transaction_type)}</dd></div><div><dt className="text-hp-muted">Vencimento</dt><dd>{formatDate(item.due_date)}</dd></div><div className="col-span-2"><dt className="text-hp-muted">Valor</dt><dd className="font-semibold">{formatMoney(item.amount)}</dd></div></dl>
                  {hasActions ? <div className="mt-auto pt-1">{transactionActions(item)}</div> : null}
                </div>
              </Card>
            ))}</div>

            {totalPages > 1 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} ariaLabel="Paginação dos lançamentos financeiros" /> : null}
          </>
        ) : null}
      </Section>

      <Dialog open={editorOpen} onOpenChange={(open) => !open && !saving && setEditorOpen(false)}>
        <DialogContent><form onSubmit={(event) => void save(event)} className="space-y-5">
          <DialogHeader><DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle><DialogDescription>{editing ? "Somente lançamentos pendentes podem ser alterados." : "Registre uma receita ou despesa da operação."}</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Tipo" required disabled={Boolean(editing)} value={draft.transactionType} options={typeOptions.slice(1)} onChange={(event) => setDraft((current) => ({ ...current, transactionType: event.target.value as FinancialTransactionType }))} />
            <Input label="Valor" required type="number" min="0.01" step="0.01" prefix="R$" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} />
            <Input label="Descrição" required maxLength={255} className="sm:col-span-2" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            <Input label="Vencimento" required type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
            <Input label="Categoria" maxLength={80} value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
            <Textarea label="Observações" maxLength={4000} showCount className="sm:col-span-2" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          {formError ? <Alert variant="danger" description={formError} /> : null}
          <DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Cancelar</DialogClose><Button type="submit" loading={saving}>Salvar lançamento</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>

      <Dialog open={payTarget !== null} onOpenChange={(open) => !open && !acting && setPayTarget(null)}>
        <DialogContent><form onSubmit={(event) => void confirmPayment(event)} className="space-y-5">
          <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle><DialogDescription>Confirme a data e a forma de pagamento deste lançamento.</DialogDescription></DialogHeader>
          <div className="space-y-4"><Input label="Data do pagamento" type="date" required value={paidDate} onChange={(event) => setPaidDate(event.target.value)} /><Select label="Forma de pagamento" required value={paymentMethod} options={paymentMethodOptions} onChange={(event) => setPaymentMethod(event.target.value)} /></div>
          <DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Voltar</DialogClose><Button type="submit" loading={acting} disabled={!paidDate || !paymentMethod}>Confirmar pagamento</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && !acting && setCancelTarget(null)}>
        <DialogContent><DialogHeader><DialogTitle>Cancelar lançamento?</DialogTitle><DialogDescription>O lançamento permanecerá no histórico com status cancelado.</DialogDescription></DialogHeader><DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Voltar</DialogClose><Button variant="danger" loading={acting} onClick={() => void confirmCancel()}>Cancelar lançamento</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && !acting && setDeleteTarget(null)}>
        <DialogContent><DialogHeader><DialogTitle>Remover lançamento?</DialogTitle><DialogDescription>O lançamento sairá da operação normal, mas seu histórico será preservado.</DialogDescription></DialogHeader><DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Voltar</DialogClose><Button variant="danger" loading={acting} onClick={() => void confirmDelete()}>Remover</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
