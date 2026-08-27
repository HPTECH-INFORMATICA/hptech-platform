"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
import SearchBox from "@/components/ui/SearchBox";
import Skeleton from "@/components/ui/Skeleton";
import useToast from "@/hooks/useToast";
import {
  createPatientFromLead,
  getLeadPatientLink,
  LeadPatientApiError,
  linkLeadToPatient,
  unlinkLeadFromPatient,
  type LeadPatientLink,
} from "@/services/lead-patient-service";
import { listPatients, type PatientData } from "@/services/patient-service";
import type { Lead } from "@/types/lead";

type Mode = "summary" | "confirm-create" | "search" | "confirm-link" | "confirm-unlink";

type LeadPatientDialogProps = {
  lead: Lead;
  canCreate: boolean;
  canLink: boolean;
  canUnlink: boolean;
};

function messageFor(error: unknown): string {
  if (!(error instanceof LeadPatientApiError)) {
    return "Ocorreu um erro inesperado.";
  }
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) return "Você não possui permissão para esta operação.";
  if (error.status === 404) return "O Lead, o Patient ou o vínculo não está mais disponível.";
  if (error.status === 409) return error.message;
  if (error.status === 422) return "A solicitação de vínculo é inválida.";
  if (error.status >= 500) return "O serviço está temporariamente indisponível. Tente novamente.";
  return error.message;
}

function primaryContact(patient: PatientData) {
  return patient.phone ?? patient.whatsapp ?? patient.email ?? "Sem contato informado";
}

