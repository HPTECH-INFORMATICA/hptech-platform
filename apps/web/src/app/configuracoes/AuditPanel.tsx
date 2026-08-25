"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import Section from "@/components/ui/Section";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import {
  AuditLogApiError,
  listAuditLogs,
  type AuditLogItem,
  type AuditLogList,
} from "@/services/audit-log-service";

const PAGE_SIZE = 20;
const actionLabels: Record<string, string> = {
  USER_UPDATED: "Usuário atualizado",
  USER_ROLE_CHANGED: "Papel alterado",
  USER_BLOCKED: "Usuário bloqueado",
  USER_REACTIVATED: "Usuário reativado",
  USER_SOFT_DELETED: "Usuário removido",
  USER_INVITED: "Usuário convidado",
  USER_INVITATION_DELIVERY_FAILED: "Falha no envio do convite",
  USER_INVITATION_REVOKED: "Convite revogado",
  USER_INVITATION_ACCEPTED: "Convite aceito",
  PASSWORD_CHANGED: "Senha alterada",
  PASSWORD_RESET_REQUESTED: "Redefinição de senha solicitada",
  PASSWORD_RESET_COMPLETED: "Senha redefinida",
  ROLE_PERMISSIONS_CHANGED: "Permissões do papel alteradas",
  ROLE_PERMISSIONS_RESET: "Permissões do papel restauradas",
  COMPANY_UPDATED: "Empresa atualizada",
  SERVICE_CREATED: "Serviço criado",
  SERVICE_UPDATED: "Serviço atualizado",
  SERVICE_STATUS_CHANGED: "Status do serviço alterado",
  SERVICE_SOFT_DELETED: "Serviço removido",
};
const actionOptions = [
  { value: "", label: "Todas as ações" },
  ...Object.entries(actionLabels).map(([value, label]) => ({ value, label })),
];
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short", timeStyle: "medium",
});

type AppliedFilters = { search: string; action: string; from: string; to: string };
const emptyFilters: AppliedFilters = { search: "", action: "", from: "", to: "" };

function metadataText(item: AuditLogItem): string {
  const metadata = item.metadata;
  if (item.action === "USER_UPDATED" && Array.isArray(metadata.fields)) {
    return `Campos alterados: ${metadata.fields.filter((field): field is string => typeof field === "string").join(", ")}.`;
  }
  if (item.action === "USER_ROLE_CHANGED" && typeof metadata.from === "string" && typeof metadata.to === "string") {
    return `Papel: ${metadata.from} → ${metadata.to}.`;
  }
  if (["USER_BLOCKED", "USER_REACTIVATED"].includes(item.action) && typeof metadata.to === "boolean") {
    return metadata.to ? "Conta ativada." : "Conta bloqueada.";
  }
  if (item.action.startsWith("USER_INVITATION") || item.action === "USER_INVITED") {
    const values = [typeof metadata.role === "string" ? `Papel: ${metadata.role}` : null, typeof metadata.state === "string" ? `Estado: ${metadata.state}` : null, typeof metadata.delivery === "string" ? `Envio: ${metadata.delivery}` : null].filter(Boolean);
    return values.length ? `${values.join(" · ")}.` : "Evento de convite registrado.";
  }
  if (item.action.startsWith("PASSWORD_")) return "Operação de credencial registrada sem conteúdo sensível.";
  if (item.action === "ROLE_PERMISSIONS_CHANGED" && typeof metadata.role === "string") {
    const enabled = Array.isArray(metadata.enabled) ? metadata.enabled.filter((value): value is string => typeof value === "string") : [];
    const revoked = Array.isArray(metadata.revoked) ? metadata.revoked.filter((value): value is string => typeof value === "string") : [];
    const changes = [enabled.length ? `Concedidas: ${enabled.join(", ")}` : null, revoked.length ? `Revogadas: ${revoked.join(", ")}` : null].filter(Boolean);
    return `Papel: ${metadata.role}.${changes.length ? ` ${changes.join(" · ")}.` : ""}`;
  }
  if (item.action === "ROLE_PERMISSIONS_RESET" && typeof metadata.role === "string") {
    return `Permissões padrão restauradas para o papel ${metadata.role}.`;
  }
  if (item.action === "COMPANY_UPDATED" && Array.isArray(metadata.fields)) {
    const fields = metadata.fields.filter(
      (field): field is string => typeof field === "string",
    );
    return fields.length
      ? `Campos alterados: ${fields.join(", ")}.`
      : "Dados cadastrais da empresa atualizados.";
  }
  if (item.action === "SERVICE_UPDATED" && Array.isArray(metadata.fields)) {
    const fields = metadata.fields.filter(
      (field): field is string => typeof field === "string",
    );
    return fields.length
      ? `Campos alterados: ${fields.join(", ")}.`
      : "Serviço atualizado.";
  }
  if (item.action === "SERVICE_STATUS_CHANGED") {
    return `Status alterado de ${String(metadata.from ?? "-")} para ${String(metadata.to ?? "-")}.`;
  }
  if (item.action === "SERVICE_CREATED") return "Serviço criado e ativo.";
  if (item.action === "SERVICE_SOFT_DELETED") return "Serviço removido logicamente.";
  if (item.action === "USER_SOFT_DELETED") return "Usuário removido logicamente.";
  return "Evento administrativo registrado.";
}

