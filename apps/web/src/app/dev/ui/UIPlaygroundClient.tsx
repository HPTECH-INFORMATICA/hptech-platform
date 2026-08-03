"use client";

import { useRef, useState } from "react";

import Alert from "@/components/ui/Alert";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import EmptyState from "@/components/ui/EmptyState";
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Radio from "@/components/ui/Radio";
import SearchBox from "@/components/ui/SearchBox";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Switch from "@/components/ui/Switch";
import Textarea from "@/components/ui/Textarea";
import useToast from "@/hooks/useToast";

export default function UIPlaygroundClient() {
  const { toast, dismissAll } = useToast();

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [controlledOpen, setControlledOpen] = useState(false);
  const [protectedOpen, setProtectedOpen] = useState(false);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);

  return (
    <main className="min-h-screen bg-hp-background px-4 py-8 text-hp-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="space-y-3">
          <Badge variant="primary">Design System</Badge>

          <h1 className="text-3xl font-semibold">
            HPTECH UI Playground
          </h1>

          <p className="max-w-3xl text-hp-muted">
            Área de desenvolvimento para visualizar e validar os componentes
            oficiais da HPTECH Platform.
          </p>
        </header>

        <PlaygroundSection
          title="Feedback"
          description="Alertas persistentes e notificações temporárias."
        >
          <div className="space-y-4">
            <Alert
              variant="neutral"
              title="Informação"
              description="Este é um alerta neutro da plataforma."
            />

            <Alert
              variant="info"
              title="Novidade"
              description="Existe uma nova informação disponível."
            />

            <Alert
              variant="success"
              title="Tudo funcionando"
              description="A operação foi concluída com sucesso."
            />

            <Alert
              variant="warning"
              title="Atenção"
              description="Revise as informações antes de continuar."
            />

            <Alert
              variant="danger"
              title="Erro"
              description="Não foi possível concluir a operação."
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() =>
                toast({
                  variant: "success",
                  title: "Salvo com sucesso",
                  description: "As informações foram atualizadas.",
                })
              }
            >
              Toast de sucesso
            </Button>

            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  variant: "info",
                  title: "Nova informação",
                  description: "Um novo lead entrou no CRM.",
                })
              }
            >
              Toast informativo
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                toast({
                  variant: "warning",
                  title: "Atenção",
                  description: "Existem informações que precisam ser revisadas.",
                })
              }
            >
              Toast de atenção
            </Button>

            <Button
              variant="danger"
              onClick={() =>
                toast({
                  variant: "danger",
                  title: "Falha na operação",
                  description: "Não foi possível salvar os dados.",
                })
              }
            >
              Toast de erro
            </Button>

            <Button variant="ghost" onClick={dismissAll}>
              Fechar todos
            </Button>
          </div>
        </PlaygroundSection>

        <PlaygroundSection
          title="Botões"
          description="Variantes, tamanhos e ações principais."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
            <Button loading>Carregando</Button>

            <IconButton
              icon={<span>+</span>}
              label="Adicionar"
              variant="primary"
            />

            <IconButton
              icon={<span>⋯</span>}
              label="Mais opções"
              variant="outline"
            />
          </div>
        </PlaygroundSection>

        <PlaygroundSection
          title="Campos de formulário"
          description="Entradas de texto, busca, seleção e conteúdo multilinha."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Input
              label="Nome completo"
              description="Informe o nome do paciente."
              placeholder="Ex.: Marina Costa"
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="nome@exemplo.com"
              required
            />

            <SearchBox
              label="Pesquisar"
              description="Busca controlada para testar o botão de limpar."
              placeholder="Pesquisar pacientes..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
              clearLabel="Limpar pesquisa"
              searchIcon={<span>⌕</span>}
            />

            <Select
              label="Status"
              placeholder="Selecione um status"
              options={[
                { value: "novo", label: "Novo" },
                { value: "contato", label: "Em contato" },
                { value: "agendado", label: "Agendado" },
                { value: "convertido", label: "Convertido" },
              ]}
            />

            <div className="lg:col-span-2">
              <Textarea
                label="Observações"
                description="Digite uma observação sobre o atendimento."
                placeholder="Escreva aqui..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={300}
                showCount
                rows={5}
              />
            </div>
          </div>
        </PlaygroundSection>

        <PlaygroundSection
          title="Escolhas"
          description="Checkbox, Radio e Switch nativos e acessíveis."
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <div className="space-y-4">
                <h3 className="font-semibold">Checkbox</h3>

                <Checkbox
                  label="Aceito os termos"
                  description="Confirme para continuar."
                />

                <Checkbox
                  label="Estado indeterminado"
                  indeterminate
                />

                <Checkbox
                  label="Opção desabilitada"
                  disabled
                />
              </div>
            </Card>

            <Card>
              <div className="space-y-4">
                <h3 className="font-semibold">Radio</h3>

                <Radio
                  name="plano"
                  value="start"
                  label="Plano Start"
                  description="Recursos essenciais."
                  defaultChecked
                />

                <Radio
                  name="plano"
                  value="profissional"
                  label="Plano Profissional"
                  description="Recursos avançados."
                />

                <Radio
                  name="plano"
                  value="premium"
                  label="Plano Premium"
                  description="Solução completa."
                />
              </div>
            </Card>

            <Card>
              <div className="space-y-4">
                <h3 className="font-semibold">Switch</h3>

                <Switch
                  label="Notificações"
                  description="Receber avisos da plataforma."
                  defaultChecked
                />

                <Switch
                  label="Modo automático"
                  description="Ativar automações."
                />

                <Switch
                  label="Configuração desabilitada"
                  disabled
                />
              </div>
            </Card>
          </div>
        </PlaygroundSection>

        <PlaygroundSection
          title="Elementos visuais"
          description="Cards, badges, avatares, estados vazios e carregamento."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Neutral</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Avatar name="Marina Costa" size="xs" />
            <Avatar name="Marina Costa" size="sm" />
            <Avatar name="Marina Costa" size="md" />
            <Avatar name="Equipe Demo" size="lg" />
            <Avatar
              name="HPTECH Demo"
              size="xl"
              shape="rounded"
              status="online"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card>
              <h3 className="font-semibold">Card padrão</h3>
              <p className="mt-2 text-sm text-hp-muted">
                Superfície oficial para agrupar informações.
              </p>
            </Card>

            <Card variant="elevated">
              <h3 className="font-semibold">Card elevado</h3>
              <p className="mt-2 text-sm text-hp-muted">
                Exemplo com elevação oficial.
              </p>
            </Card>

            <Card status="success" statusLabel="Status de sucesso">
              <h3 className="font-semibold">Card com status</h3>
              <p className="mt-2 text-sm text-hp-muted">
                Indicador semântico na lateral.
              </p>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <EmptyState
                title="Nenhum paciente encontrado"
                description="Cadastre um paciente para começar."
                action={<Button>Cadastrar paciente</Button>}
              />
            </Card>

            <Card>
              <div className="space-y-4">
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" />
                <Skeleton variant="rectangular" height={120} />
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" width={48} />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width="50%" />
                    <Skeleton variant="text" width="80%" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </PlaygroundSection>

        <PlaygroundSection
          title="Dialog"
          description="Validação de abertura, fechamento, foco, backdrop, Escape, estado controlado e múltiplos modais."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Dialog>
              <Card>
                <DialogDemoHeading
                  title="Básico"
                  description="Confirmação uncontrolled com fechamento e Toast."
                />
                <DialogTrigger className={dialogTriggerClasses}>
                  Confirmar agendamento
                </DialogTrigger>
              </Card>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar agendamento</DialogTitle>
                  <DialogDescription>
                    Revise as informações antes de confirmar o atendimento.
                  </DialogDescription>
                </DialogHeader>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <DialogDetail label="Paciente" value="Marina Costa" />
                  <DialogDetail label="Data" value="10/08/2026" />
                  <DialogDetail label="Horário" value="14:30" />
                  <DialogDetail
                    label="Procedimento"
                    value="Avaliação capilar"
                  />
                </dl>

                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Cancelar
                  </DialogClose>
                  <DialogClose
                    className={dialogPrimaryClasses}
                    onClick={() =>
                      toast({
                        variant: "success",
                        title: "Agendamento confirmado",
                        description: "O atendimento foi confirmado com sucesso.",
                      })
                    }
                  >
                    Confirmar
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card>
              <DialogDemoHeading
                title="Controlled"
                description={`Estado: ${controlledOpen ? "aberto" : "fechado"}`}
              />
              <Button onClick={() => setControlledOpen(true)}>
                Abrir Dialog controlado
              </Button>
              <Dialog open={controlledOpen} onOpenChange={setControlledOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dialog controlado</DialogTitle>
                    <DialogDescription>
                      O estado de abertura pertence ao componente de demonstração.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose className={dialogPrimaryClasses}>
                      Fechar
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Card>

            <Card>
              <DialogDemoHeading
                title="Prevent dismiss"
                description="Escape, backdrop e DialogClose não podem fechar este exemplo."
              />
              <Button onClick={() => setProtectedOpen(true)}>
                Abrir Dialog protegido
              </Button>
              <Dialog
                open={protectedOpen}
                onOpenChange={setProtectedOpen}
                preventDismiss
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Fechamento protegido</DialogTitle>
                    <DialogDescription>
                      Este Dialog não fecha por Escape, backdrop ou botão
                      DialogClose.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose className={dialogSecondaryClasses}>
                      DialogClose bloqueado
                    </DialogClose>
                    <Button onClick={() => setProtectedOpen(false)}>
                      Fechar programaticamente
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Card>

            <Dialog closeOnEscape={false}>
              <Card>
                <DialogDemoHeading
                  title="Escape desativado"
                  description="Backdrop e botão Fechar continuam funcionando."
                />
                <DialogTrigger className={dialogTriggerClasses}>
                  Testar Escape
                </DialogTrigger>
              </Card>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Escape desativado</DialogTitle>
                  <DialogDescription>
                    Escape está desativado, mas backdrop e botão Fechar
                    continuam funcionando.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose className={dialogPrimaryClasses}>
                    Fechar
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog closeOnOverlayClick={false}>
              <Card>
                <DialogDemoHeading
                  title="Backdrop desativado"
                  description="Escape e botão Fechar continuam funcionando."
                />
                <DialogTrigger className={dialogTriggerClasses}>
                  Testar backdrop
                </DialogTrigger>
              </Card>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Backdrop desativado</DialogTitle>
                  <DialogDescription>
                    O clique no backdrop está desativado.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose className={dialogPrimaryClasses}>
                    Fechar
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog modal={false}>
              <Card>
                <DialogDemoHeading
                  title="Não modal"
                  description="A página continua interativa e sem scroll lock."
                />
                <DialogTrigger className={dialogTriggerClasses}>
                  Abrir não modal
                </DialogTrigger>
              </Card>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog não modal</DialogTitle>
                  <DialogDescription>
                    A página permanece interativa enquanto este Dialog está
                    aberto.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose className={dialogPrimaryClasses}>
                    Fechar
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog initialFocusRef={initialFocusRef}>
              <Card>
                <DialogDemoHeading
                  title="Foco inicial"
                  description="A referência explícita aponta para o segundo controle."
                />
                <DialogTrigger className={dialogTriggerClasses}>
                  Validar foco
                </DialogTrigger>
              </Card>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Foco inicial explícito</DialogTitle>
                  <DialogDescription>
                    O botão destacado pela referência deve receber foco.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary">Primeiro controle</Button>
                  <Button ref={initialFocusRef}>Destino do foco inicial</Button>
                </div>
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <Card>
                <DialogDemoHeading
                  title="Múltiplos Dialogs"
                  description="Validação de top layer, foco e lock compartilhado."
                />
                <DialogTrigger className={dialogTriggerClasses}>
                  Abrir primeiro Dialog
                </DialogTrigger>
              </Card>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Primeiro Dialog</DialogTitle>
                  <DialogDescription>
                    Abra o segundo Dialog para validar a composição aninhada.
                  </DialogDescription>
                </DialogHeader>

                <Dialog>
                  <DialogTrigger className={dialogTriggerClasses}>
                    Abrir segundo Dialog
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Segundo Dialog</DialogTitle>
                      <DialogDescription>
                        Este Dialog ocupa a camada superior.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose className={dialogPrimaryClasses}>
                        Fechar segundo
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="max-h-48 space-y-3 overflow-y-auto rounded-[var(--radius-md)] border border-hp-border p-[var(--space-3)] text-sm text-hp-muted">
                  {Array.from({ length: 10 }, (_, index) => (
                    <p key={index}>
                      Conteúdo de validação {index + 1}: texto longo e fictício
                      para conferir quebra de linha, altura máxima e rolagem sem
                      ampliar horizontalmente a viewport.
                    </p>
                  ))}
                </div>

                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar primeiro
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </PlaygroundSection>
      </div>
    </main>
  );
}

type PlaygroundSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function PlaygroundSection({
  title,
  description,
  children,
}: PlaygroundSectionProps) {
  return (
    <section className="space-y-6">
      <header className="border-b border-hp-border pb-4">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-hp-muted">{description}</p>
      </header>

      <div>{children}</div>
    </section>
  );
}

const dialogTriggerClasses =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-action-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const dialogPrimaryClasses = dialogTriggerClasses;

const dialogSecondaryClasses =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-hp-border bg-hp-surface px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold text-hp-foreground transition-colors hover:bg-hp-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

function DialogDemoHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 space-y-1">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-hp-muted">{description}</p>
    </div>
  );
}

function DialogDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-hp-surface-subtle p-[var(--space-3)]">
      <dt className="text-hp-muted">{label}</dt>
      <dd className="mt-1 font-medium text-hp-foreground">{value}</dd>
    </div>
  );
}
