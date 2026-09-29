"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import SearchBox from "@/components/ui/SearchBox";
import Section from "@/components/ui/Section";
import Skeleton from "@/components/ui/Skeleton";
import { getCompanyTimezoneOptions } from "@/lib/timezones";
import {
  CompanyApiError,
  getCompany,
  updateCompany,
  type CompanyData,
  type CompanyUpdateInput,
} from "@/services/company-service";

type CompanyPanelProps = {
  canUpdate: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => void;
};

type Draft = {
  name: string;
  legal_name: string;
  document: string;
  email: string;
  phone: string;
  timezone: string;
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativa",
  TRIAL: "Em avaliação",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
};

function toDraft(company: CompanyData): Draft {
  return {
    name: company.name,
    legal_name: company.legal_name ?? "",
    document: company.document ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    timezone: company.timezone,
  };
}

function toInput(draft: Draft): CompanyUpdateInput {
  const optional = (value: string) => value.trim() || null;
  return {
    name: draft.name.trim(),
    legal_name: optional(draft.legal_name),
    document: optional(draft.document),
    email: optional(draft.email)?.toLowerCase() ?? null,
    phone: optional(draft.phone),
    timezone: draft.timezone,
  };
}

function companyInput(company: CompanyData): CompanyUpdateInput {
  return {
    name: company.name,
    legal_name: company.legal_name,
    document: company.document,
    email: company.email,
    phone: company.phone,
    timezone: company.timezone,
  };
}

function timezoneLabel(timezone: string): string {
  try {
    const name = new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      timeZoneName: "longGeneric",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    return name && name !== timezone ? `${timezone} — ${name}` : timezone;
  } catch {
    return timezone;
  }
}

function errorMessage(error: unknown): string {
  if (!(error instanceof CompanyApiError)) {
    return "Não foi possível concluir a operação.";
  }
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) return "Você não possui permissão para editar a empresa.";
  if (error.status === 409) return error.message;
  if (error.status === 422) return "Revise os dados informados e tente novamente.";
  return error.message;
}

function DefinitionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-sm font-medium text-hp-muted">{label}</dt>
      <dd className="break-words text-sm text-hp-foreground">{value || "Não informado"}</dd>
    </div>
  );
}

export default function CompanyPanel({
  canUpdate,
  onDirtyChange,
  onSaved,
}: CompanyPanelProps) {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const timezoneListId = useId();

  const dirty = useMemo(() => {
    if (!editing || !company || !draft) return false;
    return JSON.stringify(toInput(draft)) !== JSON.stringify(companyInput(company));
  }, [company, draft, editing]);

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    let active = true;
    void getCompany()
      .then((result) => {
        if (active) {
          setCompany(result);
          setDraft(toDraft(result));
        }
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  function beginEdit() {
    if (!company) return;
    setDraft(toDraft(company));
    setError(null);
    setSuccess(null);
    setEditing(true);
  }

  function retry() {
    setLoading(true);
    setError(null);
    setReload((value) => value + 1);
  }

  function cancelEdit() {
    if (company) setDraft(toDraft(company));
    setError(null);
    setEditing(false);
  }

  function updateField(field: keyof Draft, value: string) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !dirty || !draft.name.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateCompany(toInput(draft));
      setCompany(updated);
      setDraft(toDraft(updated));
      setEditing(false);
      setSuccess("Dados da empresa atualizados com sucesso.");
      onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Section title="Empresa"><div aria-label="Carregando empresa" className="space-y-3"><Skeleton height={72} /><Skeleton height={180} /></div></Section>;
  }
  if (error && !company) {
    return <Section title="Empresa"><Alert variant="danger" title="Falha ao carregar" description={error} action={<Button variant="outline" onClick={retry}>Tentar novamente</Button>} /></Section>;
  }
  if (!company || !draft) return null;

  const visibleTimezoneOptions = getCompanyTimezoneOptions(
    company.timezone,
    draft.timezone,
  );

  return (
    <Section
      title="Dados da clínica"
      description="Consulte e mantenha os dados cadastrais da clínica ativa."
      actions={!editing && canUpdate ? <Button variant="outline" onClick={beginEdit}>Editar clínica</Button> : undefined}
    >
      {error ? <Alert variant="danger" description={error} /> : null}
      {success ? <Alert variant="success" live="polite" description={success} /> : null}

      {editing ? (
        <Card variant="outlined">
          <form className="space-y-5" onSubmit={(event) => void save(event)}>
            <div className="grid min-w-0 gap-5 md:grid-cols-2">
              <Input label="Nome" required maxLength={150} value={draft.name} onChange={(event) => updateField("name", event.target.value)} />
              <Input label="Razão social" maxLength={200} value={draft.legal_name} onChange={(event) => updateField("legal_name", event.target.value)} />
              <Input label="Documento" description="Identificador cadastral da empresa." maxLength={30} value={draft.document} onChange={(event) => updateField("document", event.target.value)} />
              <Input label="Email" type="email" maxLength={150} value={draft.email} onChange={(event) => updateField("email", event.target.value)} />
              <Input label="Telefone" type="tel" maxLength={30} value={draft.phone} onChange={(event) => updateField("phone", event.target.value)} />
              <div className="md:col-span-2">
                <SearchBox
                  label="Fuso horário"
                  description="Digite parte do identificador IANA e selecione uma opção, como America/Manaus."
                  list={timezoneListId}
                  value={draft.timezone}
                  onChange={(event) => updateField("timezone", event.target.value)}
                  autoComplete="off"
                  required
                />
                <datalist id={timezoneListId}>
                  {visibleTimezoneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </datalist>
              </div>
              <Input label="Slug" description="Identificador estrutural. Não pode ser alterado neste lote." value={company.slug} readOnly />
              <Input label="Status" description="Gerenciado pela operação HPTECH." value={statusLabels[company.status] ?? company.status} readOnly />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" disabled={saving} onClick={cancelEdit}>Cancelar</Button>
              <Button type="submit" loading={saving} disabled={!dirty || !draft.name.trim()}>Salvar alterações</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card variant="outlined">
          <dl className="grid min-w-0 gap-5 sm:grid-cols-2">
            <DefinitionItem label="Nome" value={company.name} />
            <DefinitionItem label="Razão social" value={company.legal_name ?? ""} />
            <DefinitionItem label="Documento" value={company.document ?? ""} />
            <DefinitionItem label="Email" value={company.email ?? ""} />
            <DefinitionItem label="Telefone" value={company.phone ?? ""} />
            <DefinitionItem label="Fuso horário" value={timezoneLabel(company.timezone)} />
            <DefinitionItem label="Slug" value={company.slug} />
            <DefinitionItem label="Status" value={statusLabels[company.status] ?? company.status} />
          </dl>
          {!canUpdate ? <p className="mt-5 text-sm text-hp-muted">Seu acesso permite somente visualizar estes dados.</p> : null}
        </Card>
      )}
    </Section>
  );
}