function AuditCard({ item }: { item: AuditLogItem }) {
  return (
    <Card variant="outlined" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-hp-foreground">{actionLabels[item.action] ?? item.action}</h3>
        <Badge variant="neutral" size="sm">{dateFormatter.format(new Date(item.occurred_at))}</Badge>
      </div>
      <p className="text-sm text-hp-muted">{metadataText(item)}</p>
      <dl className="grid gap-2 text-sm">
        <div><dt className="font-medium text-hp-foreground">Ator</dt><dd className="break-words text-hp-muted">{item.actor ? `${item.actor.name} · ${item.actor.email}` : "Sistema ou usuário removido"}</dd></div>
        <div><dt className="font-medium text-hp-foreground">Alvo</dt><dd className="break-all text-hp-muted">{item.target_type}{item.target_id ? ` · ${item.target_id}` : ""}</dd></div>
      </dl>
    </Card>
  );
}

export default function AuditPanel() {
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<AuditLogList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (filters.search) params.set("search", filters.search);
    if (filters.action) params.set("action", filters.action);
    if (filters.from) params.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
    if (filters.to) params.set("to", new Date(`${filters.to}T23:59:59.999`).toISOString());
    const load = async () => {
      setLoading(true); setError(null); setResult(null);
      try {
        const response = await listAuditLogs(params);
        if (active) setResult(response);
      } catch (reason) {
        if (!active) return;
        setError(reason instanceof AuditLogApiError && reason.status === 401
          ? "Sua sessão não é mais válida. Entre novamente para continuar."
          : reason instanceof AuditLogApiError && reason.status === 403
            ? "Você não possui permissão para consultar a auditoria."
            : "Não foi possível carregar os eventos de auditoria.");
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [filters, page, reload]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE)), [result?.total]);
  function applyFilters(event: FormEvent) { event.preventDefault(); setPage(1); setFilters({ ...draft, search: draft.search.trim() }); }
  function clearFilters() { setDraft(emptyFilters); setFilters(emptyFilters); setPage(1); }

  return (
    <Section title="Auditoria" description="Consulte eventos administrativos importantes da empresa.">
      <Card variant="subtle">
        <form onSubmit={applyFilters} className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Busca" placeholder="Ação, ator ou tipo de alvo" value={draft.search} onChange={(event) => setDraft((value) => ({ ...value, search: event.target.value }))} />
          <Select label="Ação" options={actionOptions} value={draft.action} onChange={(event) => setDraft((value) => ({ ...value, action: event.target.value }))} />
          <Input label="Data inicial" type="date" value={draft.from} onChange={(event) => setDraft((value) => ({ ...value, from: event.target.value }))} />
          <Input label="Data final" type="date" value={draft.to} onChange={(event) => setDraft((value) => ({ ...value, to: event.target.value }))} />
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4"><Button type="submit">Filtrar</Button><Button type="button" variant="outline" onClick={clearFilters}>Limpar filtros</Button></div>
        </form>
      </Card>

      {loading ? <div aria-label="Carregando auditoria" className="space-y-3"><Skeleton height={48} /><Skeleton height={80} /><Skeleton height={80} /></div> : null}
      {!loading && error ? <Alert variant="danger" title="Falha ao carregar" description={error} action={<Button variant="outline" onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button>} /> : null}
      {!loading && !error && result?.items.length === 0 ? <EmptyState title="Nenhum evento encontrado" description="Ajuste os filtros ou aguarde novos eventos administrativos." /> : null}
      {!loading && !error && result?.items.length ? (
        <>
          <div className="hidden overflow-x-auto rounded-[var(--radius-lg)] border border-hp-border md:block">
            <Table>
              <TableHeader><TableRow><TableHead scope="col">Data e hora</TableHead><TableHead scope="col">Ação</TableHead><TableHead scope="col">Ator</TableHead><TableHead scope="col">Alvo</TableHead><TableHead scope="col">Contexto</TableHead></TableRow></TableHeader>
              <TableBody>{result.items.map((item) => <TableRow key={item.id}><TableCell className="whitespace-nowrap">{dateFormatter.format(new Date(item.occurred_at))}</TableCell><TableCell><Badge variant="info">{actionLabels[item.action] ?? item.action}</Badge></TableCell><TableCell><span className="block font-medium">{item.actor?.name ?? "Sistema ou usuário removido"}</span>{item.actor ? <span className="block break-all text-xs text-hp-muted">{item.actor.email}</span> : null}</TableCell><TableCell><span className="block">{item.target_type}</span>{item.target_id ? <span className="block max-w-48 break-all text-xs text-hp-muted">{item.target_id}</span> : null}</TableCell><TableCell className="min-w-64 text-hp-muted">{metadataText(item)}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
          <div className="grid gap-4 md:hidden">{result.items.map((item) => <AuditCard key={item.id} item={item} />)}</div>
          {totalPages > 1 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} ariaLabel="Paginação da auditoria" /> : null}
        </>
      ) : null}
    </Section>
  );
}
