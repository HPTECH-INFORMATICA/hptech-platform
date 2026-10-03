"use client";

import { useEffect, useMemo, useState } from "react";

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
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import Section from "@/components/ui/Section";
import RowActionsMenu from "@/components/ui/RowActionsMenu";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import useToast from "@/hooks/useToast";
import { publicLandingPageFrontendPath } from "@/lib/public-landing-page-routes";
import {
  archiveLandingPage,
  createLandingPage,
  deleteLandingPage,
  LandingPageApiError,
  listLandingPages,
  publishLandingPage,
  unpublishLandingPage,
  updateLandingPage,
  type LandingPageData,
  type LandingPageStatus,
} from "@/services/landing-page-service";

import LandingPageEditor, { type LandingPageDraft } from "./LandingPageEditor";

const PAGE_SIZE = 9;

const statusOptions = [
  { value: "", label: "Todos os status" },
  { value: "DRAFT", label: "Rascunhos" },
  { value: "PUBLISHED", label: "Publicadas" },
  { value: "ARCHIVED", label: "Arquivadas" },
] as const;

const templateLabels = {
  BLANK: "Em branco",
  LEAD_CAPTURE: "Captação de lead",
  SERVICE_PROMOTION: "Promoção de serviço",
} as const;

function emptyDraft(): LandingPageDraft {
  return {
    name: "",
    slug: "",
    template: "BLANK",
    content: { version: 1, blocks: [] },
    seo: {
      title: null,
      description: null,
      canonical_url: null,
      no_index: false,
    },
  };
}

function draftFromLandingPage(item: LandingPageData): LandingPageDraft {
  return {
    name: item.name,
    slug: item.slug,
    template: item.template,
    content: structuredClone(item.content),
    seo: { ...item.seo },
  };
}

function validateDraft(draft: LandingPageDraft): string | null {
  if (!draft.name.trim()) return "Informe o nome interno da landing page.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug.trim())) {
    return "Use um slug com letras minúsculas, números e hífens.";
  }
  if (draft.seo.canonical_url && !draft.seo.canonical_url.startsWith("https://")) {
    return "A URL canônica deve usar HTTPS.";
  }
  for (const block of draft.content.blocks) {
    if (block.type === "HERO" && !block.heading.trim()) return "Preencha o título do bloco Destaque.";
    if (block.type === "TEXT" && !block.body.trim()) return "Preencha o conteúdo do bloco Texto.";
    if (block.type === "FEATURES" && block.items.some((item) => !item.title.trim() || !item.body.trim())) {
      return "Preencha o título e a descrição de todos os benefícios.";
    }
    if (block.type === "CALL_TO_ACTION" && (!block.heading.trim() || !block.action.label.trim() || !block.action.href.trim())) {
      return "Preencha todos os campos obrigatórios da Chamada para ação.";
    }
    if (block.type === "FAQ" && block.items.some((item) => !item.question.trim() || !item.answer.trim())) {
      return "Preencha todas as perguntas e respostas.";
    }
    if (block.type === "CONTACT" && (!block.heading.trim() || !block.submit_label.trim() || !block.success_message.trim())) {
      return "Preencha todos os campos obrigatórios do bloco Contato.";
    }
  }
  return null;
}

function errorMessage(error: unknown): string {
  if (!(error instanceof LandingPageApiError)) return "Ocorreu um erro inesperado.";
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) return "Você não possui permissão para esta operação.";
  if (error.status === 404) return "A landing page não foi encontrada ou não pertence à empresa.";
  if (error.status === 409) return error.message;
  if (error.status === 422) return "Revise os dados informados e tente novamente.";
  if (error.status >= 500) return "O serviço está temporariamente indisponível. Tente novamente.";
  return error.message;
}

function statusBadge(status: LandingPageStatus) {
  if (status === "PUBLISHED") return <Badge variant="success">Publicada</Badge>;
  if (status === "ARCHIVED") return <Badge variant="neutral">Arquivada</Badge>;
  return <Badge variant="warning">Rascunho</Badge>;
}

