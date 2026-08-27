"use client";

import { useMemo, useState, type FormEvent } from "react";

import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import useToast from "@/hooks/useToast";
import {
  createLead,
  deleteLead,
  LeadApiError,
  updateLead,
  type LeadWriteInput,
} from "@/services/lead-service";
import type { Lead } from "@/types/lead";

type LeadDraft = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  source: string;
  interest: string;
  notes: string;
};

const EMPTY_DRAFT: LeadDraft = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  source: "",
  interest: "",
  notes: "",
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function nullable(value: string) {
  return value.trim() || null;
}

function payloadFromDraft(draft: LeadDraft): LeadWriteInput {
  return {
    name: normalizeName(draft.name),
    phone: draft.phone.trim() || null,
    whatsapp: draft.whatsapp.trim() || null,
    email: draft.email.trim().toLowerCase() || null,
    source: nullable(draft.source),
    interest: nullable(draft.interest),
    notes: nullable(draft.notes),
  };
}

function draftFromLead(lead: Lead): LeadDraft {
  return {
    name: lead.name,
    phone: lead.phone ?? "",
    whatsapp: lead.whatsapp ?? "",
    email: lead.email ?? "",
    source: lead.source ?? "",
    interest: lead.interest ?? "",
    notes: lead.notes ?? "",
  };
}

function validateDraft(draft: LeadDraft): string | null {
  if (!normalizeName(draft.name)) return "Informe o nome do lead.";
  const email = draft.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Informe um e-mail válido.";
  }
  return null;
}

function errorMessage(error: unknown): string {
  if (!(error instanceof LeadApiError)) {
    return "Ocorreu um erro inesperado. Tente novamente.";
  }
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) {
    return "Você não possui permissão para esta operação.";
  }
  if (error.status === 404) {
    return "O lead não foi encontrado ou já saiu da operação.";
  }
  if (error.status === 409) return error.message;
  if (error.status === 422) {
    return "Revise os dados informados e tente novamente.";
  }
  if (error.status >= 500) {
    return "O serviço está temporariamente indisponível. Tente novamente.";
  }
  return error.message;
}

type LeadEditorDialogProps = {
  open: boolean;
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
};

export function LeadEditorDialog({
  open,
  lead,
  onOpenChange,
  onSaved,
}: LeadEditorDialogProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<LeadDraft>(() =>
    lead ? draftFromLead(lead) : EMPTY_DRAFT,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initialPayload = useMemo(
    () => (lead ? payloadFromDraft(draftFromLead(lead)) : null),
    [lead],
  );
  const currentPayload = payloadFromDraft(draft);
  const dirty = lead
    ? JSON.stringify(currentPayload) !== JSON.stringify(initialPayload)
    : Object.values(draft).some((value) => value.trim() !== "");

  function updateDraft(field: keyof LeadDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateDraft(draft);
    if (validation) {
      setFormError(validation);
      return;
    }
    if (lead && !dirty) return;

    setSaving(true);
    setFormError(null);
    try {
      if (lead) await updateLead(lead.id, currentPayload);
      else await createLead(currentPayload);
      await onSaved();
      toast({
        variant: "success",
        description: lead
          ? "Lead atualizado com sucesso."
          : "Lead cadastrado com sucesso.",
      });
      onOpenChange(false);
    } catch (error) {
      setFormError(errorMessage(error));
      if (error instanceof LeadApiError && error.status === 404) {
        await onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <form
          onSubmit={(event) => void submit(event)}
          aria-describedby={formError ? "lead-form-error" : undefined}
          className="space-y-5"
        >
          <DialogHeader>
            <DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
            <DialogDescription>
              {lead
                ? "Atualize os dados comerciais do lead. O estágio e o vínculo com paciente possuem fluxos próprios."
                : "Cadastre uma nova oportunidade no estágio inicial do funil."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Nome"
              required
              maxLength={150}
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Telefone"
                inputMode="tel"
                maxLength={30}
                value={draft.phone}
                onChange={(event) => updateDraft("phone", event.target.value)}
              />
              <Input
                label="WhatsApp"
                inputMode="tel"
                maxLength={30}
                value={draft.whatsapp}
                onChange={(event) => updateDraft("whatsapp", event.target.value)}
              />
            </div>
            <Input
              label="E-mail"
              type="email"
              maxLength={150}
              value={draft.email}
              onChange={(event) => updateDraft("email", event.target.value)}
            />
            <Input
              label="Origem"
              maxLength={80}
              value={draft.source}
              onChange={(event) => updateDraft("source", event.target.value)}
              description="Campo livre, sem catálogo ou matching automático."
            />
            <Input
              label="Interesse"
              maxLength={255}
              value={draft.interest}
              onChange={(event) => updateDraft("interest", event.target.value)}
            />
            <Textarea
              label="Notas"
              value={draft.notes}
              onChange={(event) => updateDraft("notes", event.target.value)}
            />
            {formError ? (
              <Alert
                id="lead-form-error"
                variant="danger"
                description={formError}
              />
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle"
            >
              Cancelar
            </DialogClose>
            <Button
              type="submit"
              loading={saving}
              disabled={lead ? !dirty : false}
            >
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type LeadDeleteDialogProps = {
  lead: Lead;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => Promise<void>;
};

export function LeadDeleteDialog({
  lead,
  onOpenChange,
  onDeleted,
}: LeadDeleteDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteLead(lead.id);
      await onDeleted();
      toast({
        variant: "success",
        description: "Lead removido da operação.",
      });
      onOpenChange(false);
    } catch (reason) {
      setError(errorMessage(reason));
      if (reason instanceof LeadApiError && reason.status === 404) {
        await onDeleted();
        onOpenChange(false);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !deleting && onOpenChange(open)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover lead</DialogTitle>
          <DialogDescription>
            O lead sairá da operação e das listagens normais. O registro e os
            históricos comerciais serão preservados. Um paciente vinculado não
            será removido, e esta ação não representa exclusão física definitiva.
          </DialogDescription>
        </DialogHeader>
        {error ? <Alert variant="danger" description={error} /> : null}
        <DialogFooter>
          <DialogClose
            disabled={deleting}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle"
          >
            Cancelar
          </DialogClose>
          <Button
            variant="danger"
            loading={deleting}
            onClick={() => void confirmDelete()}
          >
            Remover lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