export default function LeadPatientDialog({
  lead,
  canCreate,
  canLink,
  canUnlink,
}: LeadPatientDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<LeadPatientLink | null>(null);
  const [mode, setMode] = useState<Mode>("summary");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PatientData[]>([]);
  const [selected, setSelected] = useState<PatientData | null>(null);

  const loadLink = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLink(await getLeadPatientLink(lead.id));
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setLoading(false);
    }
  }, [lead.id]);

  useEffect(() => {
    if (!open || mode !== "search") return;
    const timer = window.setTimeout(() => {
      const normalized = search.trim();
      setDebouncedSearch(normalized);
      setSearching(Boolean(normalized));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [mode, open, search]);

  useEffect(() => {
    if (!open || mode !== "search" || !debouncedSearch) {
      return;
    }

    let current = true;
    const params = new URLSearchParams({
      page: "1",
      page_size: "10",
      search: debouncedSearch,
      is_active: "true",
    });
    listPatients(params)
      .then((response) => {
        if (current) setResults(response.items);
      })
      .catch(() => {
        if (current) setError("Não foi possível buscar os pacientes.");
      })
      .finally(() => {
        if (current) setSearching(false);
      });
    return () => {
      current = false;
    };
  }, [debouncedSearch, mode, open]);

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setLoading(true);
      void loadLink();
      return;
    }
    if (!nextOpen) {
      setMode("summary");
      setError(null);
      setSearch("");
      setSelected(null);
      setResults([]);
    }
  }

  async function refreshAfterConflict(reason: unknown) {
    const conflictMessage = messageFor(reason);
    try {
      setLink(await getLeadPatientLink(lead.id));
    } catch {
      // A mensagem original continua sendo a informação mais útil ao usuário.
    }
    setError(conflictMessage);
    setMode("summary");
  }

  async function createFromLead() {
    setSaving(true);
    setError(null);
    try {
      const response = await createPatientFromLead(lead.id);
      setLink(response);
      setMode("summary");
      toast({ variant: "success", description: "Lead cadastrado como paciente." });
    } catch (reason) {
      setError(messageFor(reason));
      if (reason instanceof LeadPatientApiError && [404, 409].includes(reason.status)) {
        await refreshAfterConflict(reason);
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmLink() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const response = await linkLeadToPatient(lead.id, selected.id);
      setLink(response);
      setSelected(null);
      setSearch("");
      setMode("summary");
      toast({ variant: "success", description: "Paciente vinculado ao Lead." });
    } catch (reason) {
      setError(messageFor(reason));
      if (reason instanceof LeadPatientApiError && [404, 409].includes(reason.status)) {
        await refreshAfterConflict(reason);
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmUnlink() {
    setSaving(true);
    setError(null);
    try {
      await unlinkLeadFromPatient(lead.id);
      await loadLink();
      setMode("summary");
      toast({ variant: "success", description: "Vínculo corrigido com sucesso." });
    } catch (reason) {
      setError(messageFor(reason));
      if (reason instanceof LeadPatientApiError && [404, 409].includes(reason.status)) {
        await refreshAfterConflict(reason);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <Button
        size="sm"
        variant="ghost"
        draggable={false}
        onPointerDown={(event) => event.stopPropagation()}
        onDragStart={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={() => changeOpen(true)}
      >
        Paciente
      </Button>

      {open ? (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Paciente de {lead.name}</DialogTitle>
          <DialogDescription>
            Consulte ou corrija a associação clínica deste Lead.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div role="status" className="space-y-3">
            <span className="sr-only">Carregando vínculo do paciente...</span>
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
          </div>
        ) : error ? (
          <Alert
            variant="danger"
            title="Não foi possível concluir a operação"
            description={error}
            action={
              mode === "summary" ? (
                <Button size="sm" variant="outline" onClick={() => void loadLink()}>
                  Tentar novamente
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {!loading && mode === "summary" && !error && link?.linked && link.patient ? (
          <Card variant="outlined" padding="sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-hp-muted">Paciente vinculado</p>
                <p className="font-semibold text-hp-foreground">{link.patient.name}</p>
              </div>
              <Badge variant={link.patient.is_active ? "success" : "neutral"}>
                {link.patient.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </Card>
        ) : null}

        {!loading && mode === "summary" && !error && link && !link.linked ? (
          <EmptyState
            title="Nenhum paciente vinculado."
            description="Cadastre este Lead como Patient ou selecione explicitamente um Patient existente."
          />
        ) : null}

        {mode === "confirm-create" ? (
          <Alert
            variant="info"
            title="Cadastrar como paciente?"
            description="Será criado um Patient usando somente nome, telefone, WhatsApp, email e data de nascimento disponíveis no Lead. Não haverá sincronização automática posterior."
          />
        ) : null}

        {mode === "search" ? (
          <div className="min-w-0 space-y-4">
            <SearchBox
              label="Buscar paciente ativo"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setResults([]);
                setError(null);
              }}
              onClear={() => {
                setSearch("");
                setResults([]);
                setSearching(false);
              }}
              clearLabel="Limpar busca de pacientes"
              placeholder="Nome, contato ou documento"
              loading={searching}
            />
            {searching ? <Skeleton height="4rem" /> : null}
            {!searching && debouncedSearch && results.length === 0 ? (
              <EmptyState
                title="Nenhum Patient ativo encontrado"
                description="Revise a busca ou cadastre o Lead como um novo Patient."
              />
            ) : null}
            <div className="grid min-w-0 gap-3">
              {results.map((patient) => (
                <Card key={patient.id} variant="outlined" padding="sm">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-hp-foreground">{patient.name}</p>
                      <p className="break-words text-sm text-hp-muted">{primaryContact(patient)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setSelected(patient); setMode("confirm-link"); }}>
                      Selecionar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {mode === "confirm-link" && selected ? (
          <Alert
            variant="info"
            title="Confirmar vínculo?"
            description={`O Patient ${selected.name} será vinculado ao Lead ${lead.name}. Esta seleção foi feita manualmente.`}
          />
        ) : null}

        {mode === "confirm-unlink" ? (
          <Alert
            variant="warning"
            title="Corrigir vínculo?"
            description="O Lead e o Patient não serão apagados. Somente a associação será desfeita, preservando histórico e auditoria. Um Appointment relacionado pode impedir a correção."
          />
        ) : null}

        <DialogFooter>
          {mode === "summary" ? (
            <>
              <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">
                Fechar
              </DialogClose>
              {!loading && !error && link?.linked ? (
                <>
                  <Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-primary hover:bg-hp-primary-soft" href="/pacientes">
                    Abrir Pacientes
                  </Link>
                  {canUnlink ? <Button variant="outline" onClick={() => setMode("confirm-unlink")}>Corrigir vínculo</Button> : null}
                </>
              ) : !loading && !error && link ? (
                <>
                  {canLink ? <Button variant="outline" onClick={() => setMode("search")}>Vincular paciente existente</Button> : null}
                  {canCreate ? <Button onClick={() => setMode("confirm-create")}>Cadastrar como paciente</Button> : null}
                </>
              ) : null}
            </>
          ) : (
            <>
              <Button variant="ghost" disabled={saving} onClick={() => { setMode("summary"); setError(null); setSelected(null); }}>
                Voltar
              </Button>
              {mode === "confirm-create" ? <Button loading={saving} onClick={() => void createFromLead()}>Confirmar cadastro</Button> : null}
              {mode === "confirm-link" ? <Button loading={saving} onClick={() => void confirmLink()}>Confirmar vínculo</Button> : null}
              {mode === "confirm-unlink" ? <Button loading={saving} variant="danger" onClick={() => void confirmUnlink()}>Confirmar correção</Button> : null}
            </>
          )}
        </DialogFooter>
      </DialogContent>
      ) : null}
    </Dialog>
  );
}