type PendingAction = {
  type: "publish" | "unpublish" | "archive" | "delete";
  item: LandingPageData;
};

const actionCopy = {
  publish: {
    title: "Publicar landing page",
    description: "A landing page ficará disponível para o fluxo de publicação.",
    button: "Publicar",
  },
  unpublish: {
    title: "Despublicar landing page",
    description: "A landing page voltará ao estado de rascunho e poderá ser editada.",
    button: "Despublicar",
  },
  archive: {
    title: "Arquivar landing page",
    description: "O rascunho será retirado da operação e ficará preservado no histórico.",
    button: "Arquivar",
  },
  delete: {
    title: "Remover landing page",
    description: "A landing page será removida das listagens normais. O histórico será preservado.",
    button: "Remover",
  },
} as const;

export default function LandingPagesPage({ currentUser }: { currentUser: CurrentUser }) {
  const { toast } = useToast();
  const [items, setItems] = useState<LandingPageData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LandingPageData | null>(null);
  const [draft, setDraft] = useState<LandingPageDraft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const canCreate = hasPermission(currentUser, "LANDING_PAGES", "CREATE");
  const canUpdate = hasPermission(currentUser, "LANDING_PAGES", "UPDATE");
  const canDelete = hasPermission(currentUser, "LANDING_PAGES", "DELETE");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
    });
    if (status) params.set("status", status);

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listLandingPages(params);
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [page, reload, status]);

  const initialDraft = useMemo(
    () => (editing ? draftFromLandingPage(editing) : emptyDraft()),
    [editing],
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft());
    setFormError(null);
    setEditorOpen(true);
  }

  function openEdit(item: LandingPageData) {
    setEditing(item);
    setDraft(draftFromLandingPage(item));
    setFormError(null);
    setEditorOpen(true);
  }

  async function save() {
    const validation = validateDraft(draft);
    if (validation) {
      setFormError(validation);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await updateLandingPage(editing.id, draft);
      else await createLandingPage(draft);
      toast({
        variant: "success",
        description: editing
          ? "Landing page atualizada com sucesso."
          : "Landing page criada como rascunho.",
      });
      setEditorOpen(false);
      setReload((value) => value + 1);
    } catch (reason) {
      setFormError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function confirmAction() {
    if (!pendingAction) return;
    setSaving(true);
    try {
      const { item, type } = pendingAction;
      if (type === "publish") await publishLandingPage(item.id);
      if (type === "unpublish") await unpublishLandingPage(item.id);
      if (type === "archive") await archiveLandingPage(item.id);
      if (type === "delete") await deleteLandingPage(item.id);
      toast({
        variant: "success",
        description: {
          publish: "Landing page publicada.",
          unpublish: "Landing page despublicada e liberada para edição.",
          archive: "Landing page arquivada.",
          delete: "Landing page removida da operação.",
        }[type],
      });
      setPendingAction(null);
      setReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Landing Pages"
        description="Crie páginas comerciais com conteúdo estruturado e publicação controlada."
        actions={canCreate ? <Button onClick={openCreate}>Nova landing page</Button> : undefined}
      />

      <Section
        title="Páginas"
        description="Gerencie rascunhos, publicações e páginas arquivadas."
        actions={
          <Select
            label="Filtrar por status"
            value={status}
            options={statusOptions}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          />
        }
      >
        {error ? (
          <Alert
            variant="danger"
            title="Não foi possível carregar as landing pages"
            description={error}
            action={
              <Button variant="outline" size="sm" onClick={() => setReload((value) => value + 1)}>
                Tentar novamente
              </Button>
            }
          />
        ) : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Carregando landing pages">
            <Skeleton height="13rem" />
            <Skeleton height="13rem" />
            <Skeleton height="13rem" />
          </div>
        ) : !error && items.length === 0 ? (
          <EmptyState
            title="Nenhuma landing page encontrada"
            description={status ? "Nenhuma página corresponde ao status selecionado." : "Comece criando a primeira landing page da empresa."}
            action={canCreate ? <Button onClick={openCreate}>Criar landing page</Button> : undefined}
          />
        ) : !error ? (
          <>
            <p className="text-sm text-hp-muted" aria-live="polite">
              {total} {total === 1 ? "landing page encontrada" : "landing pages encontradas"}
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <Card key={item.id} variant="outlined" padding="sm">
                  <article className="flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-hp-foreground">{item.name}</h3>
                        <p className="mt-1 break-all text-sm text-hp-muted">/{item.slug}</p>
                      </div>
                      {statusBadge(item.status)}
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-hp-muted">Modelo</dt>
                        <dd>{templateLabels[item.template]}</dd>
                      </div>
                      <div>
                        <dt className="text-hp-muted">Blocos</dt>
                        <dd>{item.content.blocks.length}</dd>
                      </div>
                    </dl>
                    <div className="mt-auto flex justify-end">
                      {item.status === "PUBLISHED" || canUpdate || canDelete ? (
                        <RowActionsMenu label={`Ações de ${item.name}`}>
                          {item.status === "PUBLISHED" ? (
                            <DropdownMenuItem
                              onSelect={() => {
                                const path = publicLandingPageFrontendPath(
                                  currentUser.company.slug,
                                  item.slug,
                                );
                                if (path) window.open(path, "_blank", "noopener,noreferrer");
                              }}
                            >
                              Abrir página
                            </DropdownMenuItem>
                          ) : null}
                          {canUpdate && item.status === "DRAFT" ? (
                            <DropdownMenuItem onSelect={() => openEdit(item)}>
                              Editar landing page
                            </DropdownMenuItem>
                          ) : null}
                          {canUpdate && item.status === "DRAFT" ? (
                            <DropdownMenuItem
                              disabled={item.content.blocks.length === 0}
                              onSelect={() => setPendingAction({ type: "publish", item })}
                            >
                              Publicar
                            </DropdownMenuItem>
                          ) : null}
                          {canUpdate && item.status === "PUBLISHED" ? (
                            <DropdownMenuItem onSelect={() => setPendingAction({ type: "unpublish", item })}>
                              Despublicar
                            </DropdownMenuItem>
                          ) : null}
                          {canUpdate && item.status === "DRAFT" ? (
                            <DropdownMenuItem onSelect={() => setPendingAction({ type: "archive", item })}>
                              Arquivar
                            </DropdownMenuItem>
                          ) : null}
                          {canDelete && item.status !== "PUBLISHED" ? <DropdownMenuSeparator /> : null}
                          {canDelete && item.status !== "PUBLISHED" ? (
                            <DropdownMenuItem
                              variant="danger"
                              onSelect={() => setPendingAction({ type: "delete", item })}
                            >
                              Remover landing page
                            </DropdownMenuItem>
                          ) : null}
                        </RowActionsMenu>
                      ) : null}
                    </div>
                  </article>
                </Card>
              ))}
            </div>
            {totalPages > 1 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} /> : null}
          </>
        ) : null}
      </Section>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar landing page" : "Nova landing page"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize o rascunho com blocos estruturados."
                : "A nova página será criada como rascunho."}
            </DialogDescription>
          </DialogHeader>
          <LandingPageEditor draft={draft} onChange={setDraft} />
          {formError ? <Alert variant="danger" description={formError} /> : null}
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">
              Cancelar
            </DialogClose>
            <Button loading={saving} disabled={!dirty} onClick={() => void save()}>
              Salvar rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingAction ? actionCopy[pendingAction.type].title : "Confirmar ação"}</DialogTitle>
            <DialogDescription>
              {pendingAction ? `${actionCopy[pendingAction.type].description} Página: ${pendingAction.item.name}.` : "Confirme a ação."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">
              Cancelar
            </DialogClose>
            <Button
              loading={saving}
              variant={pendingAction?.type === "delete" || pendingAction?.type === "archive" ? "danger" : "primary"}
              onClick={() => void confirmAction()}
            >
              {pendingAction ? actionCopy[pendingAction.type].button : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
