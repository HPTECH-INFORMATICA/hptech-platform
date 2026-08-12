"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Accordion, {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import Alert from "@/components/ui/Alert";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import EmptyState from "@/components/ui/EmptyState";
import Collapsible, {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/Collapsible";
import ContextMenu, {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/ContextMenu";
import DataGrid, {
  type DataGridColumn,
  type DataGridSort,
} from "@/components/ui/DataGrid";
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import Drawer, {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/Drawer";
import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  type DropdownMenuAlign,
  type DropdownMenuSide,
} from "@/components/ui/DropdownMenu";
import HoverCard, {
  HoverCardContent,
  HoverCardDescription,
  HoverCardTitle,
  HoverCardTrigger,
  type HoverCardAlign,
  type HoverCardSide,
} from "@/components/ui/HoverCard";
import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Menubar, {
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/Menubar";
import NavigationMenu, {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLabel,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuMenu,
  NavigationMenuSeparator,
  NavigationMenuTrigger,
} from "@/components/ui/NavigationMenu";
import Pagination from "@/components/ui/Pagination";
import Popover, {
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  type PopoverAlign,
  type PopoverSide,
} from "@/components/ui/Popover";
import Tabs, {
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/Tabs";
import Toggle from "@/components/ui/Toggle";
import ToggleGroup, {
  ToggleGroupItem,
} from "@/components/ui/ToggleGroup";
import Tooltip, {
  TooltipContent,
  TooltipTrigger,
  type TooltipAlign,
  type TooltipSide,
} from "@/components/ui/Tooltip";
import Radio from "@/components/ui/Radio";
import SearchBox from "@/components/ui/SearchBox";
import ScrollArea from "@/components/ui/ScrollArea";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Switch from "@/components/ui/Switch";
import Table, {
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import useToast from "@/hooks/useToast";

export default function UIPlaygroundClient() {
  const { toast, dismissAll } = useToast();

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [controlledOpen, setControlledOpen] = useState(false);
  const [protectedOpen, setProtectedOpen] = useState(false);
  const [controlledDrawerOpen, setControlledDrawerOpen] = useState(false);
  const [protectedDrawerOpen, setProtectedDrawerOpen] = useState(false);
  const [drawerSize, setDrawerSize] = useState<"sm" | "md" | "lg" | "xl">(
    "md",
  );
  const [controlledPopoverOpen, setControlledPopoverOpen] = useState(false);
  const [dynamicPopoverContent, setDynamicPopoverContent] = useState(1);
  const [dynamicTriggerLong, setDynamicTriggerLong] = useState(false);
  const [controlledTooltipOpen, setControlledTooltipOpen] = useState(false);
  const [tooltipDelay, setTooltipDelay] = useState(500);
  const [controlledDropdownOpen, setControlledDropdownOpen] = useState(false);
  const [preventedSelectionCount, setPreventedSelectionCount] = useState(0);
  const [controlledContextMenuOpen, setControlledContextMenuOpen] =
    useState(false);
  const [preventedContextSelectionCount, setPreventedContextSelectionCount] =
    useState(0);
  const [controlledMenubarValue, setControlledMenubarValue] =
    useState<string | null>(null);
  const [preventedMenubarSelectionCount, setPreventedMenubarSelectionCount] =
    useState(0);
  const [controlledHoverCardOpen, setControlledHoverCardOpen] =
    useState(false);
  const [hoverCardOpenDelay, setHoverCardOpenDelay] = useState(300);
  const [hoverCardCloseDelay, setHoverCardCloseDelay] = useState(150);
  const [controlledNavigationValue, setControlledNavigationValue] =
    useState<string | null>(null);
  const [controlledAccordionValue, setControlledAccordionValue] =
    useState("item-1");
  const [controlledAccordionMultiple, setControlledAccordionMultiple] =
    useState<string[]>(["item-a"]);
  const [controlledCollapsibleOpen, setControlledCollapsibleOpen] =
    useState(false);
  const [controlledTabsValue, setControlledTabsValue] = useState("visao");
  const [controlledTogglePressed, setControlledTogglePressed] = useState(false);
  const [controlledToggleGroupSingle, setControlledToggleGroupSingle] =
    useState("centro");
  const [controlledToggleGroupMultiple, setControlledToggleGroupMultiple] =
    useState<string[]>(["negrito"]);
  const [controlledPaginationPage, setControlledPaginationPage] = useState(5);
  const [dynamicPaginationPage, setDynamicPaginationPage] = useState(10);
  const [dynamicPaginationTotal, setDynamicPaginationTotal] = useState(12);
  const [controlledGridSort, setControlledGridSort] =
    useState<DataGridSort | null>(null);
  const [manualGridSort, setManualGridSort] =
    useState<DataGridSort | null>(null);
  const [controlledGridSelection, setControlledGridSelection] =
    useState<readonly string[]>(["lead-1"]);
  const [controlledGridVisibility, setControlledGridVisibility] = useState<
    Readonly<Record<string, boolean>>
  >({ email: true, source: true });
  const [gridDemoPage, setGridDemoPage] = useState(1);
  const [crossPageSelection, setCrossPageSelection] = useState<readonly string[]>(
    ["lead-1"],
  );
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
  const drawerInitialFocusRef = useRef<HTMLInputElement | null>(null);
  const externalFocusRef = useRef<HTMLButtonElement | null>(null);
  const popoverInitialFocusRef = useRef<HTMLInputElement | null>(null);

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
          title="Popover"
          description="Posicionamento, foco, dismiss, atualização e composição contextual do Popover oficial."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PopoverDemo title="Básico" />

            {(["top", "right", "bottom", "left"] as PopoverSide[]).map(
              (side) => (
                <PopoverDemo key={side} title={`Side ${side}`} side={side} />
              ),
            )}

            {(["start", "center", "end"] as PopoverAlign[]).map((align) => (
              <PopoverDemo key={align} title={`Align ${align}`} align={align} />
            ))}

            {[0, 8, 16, -4].map((sideOffset) => (
              <PopoverDemo
                key={sideOffset}
                title={`Offset ${sideOffset}px`}
                sideOffset={sideOffset}
              />
            ))}

            <PopoverDemo
              title="Escape desativado"
              closeOnEscape={false}
              description="Feche pelo botão ou clicando fora."
            />
            <PopoverDemo
              title="Interação externa desativada"
              closeOnInteractOutside={false}
              description="Feche pelo botão ou Escape."
            />

            <div className={popoverDemoClasses}>
              <h3 className="font-semibold">Controlado</h3>
              <p className="text-sm text-hp-muted">
                Estado: {controlledPopoverOpen ? "aberto" : "fechado"}
              </p>
              <Popover
                open={controlledPopoverOpen}
                onOpenChange={setControlledPopoverOpen}
              >
                <PopoverTrigger className={popoverTriggerClasses}>
                  Alternar controlado
                </PopoverTrigger>
                <PopoverContent className={popoverContentClasses}>
                  <PopoverTitle>Popover controlado</PopoverTitle>
                  <PopoverDescription>
                    O estado é mantido pelo Playground.
                  </PopoverDescription>
                  <PopoverClose className={popoverCloseClasses}>Fechar</PopoverClose>
                </PopoverContent>
              </Popover>
            </div>

            <div className={popoverDemoClasses}>
              <h3 className="font-semibold">initialFocusRef</h3>
              <Popover initialFocusRef={popoverInitialFocusRef}>
                <PopoverTrigger className={popoverTriggerClasses}>Abrir</PopoverTrigger>
                <PopoverContent className={popoverContentClasses}>
                  <PopoverTitle>Foco explícito</PopoverTitle>
                  <Input ref={popoverInitialFocusRef} label="Destino do foco inicial" />
                  <PopoverClose className={popoverCloseClasses}>Fechar</PopoverClose>
                </PopoverContent>
              </Popover>
            </div>

            <FocusPopoverDemo mode="autofocus" />
            <FocusPopoverDemo mode="first" />
            <FocusPopoverDemo mode="none" />
            <PopoverDemo title="Sem restauração" restoreFocus={false} />

            <div className={popoverDemoClasses}>
              <h3 className="font-semibold">Interação externa</h3>
              <Popover>
                <PopoverTrigger className={popoverTriggerClasses}>Abrir</PopoverTrigger>
                <PopoverContent className={popoverContentClasses}>
                  <PopoverTitle>Teste externo</PopoverTitle>
                  <PopoverDescription>Clique no controle ao lado.</PopoverDescription>
                </PopoverContent>
              </Popover>
              <Button variant="secondary">Controle externo</Button>
            </div>

            <div className={popoverDemoClasses}>
              <h3 className="font-semibold">ARIA explícita</h3>
              <Popover>
                <PopoverTrigger className={popoverTriggerClasses}>Abrir</PopoverTrigger>
                <PopoverContent
                  aria-label="Ajuda contextual explícita"
                  className={popoverContentClasses}
                >
                  Conteúdo identificado por aria-label fornecido pelo consumidor.
                </PopoverContent>
              </Popover>
            </div>

            <div className={popoverDemoClasses}>
              <h3 className="font-semibold">Conteúdo dinâmico</h3>
              <Popover>
                <PopoverTrigger className={popoverTriggerClasses}>Abrir</PopoverTrigger>
                <PopoverContent className={popoverContentClasses}>
                  <PopoverTitle>Itens: {dynamicPopoverContent}</PopoverTitle>
                  <Button onClick={() => setDynamicPopoverContent((value) => value + 1)}>
                    Adicionar conteúdo
                  </Button>
                  {Array.from({ length: dynamicPopoverContent }, (_, index) => (
                    <p key={index} className="text-sm text-hp-muted">Linha {index + 1}</p>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            <div className={popoverDemoClasses}>
              <h3 className="font-semibold">Trigger dinâmico</h3>
              <Button variant="secondary" onClick={() => setDynamicTriggerLong((value) => !value)}>
                Alterar trigger
              </Button>
              <Popover>
                <PopoverTrigger className={popoverTriggerClasses}>
                  {dynamicTriggerLong ? "Trigger com largura dinâmica ampliada" : "Trigger curto"}
                </PopoverTrigger>
                <PopoverContent className={popoverContentClasses}>Reposicionamento automático.</PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mt-6 h-56 overflow-auto rounded-[var(--radius-lg)] border border-hp-border p-[var(--space-6)]">
            <div className="min-h-[28rem] pt-28">
              <PopoverDemo title="Scroll em container" side="right" />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Popover>
              <PopoverTrigger className={popoverTriggerClasses}>Popovers aninhados</PopoverTrigger>
              <PopoverContent className={popoverContentClasses}>
                <PopoverTitle>Popover externo</PopoverTitle>
                <Popover>
                  <PopoverTrigger className={popoverTriggerClasses}>Abrir interno</PopoverTrigger>
                  <PopoverContent className={popoverContentClasses}>
                    <PopoverTitle>Popover interno</PopoverTitle>
                    <PopoverDescription>Camada contextual superior.</PopoverDescription>
                    <PopoverClose className={popoverCloseClasses}>Fechar interno</PopoverClose>
                  </PopoverContent>
                </Popover>
              </PopoverContent>
            </Popover>

            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>Popover no Dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Contexto Dialog</DialogTitle></DialogHeader>
                <PopoverDemo title="Popover contextual" />
                <DialogFooter><DialogClose className={dialogSecondaryClasses}>Fechar Dialog</DialogClose></DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>Popover no Drawer</DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader><DrawerTitle>Contexto Drawer</DrawerTitle></DrawerHeader>
                <div className="p-[var(--space-6)]"><PopoverDemo title="Popover contextual" /></div>
                <DrawerFooter><DrawerClose className={drawerSecondaryClasses}>Fechar Drawer</DrawerClose></DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowPopoverDemo mode="open" />
            <ShadowPopoverDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Tooltip"
          description="Informações auxiliares por hover e foco, com delay, posicionamento e portal contextual."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TooltipDemo title="Básico" />

            {(["top", "right", "bottom", "left"] as TooltipSide[]).map(
              (side) => (
                <TooltipDemo
                  key={side}
                  title={`Side ${side}`}
                  side={side}
                />
              ),
            )}

            {(["start", "center", "end"] as TooltipAlign[]).map((align) => (
              <TooltipDemo
                key={align}
                title={`Align ${align}`}
                align={align}
              />
            ))}

            {[0, 8, 16, -4].map((sideOffset) => (
              <TooltipDemo
                key={sideOffset}
                title={`Offset ${sideOffset}px`}
                sideOffset={sideOffset}
              />
            ))}

            <TooltipDemo
              title="Aberto inicialmente"
              defaultOpen
              description="Exemplo uncontrolled iniciado aberto."
            />

            <div className={tooltipDemoClasses}>
              <h3 className="font-semibold">Controlado</h3>
              <p className="text-sm text-hp-muted">
                Estado: {controlledTooltipOpen ? "aberto" : "fechado"}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setControlledTooltipOpen(true)}
                >
                  Abrir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setControlledTooltipOpen(false)}
                >
                  Fechar
                </Button>
              </div>

              <Tooltip
                open={controlledTooltipOpen}
                onOpenChange={setControlledTooltipOpen}
              >
                <TooltipTrigger className={tooltipTriggerClasses}>
                  Trigger controlado
                </TooltipTrigger>
                <TooltipContent>
                  Estado mantido pelo Playground.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className={tooltipDemoClasses}>
              <h3 className="font-semibold">Delay configurável</h3>
              <p className="text-sm text-hp-muted">
                Delay atual: {tooltipDelay} ms
              </p>

              <div className="flex flex-wrap gap-2">
                {[0, 500, 1000].map((delay) => (
                  <Button
                    key={delay}
                    size="sm"
                    variant={tooltipDelay === delay ? "primary" : "outline"}
                    onClick={() => setTooltipDelay(delay)}
                  >
                    {delay} ms
                  </Button>
                ))}
              </div>

              <Tooltip openDelay={tooltipDelay}>
                <TooltipTrigger className={tooltipTriggerClasses}>
                  Testar delay
                </TooltipTrigger>
                <TooltipContent>
                  Abriu após {tooltipDelay} ms.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className={tooltipDemoClasses}>
              <h3 className="font-semibold">Trigger desabilitado</h3>
              <Tooltip>
                <TooltipTrigger
                  className={tooltipTriggerClasses}
                  disabled
                >
                  Não deve abrir
                </TooltipTrigger>
                <TooltipContent>
                  Este conteúdo não deve ser exibido.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className={tooltipDemoClasses}>
              <h3 className="font-semibold">ARIA explícita preservada</h3>
              <Tooltip>
                <TooltipTrigger
                  className={tooltipTriggerClasses}
                  aria-describedby="descricao-externa"
                >
                  Trigger com descrição existente
                </TooltipTrigger>
                <TooltipContent>
                  O ID do Tooltip é combinado enquanto aberto.
                </TooltipContent>
              </Tooltip>
              <p id="descricao-externa" className="text-sm text-hp-muted">
                Descrição já fornecida pelo consumidor.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Tooltip no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    O Tooltip deve permanecer visível no top layer.
                  </DialogDescription>
                </DialogHeader>
                <TooltipDemo title="Tooltip contextual" side="bottom" />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Tooltip no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    O portal usa o conteúdo do Drawer como camada contextual.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <TooltipDemo title="Tooltip contextual" side="left" />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowTooltipDemo mode="open" />
            <ShadowTooltipDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Dropdown Menu"
          description="Menu de ações com navegação por teclado, seleção, dismiss e portal contextual."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DropdownMenuDemo title="Básico" />

            {(["top", "right", "bottom", "left"] as DropdownMenuSide[]).map(
              (side) => (
                <DropdownMenuDemo
                  key={side}
                  title={`Side ${side}`}
                  side={side}
                />
              ),
            )}

            {(["start", "center", "end"] as DropdownMenuAlign[]).map(
              (align) => (
                <DropdownMenuDemo
                  key={align}
                  title={`Align ${align}`}
                  align={align}
                />
              ),
            )}

            {[0, 8, 16, -4].map((sideOffset) => (
              <DropdownMenuDemo
                key={sideOffset}
                title={`Offset ${sideOffset}px`}
                sideOffset={sideOffset}
              />
            ))}

            <div className={dropdownMenuDemoClasses}>
              <h3 className="font-semibold">Controlado</h3>
              <p className="text-sm text-hp-muted">
                Estado: {controlledDropdownOpen ? "aberto" : "fechado"}
              </p>
              <DropdownMenu
                open={controlledDropdownOpen}
                onOpenChange={setControlledDropdownOpen}
              >
                <DropdownMenuTrigger className={dropdownMenuTriggerClasses}>
                  Alternar controlado
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Menu controlado</DropdownMenuLabel>
                  <DropdownMenuItem>Primeira ação</DropdownMenuItem>
                  <DropdownMenuItem>Segunda ação</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <DropdownMenuDemo
              title="Escape desativado"
              closeOnEscape={false}
              description="Escape não fecha; seleção e clique externo continuam ativos."
            />

            <DropdownMenuDemo
              title="Interação externa desativada"
              closeOnInteractOutside={false}
              description="Clique externo não fecha; Escape e seleção continuam ativos."
            />

            <div className={dropdownMenuDemoClasses}>
              <h3 className="font-semibold">Item desabilitado</h3>
              <DropdownMenu>
                <DropdownMenuTrigger className={dropdownMenuTriggerClasses}>
                  Abrir menu
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Item disponível</DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    Item desabilitado
                  </DropdownMenuItem>
                  <DropdownMenuItem>Outra ação</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className={dropdownMenuDemoClasses}>
              <h3 className="font-semibold">Seleção prevenida</h3>
              <p className="text-sm text-hp-muted">
                Tentativas: {preventedSelectionCount}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger className={dropdownMenuTriggerClasses}>
                  Abrir menu
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setPreventedSelectionCount((value) => value + 1);
                    }}
                  >
                    Manter menu aberto
                  </DropdownMenuItem>
                  <DropdownMenuItem>Fechar normalmente</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className={dropdownMenuDemoClasses}>
              <h3 className="font-semibold">Label, separador e danger</h3>
              <DropdownMenu>
                <DropdownMenuTrigger className={dropdownMenuTriggerClasses}>
                  Ações da conta
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Conta demonstrativa</DropdownMenuLabel>
                  <DropdownMenuItem>Visualizar perfil</DropdownMenuItem>
                  <DropdownMenuItem inset>Preferências</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="danger">
                    Encerrar sessão fictícia
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className={dropdownMenuDemoClasses}>
              <h3 className="font-semibold">Loop desativado</h3>
              <p className="text-sm text-hp-muted">
                As setas param no primeiro e no último item.
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger className={dropdownMenuTriggerClasses}>
                  Testar navegação
                </DropdownMenuTrigger>
                <DropdownMenuContent loop={false}>
                  <DropdownMenuItem>Primeiro</DropdownMenuItem>
                  <DropdownMenuItem>Segundo</DropdownMenuItem>
                  <DropdownMenuItem>Último</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className={dropdownMenuDemoClasses}>
              <h3 className="font-semibold">ID explícito do Trigger</h3>
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="dropdown-trigger-explicito"
                  className={dropdownMenuTriggerClasses}
                >
                  Abrir menu identificado
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Validar aria-labelledby</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Dropdown no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    O menu deve permanecer na camada correta do Dialog.
                  </DialogDescription>
                </DialogHeader>
                <DropdownMenuDemo title="Menu contextual" />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Dropdown no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    O menu usa o conteúdo do Drawer como portal contextual.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <DropdownMenuDemo title="Menu contextual" />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <DropdownMenu>
              <DropdownMenuTrigger className={dropdownMenuTriggerClasses}>
                Menus aninhados
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Menu externo</DropdownMenuLabel>
                <DropdownMenuItem>Primeira ação</DropdownMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger className={dropdownMenuNestedTriggerClasses}>
                    Abrir menu interno
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuLabel>Menu interno</DropdownMenuLabel>
                    <DropdownMenuItem>Ação interna A</DropdownMenuItem>
                    <DropdownMenuItem>Ação interna B</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowDropdownMenuDemo mode="open" />
            <ShadowDropdownMenuDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Context Menu"
          description="Menu contextual por clique direito ou teclado, com navegação, seleção, dismiss e portal contextual."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ContextMenuDemo title="Básico" />

            <div className={contextMenuDemoClasses}>
              <h3 className="font-semibold">Abertura pelo teclado</h3>
              <p className="text-sm text-hp-muted">
                Foque a área e use Shift + F10 ou a tecla Menu.
              </p>
              <ContextMenu>
                <ContextMenuTrigger className={contextMenuTriggerClasses}>
                  Área focável para teclado
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuLabel>Menu pelo teclado</ContextMenuLabel>
                  <ContextMenuItem>Primeira ação</ContextMenuItem>
                  <ContextMenuItem>Segunda ação</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>

            <div className={contextMenuDemoClasses}>
              <h3 className="font-semibold">Controlado</h3>
              <p className="text-sm text-hp-muted">
                Estado: {controlledContextMenuOpen ? "aberto" : "fechado"}
              </p>
              <ContextMenu
                open={controlledContextMenuOpen}
                onOpenChange={setControlledContextMenuOpen}
              >
                <ContextMenuTrigger className={contextMenuTriggerClasses}>
                  Clique com o botão direito
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuLabel>Menu controlado</ContextMenuLabel>
                  <ContextMenuItem>Primeira ação</ContextMenuItem>
                  <ContextMenuItem>Segunda ação</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>

            <ContextMenuDemo
              title="Escape desativado"
              closeOnEscape={false}
              description="Escape não fecha; seleção e clique externo continuam ativos."
            />

            <ContextMenuDemo
              title="Interação externa desativada"
              closeOnInteractOutside={false}
              description="Clique externo não fecha; Escape e seleção continuam ativos."
            />

            <div className={contextMenuDemoClasses}>
              <h3 className="font-semibold">Trigger desabilitado</h3>
              <ContextMenu>
                <ContextMenuTrigger
                  disabled
                  className={contextMenuTriggerClasses}
                >
                  Não deve abrir
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem>
                    Este conteúdo não deve aparecer
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>

            <div className={contextMenuDemoClasses}>
              <h3 className="font-semibold">Item desabilitado</h3>
              <ContextMenu>
                <ContextMenuTrigger className={contextMenuTriggerClasses}>
                  Clique com o botão direito
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem>Item disponível</ContextMenuItem>
                  <ContextMenuItem disabled>
                    Item desabilitado
                  </ContextMenuItem>
                  <ContextMenuItem>Outra ação</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>

            <div className={contextMenuDemoClasses}>
              <h3 className="font-semibold">Seleção prevenida</h3>
              <p className="text-sm text-hp-muted">
                Tentativas: {preventedContextSelectionCount}
              </p>
              <ContextMenu>
                <ContextMenuTrigger className={contextMenuTriggerClasses}>
                  Clique com o botão direito
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setPreventedContextSelectionCount(
                        (value) => value + 1,
                      );
                    }}
                  >
                    Manter menu aberto
                  </ContextMenuItem>
                  <ContextMenuItem>Fechar normalmente</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>

            <div className={contextMenuDemoClasses}>
              <h3 className="font-semibold">Label, separador e danger</h3>
              <ContextMenu>
                <ContextMenuTrigger className={contextMenuTriggerClasses}>
                  Clique com o botão direito
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuLabel>Conta demonstrativa</ContextMenuLabel>
                  <ContextMenuItem>Visualizar perfil</ContextMenuItem>
                  <ContextMenuItem inset>Preferências</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem variant="danger">
                    Remover item fictício
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>

            <div className={contextMenuDemoClasses}>
              <h3 className="font-semibold">Loop desativado</h3>
              <p className="text-sm text-hp-muted">
                As setas param no primeiro e no último item.
              </p>
              <ContextMenu>
                <ContextMenuTrigger className={contextMenuTriggerClasses}>
                  Testar navegação
                </ContextMenuTrigger>
                <ContextMenuContent loop={false}>
                  <ContextMenuItem>Primeiro</ContextMenuItem>
                  <ContextMenuItem>Segundo</ContextMenuItem>
                  <ContextMenuItem>Último</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>

            <div className={contextMenuDemoClasses}>
              <h3 className="font-semibold">Reposicionamento</h3>
              <p className="text-sm text-hp-muted">
                Abra em pontos diferentes da área enquanto o menu estiver aberto.
              </p>
              <ContextMenu>
                <ContextMenuTrigger className={contextMenuLargeTriggerClasses}>
                  Clique com o botão direito em posições diferentes
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem>Nova posição aplicada</ContextMenuItem>
                  <ContextMenuItem>Outra ação</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>

            <div className={contextMenuDemoClasses}>
              <h3 className="font-semibold">Fechamento por scroll</h3>
              <div className="h-36 w-full overflow-auto rounded-[var(--radius-md)] border border-hp-border p-[var(--space-4)]">
                <div className="min-h-64 pt-20">
                  <ContextMenu>
                    <ContextMenuTrigger className={contextMenuTriggerClasses}>
                      Abra e role o container
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem>
                        O scroll deve fechar o menu
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Context Menu no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    O menu deve permanecer na camada correta do Dialog.
                  </DialogDescription>
                </DialogHeader>
                <ContextMenuDemo title="Menu contextual" />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Context Menu no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    O menu usa o conteúdo do Drawer como portal contextual.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <ContextMenuDemo title="Menu contextual" />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <ContextMenu>
              <ContextMenuTrigger className={contextMenuTriggerClasses}>
                Menu contextual externo
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuLabel>Menu externo</ContextMenuLabel>
                <ContextMenuItem>Primeira ação</ContextMenuItem>
                <ContextMenu>
                  <ContextMenuTrigger className={contextMenuNestedTriggerClasses}>
                    Área do menu interno
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuLabel>Menu interno</ContextMenuLabel>
                    <ContextMenuItem>Ação interna A</ContextMenuItem>
                    <ContextMenuItem>Ação interna B</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </ContextMenuContent>
            </ContextMenu>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowContextMenuDemo mode="open" />
            <ShadowContextMenuDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Menubar"
          description="Barra horizontal de menus com abertura por mouse e teclado, troca entre menus e navegação acessível."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={menubarDemoClasses}>
              <h3 className="font-semibold">Básico</h3>
              <p className="text-sm text-hp-muted">
                Use clique, Enter, Espaço, ArrowDown ou ArrowUp para abrir.
              </p>
              <MenubarDemo />
            </div>

            <div className={menubarDemoClasses}>
              <h3 className="font-semibold">Controlado</h3>
              <p className="text-sm text-hp-muted">
                Menu ativo: {controlledMenubarValue ?? "nenhum"}
              </p>
              <Menubar
                value={controlledMenubarValue}
                onValueChange={setControlledMenubarValue}
              >
                <MenubarMenu value="arquivo-controlado">
                  <MenubarTrigger>Arquivo</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Novo arquivo</MenubarItem>
                    <MenubarItem>Abrir arquivo</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <MenubarMenu value="editar-controlado">
                  <MenubarTrigger>Editar</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Desfazer</MenubarItem>
                    <MenubarItem>Refazer</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>

            <div className={menubarDemoClasses}>
              <h3 className="font-semibold">Trigger desabilitado</h3>
              <Menubar>
                <MenubarMenu value="arquivo-disabled">
                  <MenubarTrigger>Arquivo</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Novo</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <MenubarMenu value="editar-disabled">
                  <MenubarTrigger disabled>Editar desabilitado</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Não deve abrir</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <MenubarMenu value="ajuda-disabled">
                  <MenubarTrigger>Ajuda</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Sobre</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>

            <div className={menubarDemoClasses}>
              <h3 className="font-semibold">Item desabilitado</h3>
              <Menubar>
                <MenubarMenu value="arquivo-item-disabled">
                  <MenubarTrigger>Arquivo</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Novo</MenubarItem>
                    <MenubarItem disabled>Salvar indisponível</MenubarItem>
                    <MenubarItem>Fechar</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <MenubarMenu value="ajuda-item-disabled">
                  <MenubarTrigger>Ajuda</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Documentação</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>

            <div className={menubarDemoClasses}>
              <h3 className="font-semibold">Seleção prevenida</h3>
              <p className="text-sm text-hp-muted">
                Tentativas: {preventedMenubarSelectionCount}
              </p>
              <Menubar>
                <MenubarMenu value="arquivo-prevented">
                  <MenubarTrigger>Arquivo</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem
                      onSelect={(event) => {
                        event.preventDefault();
                        setPreventedMenubarSelectionCount(
                          (value) => value + 1,
                        );
                      }}
                    >
                      Manter menu aberto
                    </MenubarItem>
                    <MenubarItem>Fechar normalmente</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <MenubarMenu value="ajuda-prevented">
                  <MenubarTrigger>Ajuda</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Sobre</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>

            <div className={menubarDemoClasses}>
              <h3 className="font-semibold">Label, Separator e Danger</h3>
              <Menubar>
                <MenubarMenu value="conta-completa">
                  <MenubarTrigger>Conta</MenubarTrigger>
                  <MenubarContent>
                    <MenubarLabel>Conta demonstrativa</MenubarLabel>
                    <MenubarItem>Perfil</MenubarItem>
                    <MenubarItem inset>Preferências</MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem variant="danger">
                      Encerrar sessão fictícia
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <MenubarMenu value="ajuda-completa">
                  <MenubarTrigger>Ajuda</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Central de ajuda</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>

            <div className={menubarDemoClasses}>
              <h3 className="font-semibold">Loop desativado</h3>
              <p className="text-sm text-hp-muted">
                ArrowLeft e ArrowRight param nas extremidades.
              </p>
              <Menubar loop={false}>
                <MenubarMenu value="primeiro-sem-loop">
                  <MenubarTrigger>Primeiro</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Ação A</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <MenubarMenu value="segundo-sem-loop">
                  <MenubarTrigger>Segundo</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Ação B</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <MenubarMenu value="ultimo-sem-loop">
                  <MenubarTrigger>Último</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Ação C</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>

            <div className={menubarDemoClasses}>
              <h3 className="font-semibold">Troca por hover</h3>
              <p className="text-sm text-hp-muted">
                Abra um menu e passe o mouse sobre os outros Triggers.
              </p>
              <MenubarDemo />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Menubar no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    Os menus devem permanecer na camada correta.
                  </DialogDescription>
                </DialogHeader>
                <MenubarDemo />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Menubar no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    Os menus usam o Drawer como portal contextual.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <MenubarDemo />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowMenubarDemo mode="open" />
            <ShadowMenubarDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Hover Card"
          description="Cartão informativo por hover ou foco, com delays, posicionamento e portal contextual."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <HoverCardDemo title="Básico" />

            {(["top", "right", "bottom", "left"] as HoverCardSide[]).map(
              (side) => (
                <HoverCardDemo
                  key={side}
                  title={`Side ${side}`}
                  side={side}
                />
              ),
            )}

            {(["start", "center", "end"] as HoverCardAlign[]).map(
              (align) => (
                <HoverCardDemo
                  key={align}
                  title={`Align ${align}`}
                  align={align}
                />
              ),
            )}

            {[0, 8, 16].map((sideOffset) => (
              <HoverCardDemo
                key={sideOffset}
                title={`Offset ${sideOffset}px`}
                sideOffset={sideOffset}
              />
            ))}

            <div className={hoverCardDemoClasses}>
              <h3 className="font-semibold">Controlado</h3>
              <p className="text-sm text-hp-muted">
                Estado: {controlledHoverCardOpen ? "aberto" : "fechado"}
              </p>
              <HoverCard
                open={controlledHoverCardOpen}
                onOpenChange={setControlledHoverCardOpen}
              >
                <HoverCardTrigger className={hoverCardTriggerClasses}>
                  Passe o mouse ou foque
                </HoverCardTrigger>
                <HoverCardContent>
                  <HoverCardTitle>Hover Card controlado</HoverCardTitle>
                  <HoverCardDescription>
                    Estado externo sincronizado com o componente.
                  </HoverCardDescription>
                </HoverCardContent>
              </HoverCard>
            </div>

            <div className={hoverCardDemoClasses}>
              <h3 className="font-semibold">Delay configurável</h3>
              <div className="grid w-full grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <span className="text-hp-muted">Abrir (ms)</span>
                  <input
                    className="field"
                    type="number"
                    min={0}
                    value={hoverCardOpenDelay}
                    onChange={(event) =>
                      setHoverCardOpenDelay(Number(event.target.value))
                    }
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-hp-muted">Fechar (ms)</span>
                  <input
                    className="field"
                    type="number"
                    min={0}
                    value={hoverCardCloseDelay}
                    onChange={(event) =>
                      setHoverCardCloseDelay(Number(event.target.value))
                    }
                  />
                </label>
              </div>

              <HoverCard
                openDelay={hoverCardOpenDelay}
                closeDelay={hoverCardCloseDelay}
              >
                <HoverCardTrigger className={hoverCardTriggerClasses}>
                  Testar delays
                </HoverCardTrigger>
                <HoverCardContent>
                  <HoverCardTitle>Delays personalizados</HoverCardTitle>
                  <HoverCardDescription>
                    Abra e feche para validar os tempos configurados.
                  </HoverCardDescription>
                </HoverCardContent>
              </HoverCard>
            </div>

            <div className={hoverCardDemoClasses}>
              <h3 className="font-semibold">Conteúdo interativo</h3>
              <HoverCard>
                <HoverCardTrigger className={hoverCardTriggerClasses}>
                  Perfil fictício
                </HoverCardTrigger>
                <HoverCardContent>
                  <HoverCardTitle>Marina Alves</HoverCardTitle>
                  <HoverCardDescription>
                    Consultora demonstrativa da HPTECH Platform.
                  </HoverCardDescription>
                  <button className={hoverCardActionClasses}>
                    Ver perfil fictício
                  </button>
                </HoverCardContent>
              </HoverCard>
            </div>

            <div className={hoverCardDemoClasses}>
              <h3 className="font-semibold">Transição Trigger → Content</h3>
              <p className="text-sm text-hp-muted">
                O cartão deve permanecer aberto ao mover o ponteiro.
              </p>
              <HoverCard closeDelay={400}>
                <HoverCardTrigger className={hoverCardTriggerClasses}>
                  Mova até o conteúdo
                </HoverCardTrigger>
                <HoverCardContent>
                  <HoverCardTitle>Permanência aberta</HoverCardTitle>
                  <HoverCardDescription>
                    O ponteiro pode sair do Trigger e entrar no cartão.
                  </HoverCardDescription>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Hover Card no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    O cartão deve permanecer na camada correta.
                  </DialogDescription>
                </DialogHeader>
                <HoverCardDemo title="Hover Card contextual" />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Hover Card no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    O cartão usa o Drawer como portal contextual.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <HoverCardDemo title="Hover Card contextual" />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowHoverCardDemo mode="open" />
            <ShadowHoverCardDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Navigation Menu"
          description="Navegação principal com links diretos, menus expansíveis, estado ativo e conteúdo contextual."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={navigationMenuDemoClasses}>
              <h3 className="font-semibold">Básico</h3>
              <p className="text-sm text-hp-muted">
                Links diretos e menus expansíveis na mesma navegação.
              </p>
              <NavigationMenuDemo />
            </div>

            <div className={navigationMenuDemoClasses}>
              <h3 className="font-semibold">Controlado</h3>
              <p className="text-sm text-hp-muted">
                Menu ativo: {controlledNavigationValue ?? "nenhum"}
              </p>
              <NavigationMenu
                value={controlledNavigationValue}
                onValueChange={setControlledNavigationValue}
                aria-label="Navegação controlada"
              >
                <NavigationMenuList>
                  <NavigationMenuLink href="#inicio-controlado" active>
                    Início
                  </NavigationMenuLink>

                  <NavigationMenuMenu value="produtos-controlado">
                    <NavigationMenuTrigger>Produtos</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <NavigationMenuLabel>Produtos</NavigationMenuLabel>
                      <NavigationMenuLink href="#sites-controlado">
                        Sites premium
                      </NavigationMenuLink>
                      <NavigationMenuLink href="#landing-controlado">
                        Landing pages
                      </NavigationMenuLink>
                    </NavigationMenuContent>
                  </NavigationMenuMenu>

                  <NavigationMenuMenu value="empresa-controlado">
                    <NavigationMenuTrigger>Empresa</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <NavigationMenuLink href="#sobre-controlado">
                        Sobre a HPTECH
                      </NavigationMenuLink>
                      <NavigationMenuLink href="#contato-controlado">
                        Contato
                      </NavigationMenuLink>
                    </NavigationMenuContent>
                  </NavigationMenuMenu>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className={navigationMenuDemoClasses}>
              <h3 className="font-semibold">Link ativo</h3>
              <NavigationMenu aria-label="Navegação com item ativo">
                <NavigationMenuList>
                  <NavigationMenuLink href="#dashboard-nav" active>
                    Dashboard
                  </NavigationMenuLink>
                  <NavigationMenuLink href="#crm-nav">CRM</NavigationMenuLink>
                  <NavigationMenuLink href="#agenda-nav">
                    Agenda
                  </NavigationMenuLink>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className={navigationMenuDemoClasses}>
              <h3 className="font-semibold">Trigger desabilitado</h3>
              <NavigationMenu aria-label="Navegação com trigger desabilitado">
                <NavigationMenuList>
                  <NavigationMenuMenu value="solucoes-disabled">
                    <NavigationMenuTrigger>Soluções</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <NavigationMenuLink href="#sites-disabled">
                        Sites
                      </NavigationMenuLink>
                    </NavigationMenuContent>
                  </NavigationMenuMenu>

                  <NavigationMenuMenu value="recursos-disabled">
                    <NavigationMenuTrigger disabled>
                      Recursos indisponíveis
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <NavigationMenuLink href="#nao-abrir">
                        Não deve abrir
                      </NavigationMenuLink>
                    </NavigationMenuContent>
                  </NavigationMenuMenu>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className={navigationMenuDemoClasses}>
              <h3 className="font-semibold">
                Label, Separator e Danger
              </h3>
              <NavigationMenu aria-label="Navegação completa">
                <NavigationMenuList>
                  <NavigationMenuMenu value="conta-navigation">
                    <NavigationMenuTrigger>Conta</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <NavigationMenuLabel>
                        Conta demonstrativa
                      </NavigationMenuLabel>
                      <NavigationMenuLink href="#perfil-navigation">
                        Perfil
                      </NavigationMenuLink>
                      <NavigationMenuLink
                        href="#preferencias-navigation"
                        inset
                      >
                        Preferências
                      </NavigationMenuLink>
                      <NavigationMenuSeparator />
                      <NavigationMenuLink
                        href="#sair-navigation"
                        variant="danger"
                      >
                        Encerrar sessão fictícia
                      </NavigationMenuLink>
                    </NavigationMenuContent>
                  </NavigationMenuMenu>

                  <NavigationMenuLink href="#ajuda-navigation">
                    Ajuda
                  </NavigationMenuLink>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className={navigationMenuDemoClasses}>
              <h3 className="font-semibold">Conteúdo amplo</h3>
              <NavigationMenu aria-label="Navegação com conteúdo amplo">
                <NavigationMenuList>
                  <NavigationMenuMenu value="plataforma-ampla">
                    <NavigationMenuTrigger>Plataforma</NavigationMenuTrigger>
                    <NavigationMenuContent className="w-[32rem]">
                      <NavigationMenuLabel>
                        Ecossistema HPTECH
                      </NavigationMenuLabel>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <NavigationMenuLink href="#crm-amplo">
                          CRM e Leads
                        </NavigationMenuLink>
                        <NavigationMenuLink href="#agenda-ampla">
                          Agenda
                        </NavigationMenuLink>
                        <NavigationMenuLink href="#financeiro-amplo">
                          Financeiro
                        </NavigationMenuLink>
                        <NavigationMenuLink href="#relatorios-amplo">
                          Relatórios
                        </NavigationMenuLink>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuMenu>

                  <NavigationMenuLink href="#precos-amplo">
                    Preços
                  </NavigationMenuLink>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className={navigationMenuDemoClasses}>
              <h3 className="font-semibold">Loop desativado</h3>
              <p className="text-sm text-hp-muted">
                ArrowLeft e ArrowRight param nas extremidades.
              </p>
              <NavigationMenu
                loop={false}
                aria-label="Navegação sem loop"
              >
                <NavigationMenuList>
                  <NavigationMenuMenu value="primeiro-navigation">
                    <NavigationMenuTrigger>Primeiro</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <NavigationMenuItem>Ação A</NavigationMenuItem>
                    </NavigationMenuContent>
                  </NavigationMenuMenu>

                  <NavigationMenuMenu value="segundo-navigation">
                    <NavigationMenuTrigger>Segundo</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <NavigationMenuItem>Ação B</NavigationMenuItem>
                    </NavigationMenuContent>
                  </NavigationMenuMenu>

                  <NavigationMenuMenu value="ultimo-navigation">
                    <NavigationMenuTrigger>Último</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <NavigationMenuItem>Ação C</NavigationMenuItem>
                    </NavigationMenuContent>
                  </NavigationMenuMenu>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className={navigationMenuDemoClasses}>
              <h3 className="font-semibold">Troca por hover</h3>
              <p className="text-sm text-hp-muted">
                Abra um menu e passe o ponteiro sobre outro Trigger.
              </p>
              <NavigationMenuDemo />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Navigation Menu no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    Os menus devem permanecer na camada correta.
                  </DialogDescription>
                </DialogHeader>
                <NavigationMenuDemo />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Navigation Menu no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    Os menus usam o Drawer como portal contextual.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="overflow-x-auto p-[var(--space-6)]">
                  <NavigationMenuDemo />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowNavigationMenuDemo mode="open" />
            <ShadowNavigationMenuDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Accordion"
          description="Seções expansíveis com modos single e multiple, estado controlado, collapsible, disabled e navegação por teclado."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={accordionDemoClasses}>
              <h3 className="font-semibold">Single</h3>
              <p className="text-sm text-hp-muted">
                Apenas um item permanece aberto por vez.
              </p>
              <Accordion defaultValue="single-1">
                <AccordionItem value="single-1">
                  <AccordionTrigger>O que é a HPTECH Platform?</AccordionTrigger>
                  <AccordionContent>
                    Base demonstrativa do Design System da HPTECH Platform.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="single-2">
                  <AccordionTrigger>Como funciona?</AccordionTrigger>
                  <AccordionContent>
                    Cada componente é validado tecnicamente e visualmente antes do commit.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="single-3">
                  <AccordionTrigger>Onde é usado?</AccordionTrigger>
                  <AccordionContent>
                    Em experiências web reutilizáveis da plataforma.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className={accordionDemoClasses}>
              <h3 className="font-semibold">Single + Collapsible</h3>
              <p className="text-sm text-hp-muted">
                O item aberto pode ser fechado novamente.
              </p>
              <Accordion collapsible defaultValue="collapsible-1">
                <AccordionItem value="collapsible-1">
                  <AccordionTrigger>Primeiro item</AccordionTrigger>
                  <AccordionContent>
                    Clique novamente no Trigger para fechar.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="collapsible-2">
                  <AccordionTrigger>Segundo item</AccordionTrigger>
                  <AccordionContent>
                    Ao abrir este, o anterior é fechado.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className={accordionDemoClasses}>
              <h3 className="font-semibold">Multiple</h3>
              <p className="text-sm text-hp-muted">
                Vários itens podem permanecer abertos simultaneamente.
              </p>
              <Accordion
                type="multiple"
                defaultValue={["multiple-1", "multiple-2"]}
              >
                <AccordionItem value="multiple-1">
                  <AccordionTrigger>CRM</AccordionTrigger>
                  <AccordionContent>
                    Gestão demonstrativa de leads e relacionamento.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="multiple-2">
                  <AccordionTrigger>Agenda</AccordionTrigger>
                  <AccordionContent>
                    Organização demonstrativa de compromissos e atendimentos.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="multiple-3">
                  <AccordionTrigger>Financeiro</AccordionTrigger>
                  <AccordionContent>
                    Visão demonstrativa de indicadores financeiros.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className={accordionDemoClasses}>
              <h3 className="font-semibold">Controlado — Single</h3>
              <p className="text-sm text-hp-muted">
                Valor atual: {controlledAccordionValue || "nenhum"}
              </p>
              <Accordion
                value={controlledAccordionValue}
                onValueChange={(value) =>
                  setControlledAccordionValue(
                    typeof value === "string" ? value : "",
                  )
                }
                collapsible
              >
                <AccordionItem value="item-1">
                  <AccordionTrigger>Item 1</AccordionTrigger>
                  <AccordionContent>
                    Estado controlado externamente.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Item 2</AccordionTrigger>
                  <AccordionContent>
                    Alterar este item atualiza o estado acima.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className={accordionDemoClasses}>
              <h3 className="font-semibold">Controlado — Multiple</h3>
              <p className="text-sm text-hp-muted">
                Abertos: {controlledAccordionMultiple.join(", ") || "nenhum"}
              </p>
              <Accordion
                type="multiple"
                value={controlledAccordionMultiple}
                onValueChange={(value) =>
                  setControlledAccordionMultiple(
                    Array.isArray(value) ? value : [],
                  )
                }
              >
                <AccordionItem value="item-a">
                  <AccordionTrigger>Item A</AccordionTrigger>
                  <AccordionContent>
                    Pode permanecer aberto com outros itens.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-b">
                  <AccordionTrigger>Item B</AccordionTrigger>
                  <AccordionContent>
                    Estado multiple controlado externamente.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-c">
                  <AccordionTrigger>Item C</AccordionTrigger>
                  <AccordionContent>
                    Também pode ser combinado com A e B.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className={accordionDemoClasses}>
              <h3 className="font-semibold">Disabled</h3>
              <Accordion defaultValue="enabled-item">
                <AccordionItem value="enabled-item">
                  <AccordionTrigger>Item disponível</AccordionTrigger>
                  <AccordionContent>
                    Este item funciona normalmente.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="disabled-item" disabled>
                  <AccordionTrigger>Item desabilitado</AccordionTrigger>
                  <AccordionContent>
                    Este conteúdo não deve ser aberto pelo usuário.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="enabled-item-2">
                  <AccordionTrigger>Outro item disponível</AccordionTrigger>
                  <AccordionContent>
                    A navegação por teclado deve ignorar o item desabilitado.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className={accordionDemoClasses}>
              <h3 className="font-semibold">Loop desativado</h3>
              <p className="text-sm text-hp-muted">
                ArrowDown e ArrowUp param nas extremidades.
              </p>
              <Accordion loop={false}>
                <AccordionItem value="loop-1">
                  <AccordionTrigger>Primeiro</AccordionTrigger>
                  <AccordionContent>Primeiro conteúdo.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="loop-2">
                  <AccordionTrigger>Segundo</AccordionTrigger>
                  <AccordionContent>Segundo conteúdo.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="loop-3">
                  <AccordionTrigger>Último</AccordionTrigger>
                  <AccordionContent>Último conteúdo.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className={accordionDemoClasses}>
              <h3 className="font-semibold">Conteúdo longo</h3>
              <Accordion collapsible defaultValue="long-1">
                <AccordionItem value="long-1">
                  <AccordionTrigger>Detalhes completos</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <p>
                        Este cenário valida múltiplos parágrafos e conteúdo mais extenso dentro da região expandida.
                      </p>
                      <p>
                        O layout deve manter largura, espaçamento, leitura e foco sem quebrar o restante do Playground.
                      </p>
                      <button className={accordionActionClasses}>
                        Ação demonstrativa
                      </button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Accordion no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    O Accordion deve funcionar normalmente dentro do modal.
                  </DialogDescription>
                </DialogHeader>
                <AccordionDemo />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Accordion no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    O Accordion deve funcionar normalmente dentro do Drawer.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <AccordionDemo />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowAccordionDemo mode="open" />
            <ShadowAccordionDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Collapsible"
          description="Bloco expansível independente com estado controlado e não controlado, disabled, forceMount e compatibilidade contextual."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={collapsibleDemoClasses}>
              <h3 className="font-semibold">Básico</h3>
              <CollapsibleDemo />
            </div>

            <div className={collapsibleDemoClasses}>
              <h3 className="font-semibold">Default Open</h3>
              <Collapsible defaultOpen>
                <CollapsibleTrigger className={collapsibleTriggerClasses}>
                  Seção aberta inicialmente
                </CollapsibleTrigger>
                <CollapsibleContent className={collapsibleContentClasses}>
                  Este conteúdo começa visível e pode ser recolhido.
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className={collapsibleDemoClasses}>
              <h3 className="font-semibold">Controlado</h3>
              <p className="text-sm text-hp-muted">
                Estado: {controlledCollapsibleOpen ? "aberto" : "fechado"}
              </p>
              <Collapsible
                open={controlledCollapsibleOpen}
                onOpenChange={setControlledCollapsibleOpen}
              >
                <CollapsibleTrigger className={collapsibleTriggerClasses}>
                  Alternar estado controlado
                </CollapsibleTrigger>
                <CollapsibleContent className={collapsibleContentClasses}>
                  O estado acima deve acompanhar a abertura e o fechamento.
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className={collapsibleDemoClasses}>
              <h3 className="font-semibold">Disabled</h3>
              <Collapsible disabled>
                <CollapsibleTrigger className={collapsibleTriggerClasses}>
                  Trigger desabilitado
                </CollapsibleTrigger>
                <CollapsibleContent className={collapsibleContentClasses}>
                  Este conteúdo não deve abrir pelo Trigger.
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className={collapsibleDemoClasses}>
              <h3 className="font-semibold">forceMount</h3>
              <p className="text-sm text-hp-muted">
                O conteúdo permanece montado quando fechado, usando hidden.
              </p>
              <Collapsible>
                <CollapsibleTrigger className={collapsibleTriggerClasses}>
                  Mostrar conteúdo montado
                </CollapsibleTrigger>
                <CollapsibleContent
                  forceMount
                  className={collapsibleContentClasses}
                >
                  Este elemento permanece no DOM mesmo no estado fechado.
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className={collapsibleDemoClasses}>
              <h3 className="font-semibold">Conteúdo interativo</h3>
              <Collapsible>
                <CollapsibleTrigger className={collapsibleTriggerClasses}>
                  Abrir ações
                </CollapsibleTrigger>
                <CollapsibleContent className={collapsibleContentClasses}>
                  <div className="space-y-3">
                    <p>
                      O conteúdo expandido pode conter controles interativos.
                    </p>
                    <button className={collapsibleActionClasses}>
                      Ação demonstrativa
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className={collapsibleDemoClasses}>
              <h3 className="font-semibold">Conteúdo longo</h3>
              <Collapsible defaultOpen>
                <CollapsibleTrigger className={collapsibleTriggerClasses}>
                  Detalhes completos
                </CollapsibleTrigger>
                <CollapsibleContent className={collapsibleContentClasses}>
                  <div className="space-y-3">
                    <p>
                      Este cenário valida leitura, espaçamento e comportamento
                      com um bloco maior de informações.
                    </p>
                    <p>
                      O Collapsible deve expandir e recolher sem afetar os
                      componentes vizinhos do Playground.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className={collapsibleDemoClasses}>
              <h3 className="font-semibold">Múltiplos independentes</h3>
              <div className="w-full space-y-3">
                <Collapsible>
                  <CollapsibleTrigger className={collapsibleTriggerClasses}>
                    Primeiro bloco
                  </CollapsibleTrigger>
                  <CollapsibleContent className={collapsibleContentClasses}>
                    Primeiro conteúdo independente.
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger className={collapsibleTriggerClasses}>
                    Segundo bloco
                  </CollapsibleTrigger>
                  <CollapsibleContent className={collapsibleContentClasses}>
                    Segundo conteúdo independente.
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Collapsible no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    O Collapsible deve funcionar normalmente dentro do modal.
                  </DialogDescription>
                </DialogHeader>
                <CollapsibleDemo />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Collapsible no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    O Collapsible deve funcionar normalmente dentro do Drawer.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <CollapsibleDemo />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowCollapsibleDemo mode="open" />
            <ShadowCollapsibleDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Scroll Area"
          description="Área de rolagem reutilizável com orientações vertical, horizontal e bidirecional, estados de borda e foco por teclado."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={scrollAreaDemoClasses}>
              <h3 className="font-semibold">Vertical</h3>
              <ScrollArea className="h-52 w-full rounded-[var(--radius-lg)] border border-hp-border">
                <div className="space-y-3 p-[var(--space-4)]">
                  {Array.from({ length: 16 }, (_, index) => (
                    <div
                      key={index}
                      className="rounded-[var(--radius-md)] border border-hp-border bg-hp-surface-subtle p-[var(--space-3)] text-sm"
                    >
                      Item vertical {index + 1}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className={scrollAreaDemoClasses}>
              <h3 className="font-semibold">Horizontal</h3>
              <ScrollArea
                orientation="horizontal"
                className="h-36 w-full rounded-[var(--radius-lg)] border border-hp-border"
              >
                <div className="flex w-max gap-3 p-[var(--space-4)]">
                  {Array.from({ length: 12 }, (_, index) => (
                    <div
                      key={index}
                      className="flex h-20 w-40 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-hp-border bg-hp-surface-subtle text-sm"
                    >
                      Card {index + 1}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className={scrollAreaDemoClasses}>
              <h3 className="font-semibold">Both</h3>
              <ScrollArea
                orientation="both"
                className="h-52 w-full rounded-[var(--radius-lg)] border border-hp-border"
              >
                <div className="grid w-[52rem] grid-cols-4 gap-3 p-[var(--space-4)]">
                  {Array.from({ length: 24 }, (_, index) => (
                    <div
                      key={index}
                      className="flex h-20 items-center justify-center rounded-[var(--radius-md)] border border-hp-border bg-hp-surface-subtle text-sm"
                    >
                      Bloco {index + 1}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className={scrollAreaDemoClasses}>
              <h3 className="font-semibold">Conteúdo curto</h3>
              <p className="text-sm text-hp-muted">
                Sem overflow, nenhuma rolagem deve ser necessária.
              </p>
              <ScrollArea className="h-40 w-full rounded-[var(--radius-lg)] border border-hp-border">
                <div className="p-[var(--space-4)] text-sm">
                  Conteúdo menor que o viewport.
                </div>
              </ScrollArea>
            </div>

            <div className={scrollAreaDemoClasses}>
              <h3 className="font-semibold">Foco por teclado</h3>
              <p className="text-sm text-hp-muted">
                Use Tab para focar o viewport e as setas/PageUp/PageDown para rolar.
              </p>
              <ScrollArea className="h-48 w-full rounded-[var(--radius-lg)] border border-hp-border">
                <div className="space-y-2 p-[var(--space-4)]">
                  {Array.from({ length: 18 }, (_, index) => (
                    <p key={index} className="text-sm">
                      Linha de navegação por teclado {index + 1}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className={scrollAreaDemoClasses}>
              <h3 className="font-semibold">Conteúdo interativo</h3>
              <ScrollArea className="h-48 w-full rounded-[var(--radius-lg)] border border-hp-border">
                <div className="space-y-3 p-[var(--space-4)]">
                  {Array.from({ length: 10 }, (_, index) => (
                    <button
                      key={index}
                      className={scrollAreaActionClasses}
                    >
                      Ação demonstrativa {index + 1}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className={scrollAreaDemoClasses}>
              <h3 className="font-semibold">Viewport customizado</h3>
              <ScrollArea
                className="h-48 w-full rounded-[var(--radius-lg)] border border-hp-border"
                viewportClassName="p-[var(--space-4)]"
              >
                <div className="space-y-3">
                  {Array.from({ length: 14 }, (_, index) => (
                    <div
                      key={index}
                      className="rounded-[var(--radius-md)] bg-hp-surface-subtle p-[var(--space-3)] text-sm"
                    >
                      Conteúdo customizado {index + 1}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className={scrollAreaDemoClasses}>
              <h3 className="font-semibold">Áreas independentes</h3>
              <div className="grid w-full grid-cols-2 gap-3">
                <ScrollArea className="h-40 rounded-[var(--radius-lg)] border border-hp-border">
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 12 }, (_, index) => (
                      <div key={index} className="text-sm">
                        A-{index + 1}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <ScrollArea className="h-40 rounded-[var(--radius-lg)] border border-hp-border">
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 12 }, (_, index) => (
                      <div key={index} className="text-sm">
                        B-{index + 1}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Scroll Area no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    A rolagem deve permanecer contida dentro do modal.
                  </DialogDescription>
                </DialogHeader>
                <ScrollAreaDemo />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Scroll Area no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    A área rolável deve funcionar normalmente dentro do Drawer.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <ScrollAreaDemo />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowScrollAreaDemo mode="open" />
            <ShadowScrollAreaDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Tabs"
          description="Navegação por abas com orientação horizontal e vertical, ativação automática ou manual, estado controlado e navegação por teclado."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={tabsDemoClasses}>
              <h3 className="font-semibold">Horizontal</h3>
              <Tabs defaultValue="visao">
                <TabsList>
                  <TabsTrigger value="visao">Visão geral</TabsTrigger>
                  <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>
                <TabsContent value="visao" className={tabsContentClasses}>
                  Conteúdo da visão geral.
                </TabsContent>
                <TabsContent value="detalhes" className={tabsContentClasses}>
                  Conteúdo de detalhes.
                </TabsContent>
                <TabsContent value="historico" className={tabsContentClasses}>
                  Conteúdo do histórico.
                </TabsContent>
              </Tabs>
            </div>

            <div className={tabsDemoClasses}>
              <h3 className="font-semibold">Vertical</h3>
              <Tabs defaultValue="perfil" orientation="vertical">
                <div className="flex gap-4">
                  <TabsList>
                    <TabsTrigger value="perfil">Perfil</TabsTrigger>
                    <TabsTrigger value="seguranca">Segurança</TabsTrigger>
                    <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
                  </TabsList>
                  <div className="min-w-0 flex-1">
                    <TabsContent value="perfil" className={tabsContentClasses}>
                      Configurações de perfil.
                    </TabsContent>
                    <TabsContent value="seguranca" className={tabsContentClasses}>
                      Configurações de segurança.
                    </TabsContent>
                    <TabsContent value="notificacoes" className={tabsContentClasses}>
                      Configurações de notificações.
                    </TabsContent>
                  </div>
                </div>
              </Tabs>
            </div>

            <div className={tabsDemoClasses}>
              <h3 className="font-semibold">Controlado</h3>
              <p className="text-sm text-hp-muted">
                Aba ativa: {controlledTabsValue}
              </p>
              <Tabs
                value={controlledTabsValue}
                onValueChange={setControlledTabsValue}
              >
                <TabsList>
                  <TabsTrigger value="visao">Visão</TabsTrigger>
                  <TabsTrigger value="crm">CRM</TabsTrigger>
                  <TabsTrigger value="agenda">Agenda</TabsTrigger>
                </TabsList>
                <TabsContent value="visao" className={tabsContentClasses}>
                  Estado controlado da visão.
                </TabsContent>
                <TabsContent value="crm" className={tabsContentClasses}>
                  Estado controlado do CRM.
                </TabsContent>
                <TabsContent value="agenda" className={tabsContentClasses}>
                  Estado controlado da Agenda.
                </TabsContent>
              </Tabs>
            </div>

            <div className={tabsDemoClasses}>
              <h3 className="font-semibold">Ativação manual</h3>
              <p className="text-sm text-hp-muted">
                Use as setas para mover o foco e Enter ou Espaço para ativar.
              </p>
              <Tabs defaultValue="um" activationMode="manual">
                <TabsList>
                  <TabsTrigger value="um">Um</TabsTrigger>
                  <TabsTrigger value="dois">Dois</TabsTrigger>
                  <TabsTrigger value="tres">Três</TabsTrigger>
                </TabsList>
                <TabsContent value="um" className={tabsContentClasses}>
                  Conteúdo Um.
                </TabsContent>
                <TabsContent value="dois" className={tabsContentClasses}>
                  Conteúdo Dois.
                </TabsContent>
                <TabsContent value="tres" className={tabsContentClasses}>
                  Conteúdo Três.
                </TabsContent>
              </Tabs>
            </div>

            <div className={tabsDemoClasses}>
              <h3 className="font-semibold">Trigger desabilitado</h3>
              <Tabs defaultValue="ativo">
                <TabsList>
                  <TabsTrigger value="ativo">Ativo</TabsTrigger>
                  <TabsTrigger value="bloqueado" disabled>
                    Desabilitado
                  </TabsTrigger>
                  <TabsTrigger value="outro">Outro</TabsTrigger>
                </TabsList>
                <TabsContent value="ativo" className={tabsContentClasses}>
                  Conteúdo ativo.
                </TabsContent>
                <TabsContent value="bloqueado" className={tabsContentClasses}>
                  Este conteúdo não deve ser acessado pelo trigger desabilitado.
                </TabsContent>
                <TabsContent value="outro" className={tabsContentClasses}>
                  Outro conteúdo.
                </TabsContent>
              </Tabs>
            </div>

            <div className={tabsDemoClasses}>
              <h3 className="font-semibold">Tabs desabilitado</h3>
              <Tabs defaultValue="primeiro" disabled>
                <TabsList>
                  <TabsTrigger value="primeiro">Primeiro</TabsTrigger>
                  <TabsTrigger value="segundo">Segundo</TabsTrigger>
                </TabsList>
                <TabsContent value="primeiro" className={tabsContentClasses}>
                  A navegação está desabilitada.
                </TabsContent>
                <TabsContent value="segundo" className={tabsContentClasses}>
                  Segundo conteúdo.
                </TabsContent>
              </Tabs>
            </div>

            <div className={tabsDemoClasses}>
              <h3 className="font-semibold">Loop desativado</h3>
              <p className="text-sm text-hp-muted">
                ArrowLeft e ArrowRight param nas extremidades.
              </p>
              <Tabs defaultValue="inicio" loop={false}>
                <TabsList>
                  <TabsTrigger value="inicio">Início</TabsTrigger>
                  <TabsTrigger value="meio">Meio</TabsTrigger>
                  <TabsTrigger value="fim">Fim</TabsTrigger>
                </TabsList>
                <TabsContent value="inicio" className={tabsContentClasses}>
                  Primeiro painel.
                </TabsContent>
                <TabsContent value="meio" className={tabsContentClasses}>
                  Painel intermediário.
                </TabsContent>
                <TabsContent value="fim" className={tabsContentClasses}>
                  Último painel.
                </TabsContent>
              </Tabs>
            </div>

            <div className={tabsDemoClasses}>
              <h3 className="font-semibold">forceMount</h3>
              <Tabs defaultValue="visivel">
                <TabsList>
                  <TabsTrigger value="visivel">Visível</TabsTrigger>
                  <TabsTrigger value="montado">Montado</TabsTrigger>
                </TabsList>
                <TabsContent value="visivel" className={tabsContentClasses}>
                  Painel visível.
                </TabsContent>
                <TabsContent
                  value="montado"
                  forceMount
                  className={tabsContentClasses}
                >
                  Este painel permanece montado quando inativo.
                </TabsContent>
              </Tabs>
            </div>

            <div className={tabsDemoClasses}>
              <h3 className="font-semibold">Conteúdo interativo</h3>
              <Tabs defaultValue="acoes">
                <TabsList>
                  <TabsTrigger value="acoes">Ações</TabsTrigger>
                  <TabsTrigger value="dados">Dados</TabsTrigger>
                </TabsList>
                <TabsContent value="acoes" className={tabsContentClasses}>
                  <button className={tabsActionClasses}>
                    Ação demonstrativa
                  </button>
                </TabsContent>
                <TabsContent value="dados" className={tabsContentClasses}>
                  Conteúdo de dados demonstrativo.
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Tabs no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    As abas devem funcionar normalmente dentro do modal.
                  </DialogDescription>
                </DialogHeader>
                <TabsDemo />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Tabs no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    As abas devem funcionar normalmente dentro do Drawer.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <TabsDemo />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowTabsDemo mode="open" />
            <ShadowTabsDemo mode="closed" />
          </div>
        </PlaygroundSection>


        <PlaygroundSection
          title="Toggle"
          description="Botão de alternância reutilizável com estados controlado e não controlado, variantes, tamanhos, disabled e semântica aria-pressed."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={toggleDemoClasses}>
              <h3 className="font-semibold">Básico</h3>
              <Toggle>Favorito</Toggle>
            </div>

            <div className={toggleDemoClasses}>
              <h3 className="font-semibold">Default Pressed</h3>
              <Toggle defaultPressed>Ativado inicialmente</Toggle>
            </div>

            <div className={toggleDemoClasses}>
              <h3 className="font-semibold">Controlado</h3>
              <p className="text-sm text-hp-muted">
                Estado: {controlledTogglePressed ? "pressionado" : "solto"}
              </p>
              <Toggle
                pressed={controlledTogglePressed}
                onPressedChange={setControlledTogglePressed}
              >
                Alternar estado
              </Toggle>
            </div>

            <div className={toggleDemoClasses}>
              <h3 className="font-semibold">Disabled</h3>
              <div className="flex flex-wrap gap-3">
                <Toggle disabled>Desabilitado</Toggle>
                <Toggle disabled defaultPressed>
                  Ativo desabilitado
                </Toggle>
              </div>
            </div>

            <div className={toggleDemoClasses}>
              <h3 className="font-semibold">Variantes</h3>
              <div className="flex flex-wrap gap-3">
                <Toggle variant="default">Default</Toggle>
                <Toggle variant="outline">Outline</Toggle>
                <Toggle variant="outline" defaultPressed>
                  Outline ativo
                </Toggle>
              </div>
            </div>

            <div className={toggleDemoClasses}>
              <h3 className="font-semibold">Tamanhos</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Toggle size="sm">Small</Toggle>
                <Toggle size="md">Medium</Toggle>
                <Toggle size="lg">Large</Toggle>
              </div>
            </div>

            <div className={toggleDemoClasses}>
              <h3 className="font-semibold">Conteúdo composto</h3>
              <div className="flex flex-wrap gap-3">
                <Toggle variant="outline">
                  <span aria-hidden="true">★</span>
                  Destaque
                </Toggle>
                <Toggle variant="outline" defaultPressed>
                  <span aria-hidden="true">✓</span>
                  Selecionado
                </Toggle>
              </div>
            </div>

            <div className={toggleDemoClasses}>
              <h3 className="font-semibold">Ações independentes</h3>
              <div className="flex flex-wrap gap-3">
                <Toggle>Negrito</Toggle>
                <Toggle>Itálico</Toggle>
                <Toggle>Sublinhado</Toggle>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Toggle no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto Dialog</DialogTitle>
                  <DialogDescription>
                    O Toggle deve funcionar normalmente dentro do modal.
                  </DialogDescription>
                </DialogHeader>
                <ToggleDemo />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Toggle no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Contexto Drawer</DrawerTitle>
                  <DrawerDescription>
                    O Toggle deve funcionar normalmente dentro do Drawer.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <ToggleDemo />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowToggleDemo mode="open" />
            <ShadowToggleDemo mode="closed" />
          </div>
        </PlaygroundSection>

        <PlaygroundSection
          title="ToggleGroup"
          description="Seleção exclusiva ou múltipla com navegação por teclado, orientação e estados controlados."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <ToggleGroupDemoCard title="Single">
              <ToggleGroup type="single" defaultValue="dia" aria-label="Período">
                <ToggleGroupItem value="dia">Dia</ToggleGroupItem>
                <ToggleGroupItem value="semana">Semana</ToggleGroupItem>
                <ToggleGroupItem value="mes">Mês</ToggleGroupItem>
              </ToggleGroup>
            </ToggleGroupDemoCard>

            <ToggleGroupDemoCard title="Multiple">
              <ToggleGroup type="multiple" defaultValue={["negrito"]} aria-label="Formatação">
                <ToggleGroupItem value="negrito">Negrito</ToggleGroupItem>
                <ToggleGroupItem value="italico">Itálico</ToggleGroupItem>
                <ToggleGroupItem value="sublinhado">Sublinhado</ToggleGroupItem>
              </ToggleGroup>
            </ToggleGroupDemoCard>

            <ToggleGroupDemoCard title="Controlled Single">
              <p className="text-sm text-hp-muted">Valor: {controlledToggleGroupSingle || "nenhum"}</p>
              <ToggleGroup
                type="single"
                value={controlledToggleGroupSingle}
                onValueChange={setControlledToggleGroupSingle}
                aria-label="Alinhamento controlado"
              >
                <ToggleGroupItem value="inicio">Início</ToggleGroupItem>
                <ToggleGroupItem value="centro">Centro</ToggleGroupItem>
                <ToggleGroupItem value="fim">Fim</ToggleGroupItem>
              </ToggleGroup>
            </ToggleGroupDemoCard>

            <ToggleGroupDemoCard title="Controlled Multiple">
              <p className="text-sm text-hp-muted">
                Valores: {controlledToggleGroupMultiple.join(", ") || "nenhum"}
              </p>
              <ToggleGroup
                type="multiple"
                value={controlledToggleGroupMultiple}
                onValueChange={setControlledToggleGroupMultiple}
                aria-label="Formatação controlada"
              >
                <ToggleGroupItem value="negrito">Negrito</ToggleGroupItem>
                <ToggleGroupItem value="italico">Itálico</ToggleGroupItem>
                <ToggleGroupItem value="codigo">Código</ToggleGroupItem>
              </ToggleGroup>
            </ToggleGroupDemoCard>

            <ToggleGroupDemoCard title="Disabled global">
              <ToggleGroup type="single" defaultValue="ativo" disabled aria-label="Grupo desabilitado">
                <ToggleGroupItem value="ativo">Ativo</ToggleGroupItem>
                <ToggleGroupItem value="inativo">Inativo</ToggleGroupItem>
              </ToggleGroup>
            </ToggleGroupDemoCard>

            <ToggleGroupDemoCard title="Item disabled">
              <ToggleGroup type="single" aria-label="Item desabilitado">
                <ToggleGroupItem value="primeiro">Primeiro</ToggleGroupItem>
                <ToggleGroupItem value="indisponivel" disabled>Indisponível</ToggleGroupItem>
                <ToggleGroupItem value="ultimo">Último</ToggleGroupItem>
              </ToggleGroup>
            </ToggleGroupDemoCard>

            <ToggleGroupDemoCard title="Horizontal e Keyboard">
              <ToggleGroup type="single" orientation="horizontal" aria-label="Navegação horizontal">
                <ToggleGroupItem value="a">A</ToggleGroupItem>
                <ToggleGroupItem value="b">B</ToggleGroupItem>
                <ToggleGroupItem value="c">C</ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-hp-muted">ArrowLeft, ArrowRight, Home e End.</p>
            </ToggleGroupDemoCard>

            <ToggleGroupDemoCard title="Vertical">
              <ToggleGroup type="single" orientation="vertical" aria-label="Navegação vertical">
                <ToggleGroupItem value="acima">Acima</ToggleGroupItem>
                <ToggleGroupItem value="centro">Centro</ToggleGroupItem>
                <ToggleGroupItem value="abaixo">Abaixo</ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-hp-muted">ArrowUp, ArrowDown, Home e End.</p>
            </ToggleGroupDemoCard>

            <ToggleGroupDemoCard title="Loop false">
              <ToggleGroup type="single" loop={false} aria-label="Navegação sem loop">
                <ToggleGroupItem value="inicio">Início</ToggleGroupItem>
                <ToggleGroupItem value="meio">Meio</ToggleGroupItem>
                <ToggleGroupItem value="fim">Fim</ToggleGroupItem>
              </ToggleGroup>
            </ToggleGroupDemoCard>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>ToggleGroup no Dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Preferência de visualização</DialogTitle>
                  <DialogDescription>Seleção exclusiva dentro do Dialog.</DialogDescription>
                </DialogHeader>
                <ToggleGroupDemo />
                <DialogFooter><DialogClose className={dialogSecondaryClasses}>Fechar Dialog</DialogClose></DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>ToggleGroup no Drawer</DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Preferências rápidas</DrawerTitle>
                  <DrawerDescription>Seleção múltipla dentro do Drawer.</DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]"><ToggleGroupDemo multiple /></div>
                <DrawerFooter><DrawerClose className={drawerSecondaryClasses}>Fechar Drawer</DrawerClose></DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowToggleGroupDemo mode="open" />
            <ShadowToggleGroupDemo mode="closed" />
          </div>
        </PlaygroundSection>

        <PlaygroundSection
          title="Breadcrumb"
          description="Hierarquia contextual acessível com links nativos, página atual, condensação responsiva e composição em overlays."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <BreadcrumbDemoCard title="Simples e separador padrão">
              <Breadcrumb
                items={[{ label: "Início", href: "#breadcrumb-inicio" }]}
                currentLabel="CRM"
              />
              <p className="text-xs text-hp-muted">
                Use Tab para validar o link; a página atual não recebe foco.
              </p>
            </BreadcrumbDemoCard>

            <BreadcrumbDemoCard title="Um único nível">
              <Breadcrumb items={[]} currentLabel="Centro Comercial" />
            </BreadcrumbDemoCard>

            <BreadcrumbDemoCard title="Centro, módulo e página">
              <Breadcrumb
                items={[
                  { label: "Centro Comercial", href: "#centro-comercial" },
                  { label: "CRM", href: "#crm" },
                ]}
                currentLabel="Leads"
              />
            </BreadcrumbDemoCard>

            <BreadcrumbDemoCard title="Separador customizado">
              <Breadcrumb
                items={[
                  { label: "Centro Clínico", href: "#centro-clinico" },
                  { label: "Agenda", href: "#agenda" },
                ]}
                currentLabel="Agendamentos"
                separator={<span aria-hidden="true">›</span>}
              />
            </BreadcrumbDemoCard>

            <BreadcrumbDemoCard title="maxItems e DropdownMenu">
              <Breadcrumb
                items={[
                  { label: "HPTECH", href: "#hptech" },
                  { label: "Centro Administrativo", href: "#administrativo" },
                  { label: "Configurações", href: "#configuracoes" },
                  { label: "Equipe", href: "#equipe" },
                  { label: "Permissões", href: "#permissoes" },
                ]}
                currentLabel="Editar perfil"
                maxItems={4}
              />
              <p className="text-xs text-hp-muted">
                A origem e a página atual permanecem; os níveis intermediários
                ficam acessíveis no menu.
              </p>
            </BreadcrumbDemoCard>

            <BreadcrumbDemoCard title="Labels longos e overflow">
              <div className="w-full max-w-[390px] overflow-hidden rounded-[var(--radius-md)] border border-hp-border p-[var(--space-3)]">
                <Breadcrumb
                  items={[
                    {
                      label: "Centro Operacional de Inteligência Artificial",
                      href: "#centro-inteligencia",
                    },
                    {
                      label: "Automações e recomendações assistidas",
                      href: "#automacoes",
                    },
                  ]}
                  currentLabel="Configuração detalhada da recomendação"
                />
              </div>
              <p className="text-xs text-hp-muted">
                Cenário equivalente a 390px; os nomes acessíveis permanecem
                completos apesar do truncamento visual.
              </p>
            </BreadcrumbDemoCard>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Breadcrumb no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Navegação contextual</DialogTitle>
                  <DialogDescription>
                    Composição do Breadcrumb dentro do Dialog oficial.
                  </DialogDescription>
                </DialogHeader>
                <BreadcrumbDemo />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Breadcrumb no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Navegação contextual</DrawerTitle>
                  <DrawerDescription>
                    Composição do Breadcrumb dentro do Drawer oficial.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <BreadcrumbDemo />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowBreadcrumbDemo mode="open" />
            <ShadowBreadcrumbDemo mode="closed" />
          </div>
        </PlaygroundSection>

        <PlaygroundSection
          title="Pagination"
          description="Navegação controlada e não controlada com limites seguros, ellipsis determinístico e controles acessíveis."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <PaginationDemoCard title="Básico e página intermediária">
              <Pagination defaultPage={5} totalPages={10} />
              <p className="text-xs text-hp-muted">
                Inclui primeira, anterior, números, próxima e última.
              </p>
            </PaginationDemoCard>

            <PaginationDemoCard title="Primeira página">
              <Pagination page={1} totalPages={10} />
            </PaginationDemoCard>

            <PaginationDemoCard title="Última página">
              <Pagination page={10} totalPages={10} />
            </PaginationDemoCard>

            <PaginationDemoCard title="Poucas páginas sem ellipsis">
              <Pagination defaultPage={2} totalPages={4} />
            </PaginationDemoCard>

            <PaginationDemoCard title="Muitas páginas com ellipsis">
              <Pagination defaultPage={25} totalPages={50} />
            </PaginationDemoCard>

            <PaginationDemoCard title="siblingCount = 2">
              <Pagination
                defaultPage={10}
                totalPages={20}
                siblingCount={2}
              />
            </PaginationDemoCard>

            <PaginationDemoCard title="boundaryCount = 2">
              <Pagination
                defaultPage={10}
                totalPages={20}
                boundaryCount={2}
              />
            </PaginationDemoCard>

            <PaginationDemoCard title="Controlled">
              <p className="text-sm text-hp-muted">
                Página atual: {controlledPaginationPage}
              </p>
              <Pagination
                page={controlledPaginationPage}
                totalPages={12}
                onPageChange={setControlledPaginationPage}
              />
            </PaginationDemoCard>

            <PaginationDemoCard title="Uncontrolled">
              <Pagination defaultPage={3} totalPages={8} />
            </PaginationDemoCard>

            <PaginationDemoCard title="Disabled global">
              <Pagination defaultPage={3} totalPages={8} disabled />
            </PaginationDemoCard>

            <PaginationDemoCard title="totalPages = 1">
              <Pagination totalPages={1} />
            </PaginationDemoCard>

            <PaginationDemoCard title="Redução dinâmica de totalPages">
              <p className="text-sm text-hp-muted">
                Página {dynamicPaginationPage} de {dynamicPaginationTotal}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextTotal = dynamicPaginationTotal === 12 ? 4 : 12;
                  setDynamicPaginationTotal(nextTotal);
                  setDynamicPaginationPage((currentPage) =>
                    Math.min(currentPage, nextTotal),
                  );
                }}
              >
                {dynamicPaginationTotal === 12
                  ? "Reduzir para 4 páginas"
                  : "Restaurar 12 páginas"}
              </Button>
              <Pagination
                page={dynamicPaginationPage}
                totalPages={dynamicPaginationTotal}
                onPageChange={setDynamicPaginationPage}
              />
            </PaginationDemoCard>

            <PaginationDemoCard title="Mobile equivalente a 390px">
              <div className="w-full max-w-[390px] overflow-hidden rounded-[var(--radius-md)] border border-hp-border p-[var(--space-2)]">
                <Pagination defaultPage={24} totalPages={48} />
              </div>
              <p className="text-xs text-hp-muted">
                A rolagem horizontal permanece interna quando necessária.
              </p>
            </PaginationDemoCard>

            <PaginationDemoCard title="aria-current e Tab">
              <Pagination
                defaultPage={3}
                totalPages={6}
                ariaLabel="Paginar resultados demonstrativos"
              />
              <p className="text-xs text-hp-muted">
                Use Tab na ordem visual; a página 3 possui aria-current.
              </p>
            </PaginationDemoCard>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Pagination no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Resultados paginados</DialogTitle>
                  <DialogDescription>
                    Composição da Pagination dentro do Dialog oficial.
                  </DialogDescription>
                </DialogHeader>
                <PaginationDemo />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>
                    Fechar Dialog
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Pagination no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Resultados paginados</DrawerTitle>
                  <DrawerDescription>
                    Composição da Pagination dentro do Drawer oficial.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <PaginationDemo />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowPaginationDemo mode="open" />
            <ShadowPaginationDemo mode="closed" />
          </div>
        </PlaygroundSection>

        <PlaygroundSection
          title="Table"
          description="Primitives tabulares semânticas e composáveis, independentes de sorting, filtros, paginação e estado de DataGrid."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <TableDemoCard title="Básico, Header, Body e Caption">
              <Table>
                <TableCaption>Leads demonstrativos do Centro Comercial.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Nome</TableHead>
                    <TableHead scope="col">Origem</TableHead>
                    <TableHead scope="col">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableHead scope="row">Marina Costa</TableHead>
                    <TableCell>Indicação</TableCell>
                    <TableCell>Qualificação</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead scope="row">Lucas Almeida</TableHead>
                    <TableCell>Landing page</TableCell>
                    <TableCell>Novo</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableDemoCard>

            <TableDemoCard title="Footer, striped e compact">
              <Table striped density="compact">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Categoria</TableHead>
                    <TableHead scope="col" className="text-right">
                      Quantidade
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Novos</TableCell>
                    <TableCell className="text-right">12</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Em atendimento</TableCell>
                    <TableCell className="text-right">8</TableCell>
                  </TableRow>
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableHead scope="row">Total</TableHead>
                    <TableCell className="text-right">20</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableDemoCard>

            <TableDemoCard title="Avatar, Badge, Checkbox e ações">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col" className="w-12">
                      <span className="sr-only">Selecionar</span>
                    </TableHead>
                    <TableHead scope="col">Contato</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col" className="text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow selected aria-selected="true">
                    <TableCell>
                      <Checkbox
                        label={<span className="sr-only">Selecionar Marina Costa</span>}
                        defaultChecked
                        className="w-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name="Marina Costa" size="sm" />
                        <span className="font-medium">Marina Costa</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" dot>
                        Ativo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className={dropdownMenuTriggerClasses}>
                          Opções
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Visualizar</DropdownMenuItem>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  <TableRow aria-disabled="true">
                    <TableCell>
                      <Checkbox
                        label={<span className="sr-only">Selecionar Equipe Demo</span>}
                        disabled
                        className="w-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name="Equipe Demo" size="sm" shape="rounded" />
                        <span>Equipe Demo</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge>Indisponível</Badge>
                    </TableCell>
                    <TableCell className="text-right">Sem ações</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableDemoCard>

            <TableDemoCard title="Texto longo e hover de linha">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Registro</TableHead>
                    <TableHead scope="col">Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableHead scope="row">Exemplo 01</TableHead>
                    <TableCell className="max-w-xs whitespace-normal">
                      Conteúdo demonstrativo longo para validar quebra de linha,
                      leitura, alinhamento vertical e preservação da semântica.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableDemoCard>

            <TableDemoCard title="Estado vazio com EmptyState">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Nome</TableHead>
                    <TableHead scope="col">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <EmptyState
                        title="Nenhum registro encontrado"
                        description="A tabela permanece semântica e o estado vazio é composto externamente."
                        size="sm"
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableDemoCard>

            <TableDemoCard title="Loading com Skeleton">
              <Table aria-busy="true">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Nome</TableHead>
                    <TableHead scope="col">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton variant="text" /></TableCell>
                      <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableDemoCard>
          </div>

          <div className="mt-6 grid gap-4">
            <TableDemoCard title="Muitas colunas em ScrollArea horizontal">
              <ScrollArea orientation="horizontal" viewportClassName="pb-2">
                <div className="min-w-[64rem]">
                  <WideTableDemo />
                </div>
              </ScrollArea>
            </TableDemoCard>

            <TableDemoCard title="Responsivo e 390px/mobile">
              <div className="w-full max-w-[390px]">
                <ScrollArea orientation="horizontal" viewportClassName="pb-2">
                  <div className="min-w-[44rem]">
                    <TableDemo />
                  </div>
                </ScrollArea>
              </div>
            </TableDemoCard>

            <TableDemoCard title="Composição externa com Pagination">
              <ScrollArea orientation="horizontal" viewportClassName="pb-2">
                <div className="min-w-[36rem]">
                  <TableDemo />
                </div>
              </ScrollArea>
              <Pagination defaultPage={2} totalPages={8} />
            </TableDemoCard>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>
                Table no Dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registros demonstrativos</DialogTitle>
                  <DialogDescription>
                    Tabela semântica dentro do Dialog oficial.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea orientation="horizontal" viewportClassName="pb-2">
                  <div className="min-w-[36rem]"><TableDemo /></div>
                </ScrollArea>
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>Fechar</DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>
                Table no Drawer
              </DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Registros demonstrativos</DrawerTitle>
                  <DrawerDescription>
                    Tabela semântica dentro do Drawer oficial.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]">
                  <ScrollArea orientation="horizontal" viewportClassName="pb-2">
                    <div className="min-w-[36rem]"><TableDemo /></div>
                  </ScrollArea>
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>Fechar</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowTableDemo mode="open" />
            <ShadowTableDemo mode="closed" />
          </div>
        </PlaygroundSection>

        <PlaygroundSection
          title="DS-18 — DataGrid"
          description="Grade genérica com single-sort, seleção múltipla, visibilidade de colunas e estados compostos sobre Table e ScrollArea oficiais."
        >
          <div className="grid gap-4">
            <DataGridDemoCard title="Básico, várias colunas e células compostas">
              <DataGrid
                rows={DATA_GRID_ROWS}
                columns={DATA_GRID_COLUMNS}
                getRowId={(row) => row.id}
                getRowLabel={(row) => row.name}
                caption="Leads fictícios para homologação do DataGrid."
              />
              <p className="text-xs text-hp-muted">
                Inclui Avatar, Badge, texto longo e ações com DropdownMenu.
              </p>
            </DataGridDemoCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <DataGridDemoCard title="Single-sort uncontrolled">
                <DataGrid
                  rows={DATA_GRID_ROWS}
                  columns={DATA_GRID_COMPACT_COLUMNS}
                  getRowId={(row) => row.id}
                  getRowLabel={(row) => row.name}
                  defaultSort={{ columnId: "name", direction: "asc" }}
                />
                <p className="text-xs text-hp-muted">
                  Clique ou use Tab + Enter/Espaço: none → asc → desc → none.
                </p>
              </DataGridDemoCard>

              <DataGridDemoCard title="Sorting controlled">
                <p className="text-sm text-hp-muted">
                  Estado: {formatGridSort(controlledGridSort)}
                </p>
                <DataGrid
                  rows={DATA_GRID_ROWS}
                  columns={DATA_GRID_COMPACT_COLUMNS}
                  getRowId={(row) => row.id}
                  sort={controlledGridSort}
                  onSortChange={setControlledGridSort}
                />
              </DataGridDemoCard>

              <DataGridDemoCard title="manualSorting/server-side simulado">
                <p className="text-sm text-hp-muted">
                  Solicitação: {formatGridSort(manualGridSort)}
                </p>
                <DataGrid
                  rows={DATA_GRID_ROWS}
                  columns={DATA_GRID_COMPACT_COLUMNS}
                  getRowId={(row) => row.id}
                  sort={manualGridSort}
                  onSortChange={setManualGridSort}
                  manualSorting
                />
                <p className="text-xs text-hp-muted">
                  A ordem original permanece; somente o callback é emitido.
                </p>
              </DataGridDemoCard>

              <DataGridDemoCard title="Seleção, select-all e indeterminate">
                <DataGrid
                  rows={DATA_GRID_ROWS}
                  columns={DATA_GRID_COMPACT_COLUMNS}
                  getRowId={(row) => row.id}
                  getRowLabel={(row) => row.name}
                  selectionMode="multiple"
                  defaultSelectedRowIds={["lead-1"]}
                  isRowDisabled={(row) => row.disabled}
                />
                <p className="text-xs text-hp-muted">
                  Uma linha inicia selecionada e a linha desabilitada é ignorada
                  pelo select-all.
                </p>
              </DataGridDemoCard>

              <DataGridDemoCard title="Seleção controlled">
                <p className="text-sm text-hp-muted">
                  IDs: {controlledGridSelection.join(", ") || "nenhum"}
                </p>
                <DataGrid
                  rows={DATA_GRID_ROWS}
                  columns={DATA_GRID_COMPACT_COLUMNS}
                  getRowId={(row) => row.id}
                  getRowLabel={(row) => row.name}
                  selectionMode="multiple"
                  selectedRowIds={controlledGridSelection}
                  onSelectedRowIdsChange={setControlledGridSelection}
                  isRowDisabled={(row) => row.disabled}
                />
              </DataGridDemoCard>

              <DataGridDemoCard title="Column visibility controlled">
                <p className="text-sm text-hp-muted">
                  Nome é obrigatório e não aparece entre as opções ocultáveis.
                </p>
                <DataGrid
                  rows={DATA_GRID_ROWS}
                  columns={DATA_GRID_VISIBILITY_COLUMNS}
                  getRowId={(row) => row.id}
                  columnVisibility={controlledGridVisibility}
                  onColumnVisibilityChange={setControlledGridVisibility}
                />
              </DataGridDemoCard>

              <DataGridDemoCard title="EmptyState">
                <DataGrid
                  rows={[]}
                  columns={DATA_GRID_COMPACT_COLUMNS}
                  getRowId={(row) => row.id}
                  emptyState={
                    <EmptyState
                      title="Nenhum lead encontrado"
                      description="Ajuste os filtros externos para tentar novamente."
                      size="sm"
                    />
                  }
                />
              </DataGridDemoCard>

              <DataGridDemoCard title="Loading com Skeleton">
                <DataGrid
                  rows={[]}
                  columns={DATA_GRID_COMPACT_COLUMNS}
                  getRowId={(row) => row.id}
                  loading
                  loadingRowCount={4}
                />
              </DataGridDemoCard>

              <DataGridDemoCard title="Density comfortable e striped">
                <DataGrid
                  rows={DATA_GRID_ROWS}
                  columns={DATA_GRID_COMPACT_COLUMNS}
                  getRowId={(row) => row.id}
                  density="comfortable"
                  striped
                />
              </DataGridDemoCard>

              <DataGridDemoCard title="Density compact">
                <DataGrid
                  rows={DATA_GRID_ROWS}
                  columns={DATA_GRID_COMPACT_COLUMNS}
                  getRowId={(row) => row.id}
                  density="compact"
                />
              </DataGridDemoCard>
            </div>

            <DataGridDemoCard title="390px/mobile e ScrollArea horizontal">
              <div className="w-full max-w-[390px]">
                <DataGrid
                  rows={DATA_GRID_ROWS}
                  columns={DATA_GRID_COLUMNS}
                  getRowId={(row) => row.id}
                  getRowLabel={(row) => row.name}
                  selectionMode="multiple"
                />
              </div>
            </DataGridDemoCard>

            <DataGridDemoCard title="Pagination externa e seleção entre páginas">
              <p className="text-sm text-hp-muted">
                Página {gridDemoPage}; selecionados preservados: {crossPageSelection.join(", ") || "nenhum"}
              </p>
              <DataGrid
                rows={gridDemoPage === 1 ? DATA_GRID_ROWS.slice(0, 2) : DATA_GRID_ROWS.slice(2)}
                columns={DATA_GRID_COMPACT_COLUMNS}
                getRowId={(row) => row.id}
                getRowLabel={(row) => row.name}
                selectionMode="multiple"
                selectedRowIds={crossPageSelection}
                onSelectedRowIdsChange={setCrossPageSelection}
                isRowDisabled={(row) => row.disabled}
              />
              <Pagination
                page={gridDemoPage}
                totalPages={2}
                onPageChange={setGridDemoPage}
              />
            </DataGridDemoCard>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger className={dialogTriggerClasses}>DataGrid no Dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Leads demonstrativos</DialogTitle>
                  <DialogDescription>
                    Sorting, seleção e configuração de colunas dentro do Dialog.
                  </DialogDescription>
                </DialogHeader>
                <DataGridDemo />
                <DialogFooter>
                  <DialogClose className={dialogSecondaryClasses}>Fechar</DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger className={drawerTriggerClasses}>DataGrid no Drawer</DrawerTrigger>
              <DrawerOverlay />
              <DrawerContent size="lg">
                <DrawerHeader>
                  <DrawerTitle>Leads demonstrativos</DrawerTitle>
                  <DrawerDescription>
                    Sorting, seleção e configuração de colunas dentro do Drawer.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-6)]"><DataGridDemo /></div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>Fechar</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShadowDataGridDemo mode="open" />
            <ShadowDataGridDemo mode="closed" />
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

        <PlaygroundSection
          title="Drawer"
          description="Validação das posições, políticas de fechamento, foco modal, tamanhos e composição aninhada."
        >
          <button
            ref={externalFocusRef}
            type="button"
            className={drawerSecondaryClasses}
          >
            Destino externo para teste de foco
          </button>

          <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
            <Drawer>
              <Card>
                <DrawerDemoHeading
                  title="Básico à direita"
                  description="Uncontrolled, tamanho md, trap de foco e todos os fechamentos padrão."
                />
                <DrawerTrigger className={drawerTriggerClasses}>
                  Abrir Drawer básico
                </DrawerTrigger>
              </Card>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Dados demonstrativos</DrawerTitle>
                  <DrawerDescription>
                    Exemplo fictício para validar foco, rolagem e fechamento.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="space-y-4 p-[var(--space-4)]">
                  <Button variant="secondary">Primeiro botão</Button>
                  <Input label="Nome de demonstração" placeholder="Equipe Demo" />
                  <Button
                    variant="outline"
                    onClick={() => externalFocusRef.current?.focus()}
                  >
                    Tentar focar elemento externo
                  </Button>
                  {Array.from({ length: 12 }, (_, index) => (
                    <p key={index} className="text-sm text-hp-muted">
                      Conteúdo fictício {index + 1} para validar a rolagem interna
                      sem ampliar horizontalmente a página.
                    </p>
                  ))}
                </div>
                <DrawerFooter>
                  <Button variant="ghost">Último botão do ciclo</Button>
                  <DrawerClose className={drawerPrimaryClasses}>
                    Fechar
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <Drawer>
              <Card>
                <DrawerDemoHeading
                  title="Lateral esquerda"
                  description="Posição left com largura sm."
                />
                <DrawerTrigger className={drawerTriggerClasses}>
                  Abrir à esquerda
                </DrawerTrigger>
              </Card>
              <DrawerOverlay />
              <DrawerContent side="left" size="sm">
                <DrawerHeader>
                  <DrawerTitle>Navegação auxiliar</DrawerTitle>
                  <DrawerDescription>
                    Conteúdo fictício alinhado à esquerda.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-4)] text-sm text-hp-muted">
                  Nenhuma ação de negócio é executada neste exemplo.
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerPrimaryClasses}>Fechar</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <Drawer>
              <Card>
                <DrawerDemoHeading
                  title="Inferior"
                  description="Side bottom, sem size, com altura e rolagem intrínsecas."
                />
                <DrawerTrigger className={drawerTriggerClasses}>
                  Abrir inferior
                </DrawerTrigger>
              </Card>
              <DrawerOverlay />
              <DrawerContent side="bottom">
                <DrawerHeader>
                  <DrawerTitle>Resumo da operação</DrawerTitle>
                  <DrawerDescription>
                    Drawer inferior responsivo e sem tamanho lateral.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="space-y-3 p-[var(--space-4)] text-sm text-hp-muted">
                  {Array.from({ length: 8 }, (_, index) => (
                    <p key={index}>Linha demonstrativa {index + 1}.</p>
                  ))}
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerPrimaryClasses}>Concluir</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <Card>
              <DrawerDemoHeading
                title="Tamanhos laterais"
                description={`Tamanho selecionado: ${drawerSize}`}
              />
              <div className="mb-4 flex flex-wrap gap-2">
                {(["sm", "md", "lg", "xl"] as const).map((size) => (
                  <Button
                    key={size}
                    size="sm"
                    variant={drawerSize === size ? "primary" : "outline"}
                    onClick={() => setDrawerSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
              <Drawer>
                <DrawerTrigger className={drawerTriggerClasses}>
                  Abrir tamanho {drawerSize}
                </DrawerTrigger>
                <DrawerOverlay />
                <DrawerContent side="right" size={drawerSize}>
                  <DrawerHeader>
                    <DrawerTitle>Drawer lateral {drawerSize}</DrawerTitle>
                    <DrawerDescription>
                      Validação das quatro larguras oficiais.
                    </DrawerDescription>
                  </DrawerHeader>
                  <DrawerFooter>
                    <DrawerClose className={drawerPrimaryClasses}>Fechar</DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </Card>

            <Card>
              <DrawerDemoHeading
                title="Controlled"
                description={`Estado: ${controlledDrawerOpen ? "aberto" : "fechado"}`}
              />
              <Button onClick={() => setControlledDrawerOpen(true)}>
                Abrir controlado
              </Button>
              <Drawer
                open={controlledDrawerOpen}
                onOpenChange={setControlledDrawerOpen}
              >
                <DrawerOverlay />
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Drawer controlado</DrawerTitle>
                    <DrawerDescription>
                      O estado pertence ao Playground.
                    </DrawerDescription>
                  </DrawerHeader>
                  <DrawerFooter>
                    <DrawerClose className={drawerPrimaryClasses}>Fechar</DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </Card>

            <Card>
              <DrawerDemoHeading
                title="Prevent dismiss"
                description="Escape, Overlay e DrawerClose são bloqueados."
              />
              <Button onClick={() => setProtectedDrawerOpen(true)}>
                Abrir protegido
              </Button>
              <Drawer
                open={protectedDrawerOpen}
                onOpenChange={setProtectedDrawerOpen}
                preventDismiss
              >
                <DrawerOverlay />
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Fechamento protegido</DrawerTitle>
                    <DrawerDescription>
                      Somente a ação programática pode encerrar este exemplo.
                    </DrawerDescription>
                  </DrawerHeader>
                  <DrawerFooter>
                    <DrawerClose className={drawerSecondaryClasses}>
                      DrawerClose bloqueado
                    </DrawerClose>
                    <Button onClick={() => setProtectedDrawerOpen(false)}>
                      Fechar programaticamente
                    </Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </Card>

            <Drawer closeOnEscape={false}>
              <Card>
                <DrawerDemoHeading
                  title="Escape desativado"
                  description="Overlay e DrawerClose permanecem disponíveis."
                />
                <DrawerTrigger className={drawerTriggerClasses}>
                  Testar Escape
                </DrawerTrigger>
              </Card>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Escape desativado</DrawerTitle>
                  <DrawerDescription>Escape não fecha este Drawer.</DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <DrawerClose className={drawerPrimaryClasses}>Fechar</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <Drawer closeOnOverlayClick={false}>
              <Card>
                <DrawerDemoHeading
                  title="Overlay desativado"
                  description="Escape e DrawerClose permanecem disponíveis."
                />
                <DrawerTrigger className={drawerTriggerClasses}>
                  Testar Overlay
                </DrawerTrigger>
              </Card>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Overlay sem dismiss</DrawerTitle>
                  <DrawerDescription>
                    Clicar fora não fecha este Drawer.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <DrawerClose className={drawerPrimaryClasses}>Fechar</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <Drawer initialFocusRef={drawerInitialFocusRef}>
              <Card>
                <DrawerDemoHeading
                  title="Foco inicial"
                  description="Uma referência explícita define o primeiro foco."
                />
                <DrawerTrigger className={drawerTriggerClasses}>
                  Validar foco inicial
                </DrawerTrigger>
              </Card>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Foco inicial explícito</DrawerTitle>
                  <DrawerDescription>
                    O campo identificado deve receber foco.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-4)]">
                  <Input
                    ref={drawerInitialFocusRef}
                    label="Destino do foco inicial"
                    placeholder="Controle demonstrativo"
                  />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerPrimaryClasses}>Fechar</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <Drawer restoreFocus={false}>
              <Card>
                <DrawerDemoHeading
                  title="Sem restauração"
                  description="O fechamento não força retorno ao Trigger."
                />
                <DrawerTrigger className={drawerTriggerClasses}>
                  Testar restoreFocus=false
                </DrawerTrigger>
              </Card>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Restauração desativada</DrawerTitle>
                  <DrawerDescription>
                    Os demais comportamentos modais continuam ativos.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <DrawerClose className={drawerPrimaryClasses}>Fechar</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <Drawer lockScroll={false}>
              <Card>
                <DrawerDemoHeading
                  title="Sem scroll lock"
                  description="A modalidade e o trap permanecem ativos."
                />
                <DrawerTrigger className={drawerTriggerClasses}>
                  Testar lockScroll=false
                </DrawerTrigger>
              </Card>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Documento rolável</DrawerTitle>
                  <DrawerDescription>
                    O Drawer continua modal sem bloquear a rolagem documental.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-4)]">
                  <Input label="Controle para validar o trap" />
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerPrimaryClasses}>Fechar</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <Drawer>
              <Card>
                <DrawerDemoHeading
                  title="Múltiplos Drawers"
                  description="Validação da ordem modal e do lock compartilhado."
                />
                <DrawerTrigger className={drawerTriggerClasses}>
                  Abrir Drawer A
                </DrawerTrigger>
              </Card>
              <DrawerOverlay />
              <DrawerContent side="right" size="lg">
                <DrawerHeader>
                  <DrawerTitle>Drawer A</DrawerTitle>
                  <DrawerDescription>
                    Abra o Drawer B para validar a contenção superior.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-[var(--space-4)]">
                  <Drawer>
                    <DrawerTrigger className={drawerTriggerClasses}>
                      Abrir Drawer B
                    </DrawerTrigger>
                    <DrawerOverlay />
                    <DrawerContent side="right" size="sm">
                      <DrawerHeader>
                        <DrawerTitle>Drawer B</DrawerTitle>
                        <DrawerDescription>
                          Este Drawer deve permanecer acima do Drawer A.
                        </DrawerDescription>
                      </DrawerHeader>
                      <DrawerFooter>
                        <DrawerClose className={drawerPrimaryClasses}>
                          Fechar Drawer B
                        </DrawerClose>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                </div>
                <DrawerFooter>
                  <DrawerClose className={drawerSecondaryClasses}>
                    Fechar Drawer A
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
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

const drawerTriggerClasses = dialogTriggerClasses;
const drawerPrimaryClasses = dialogPrimaryClasses;
const drawerSecondaryClasses = dialogSecondaryClasses;

const popoverTriggerClasses = dialogSecondaryClasses;
const popoverCloseClasses = dialogSecondaryClasses;
const popoverContentClasses =
  "w-72 space-y-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)] text-sm text-hp-foreground shadow-[var(--shadow-lg)]";
const popoverDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";

type PopoverDemoProps = Pick<
  React.ComponentProps<typeof Popover>,
  "closeOnEscape" | "closeOnInteractOutside" | "restoreFocus"
> &
  Pick<React.ComponentProps<typeof PopoverContent>, "side" | "align" | "sideOffset"> & {
    title: string;
    description?: string;
  };

function PopoverDemo({
  title,
  description = "Conteúdo contextual com título e descrição.",
  side,
  align,
  sideOffset,
  ...rootProps
}: PopoverDemoProps) {
  return (
    <div className={popoverDemoClasses}>
      <h3 className="font-semibold">{title}</h3>
      <Popover {...rootProps}>
        <PopoverTrigger className={popoverTriggerClasses}>Abrir Popover</PopoverTrigger>
        <PopoverContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={popoverContentClasses}
        >
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
          <PopoverClose className={popoverCloseClasses}>Fechar</PopoverClose>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FocusPopoverDemo({ mode }: { mode: "autofocus" | "first" | "none" }) {
  const labels = {
    autofocus: "Elemento autofocus",
    first: "Primeiro controle focável",
    none: "Sem controles focáveis",
  };

  return (
    <div className={popoverDemoClasses}>
      <h3 className="font-semibold">{labels[mode]}</h3>
      <Popover>
        <PopoverTrigger className={popoverTriggerClasses}>Abrir</PopoverTrigger>
        <PopoverContent className={popoverContentClasses}>
          <PopoverTitle>{labels[mode]}</PopoverTitle>
          <PopoverDescription>Valida a política de foco inicial.</PopoverDescription>
          {mode === "autofocus" ? <button autoFocus className={popoverCloseClasses}>Destino autofocus</button> : null}
          {mode === "first" ? <button className={popoverCloseClasses}>Primeiro controle</button> : null}
          {mode === "none" ? <p className="text-hp-muted">Apenas texto informativo.</p> : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ShadowPopoverDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");
    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={popoverDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint
        ? createPortal(
            <Popover>
              <PopoverTrigger className={popoverTriggerClasses}>Abrir no Shadow DOM</PopoverTrigger>
              <PopoverContent className={popoverContentClasses}>
                <PopoverTitle>ShadowRoot {mode}</PopoverTitle>
                <PopoverDescription>Portal contextual no mesmo root.</PopoverDescription>
                <PopoverClose className={popoverCloseClasses}>Fechar</PopoverClose>
              </PopoverContent>
            </Popover>,
            mountPoint,
          )
        : null}
    </div>
  );
}


const tooltipTriggerClasses = dialogSecondaryClasses;
const tooltipDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";

type TooltipDemoProps = Pick<
  React.ComponentProps<typeof Tooltip>,
  "defaultOpen" | "openDelay"
> &
  Pick<
    React.ComponentProps<typeof TooltipContent>,
    "side" | "align" | "sideOffset"
  > & {
    title: string;
    description?: string;
  };

function TooltipDemo({
  title,
  description = "Informação auxiliar curta.",
  side,
  align,
  sideOffset,
  ...rootProps
}: TooltipDemoProps) {
  return (
    <div className={tooltipDemoClasses}>
      <h3 className="font-semibold">{title}</h3>
      <Tooltip {...rootProps}>
        <TooltipTrigger className={tooltipTriggerClasses}>
          Passe o mouse ou foque
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
        >
          {description}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function ShadowTooltipDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={tooltipDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint
        ? createPortal(
            <Tooltip>
              <TooltipTrigger className={tooltipTriggerClasses}>
                Passe o mouse ou foque
              </TooltipTrigger>
              <TooltipContent>
                Tooltip no ShadowRoot {mode}.
              </TooltipContent>
            </Tooltip>,
            mountPoint,
          )
        : null}
    </div>
  );
}


const dropdownMenuTriggerClasses = dialogSecondaryClasses;
const dropdownMenuNestedTriggerClasses =
  "flex w-full items-center rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] text-left text-sm text-[var(--dropdown-menu-foreground)] outline-none transition-colors focus-visible:bg-[var(--dropdown-menu-item-focus)]";
const dropdownMenuDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";

type DropdownMenuDemoProps = Pick<
  React.ComponentProps<typeof DropdownMenu>,
  "closeOnEscape" | "closeOnInteractOutside"
> &
  Pick<
    React.ComponentProps<typeof DropdownMenuContent>,
    "side" | "align" | "sideOffset" | "loop"
  > & {
    title: string;
    description?: string;
  };

function DropdownMenuDemo({
  title,
  description = "Ações fictícias para validar seleção e navegação.",
  side,
  align,
  sideOffset,
  loop,
  ...rootProps
}: DropdownMenuDemoProps) {
  return (
    <div className={dropdownMenuDemoClasses}>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-hp-muted">{description}</p>
      <DropdownMenu {...rootProps}>
        <DropdownMenuTrigger className={dropdownMenuTriggerClasses}>
          Abrir menu
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          loop={loop}
        >
          <DropdownMenuLabel>{title}</DropdownMenuLabel>
          <DropdownMenuItem>Visualizar detalhes</DropdownMenuItem>
          <DropdownMenuItem>Editar demonstração</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="danger">
            Remover item fictício
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ShadowDropdownMenuDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={dropdownMenuDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint
        ? createPortal(
            <DropdownMenu>
              <DropdownMenuTrigger className={dropdownMenuTriggerClasses}>
                Abrir no Shadow DOM
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>ShadowRoot {mode}</DropdownMenuLabel>
                <DropdownMenuItem>Primeira ação</DropdownMenuItem>
                <DropdownMenuItem>Segunda ação</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>,
            mountPoint,
          )
        : null}
    </div>
  );
}


const contextMenuTriggerClasses =
  "flex min-h-28 w-full items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-hp-border-strong bg-hp-surface-subtle p-[var(--space-4)] text-center text-sm font-medium text-hp-foreground outline-none transition-colors hover:bg-hp-surface focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";
const contextMenuLargeTriggerClasses =
  "flex min-h-40 w-full items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-hp-border-strong bg-hp-surface-subtle p-[var(--space-4)] text-center text-sm font-medium text-hp-foreground outline-none transition-colors hover:bg-hp-surface focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2";
const contextMenuNestedTriggerClasses =
  "flex w-full items-center rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] text-left text-sm text-[var(--context-menu-foreground)] outline-none transition-colors focus-visible:bg-[var(--context-menu-item-focus)]";
const contextMenuDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";

type ContextMenuDemoProps = Pick<
  React.ComponentProps<typeof ContextMenu>,
  "closeOnEscape" | "closeOnInteractOutside"
> & {
  title: string;
  description?: string;
};

function ContextMenuDemo({
  title,
  description = "Clique com o botão direito na área ou use Shift + F10.",
  ...rootProps
}: ContextMenuDemoProps) {
  return (
    <div className={contextMenuDemoClasses}>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-hp-muted">{description}</p>
      <ContextMenu {...rootProps}>
        <ContextMenuTrigger className={contextMenuTriggerClasses}>
          Área do Context Menu
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>{title}</ContextMenuLabel>
          <ContextMenuItem>Visualizar detalhes</ContextMenuItem>
          <ContextMenuItem>Editar demonstração</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="danger">
            Remover item fictício
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

function ShadowContextMenuDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={contextMenuDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint
        ? createPortal(
            <ContextMenu>
              <ContextMenuTrigger className={contextMenuTriggerClasses}>
                Clique com o botão direito
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuLabel>ShadowRoot {mode}</ContextMenuLabel>
                <ContextMenuItem>Primeira ação</ContextMenuItem>
                <ContextMenuItem>Segunda ação</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>,
            mountPoint,
          )
        : null}
    </div>
  );
}


const menubarDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";

function MenubarDemo() {
  return (
    <Menubar>
      <MenubarMenu value="arquivo-demo">
        <MenubarTrigger>Arquivo</MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>Arquivo</MenubarLabel>
          <MenubarItem>Novo arquivo</MenubarItem>
          <MenubarItem>Abrir arquivo</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Fechar</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu value="editar-demo">
        <MenubarTrigger>Editar</MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>Editar</MenubarLabel>
          <MenubarItem>Desfazer</MenubarItem>
          <MenubarItem>Refazer</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu value="visualizar-demo">
        <MenubarTrigger>Visualizar</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Ampliar</MenubarItem>
          <MenubarItem>Reduzir</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu value="ajuda-demo">
        <MenubarTrigger>Ajuda</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Documentação</MenubarItem>
          <MenubarItem>Sobre</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

function ShadowMenubarDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={menubarDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint ? createPortal(<MenubarDemo />, mountPoint) : null}
    </div>
  );
}


const hoverCardTriggerClasses =
  "inline-flex min-h-[var(--layout-touch-target)] items-center justify-center rounded-[var(--radius-md)] border border-hp-border bg-hp-surface px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium text-hp-foreground outline-none transition-colors hover:bg-hp-surface-subtle focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2";
const hoverCardActionClasses =
  "mt-3 inline-flex min-h-[var(--layout-touch-target)] items-center justify-center rounded-[var(--radius-md)] border border-hp-border px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium outline-none transition-colors hover:bg-hp-surface-subtle focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2";
const hoverCardDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";

type HoverCardDemoProps = Pick<
  React.ComponentProps<typeof HoverCard>,
  "openDelay" | "closeDelay"
> &
  Pick<
    React.ComponentProps<typeof HoverCardContent>,
    "side" | "align" | "sideOffset"
  > & {
    title: string;
  };

function HoverCardDemo({
  title,
  side,
  align,
  sideOffset,
  ...rootProps
}: HoverCardDemoProps) {
  return (
    <div className={hoverCardDemoClasses}>
      <h3 className="font-semibold">{title}</h3>
      <HoverCard {...rootProps}>
        <HoverCardTrigger className={hoverCardTriggerClasses}>
          Passe o mouse ou foque
        </HoverCardTrigger>
        <HoverCardContent
          side={side}
          align={align}
          sideOffset={sideOffset}
        >
          <HoverCardTitle>{title}</HoverCardTitle>
          <HoverCardDescription>
            Conteúdo fictício para validar o Hover Card oficial.
          </HoverCardDescription>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

function ShadowHoverCardDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={hoverCardDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint
        ? createPortal(
            <HoverCard>
              <HoverCardTrigger className={hoverCardTriggerClasses}>
                Passe o mouse ou foque
              </HoverCardTrigger>
              <HoverCardContent>
                <HoverCardTitle>ShadowRoot {mode}</HoverCardTitle>
                <HoverCardDescription>
                  Portal contextual no mesmo root.
                </HoverCardDescription>
              </HoverCardContent>
            </HoverCard>,
            mountPoint,
          )
        : null}
    </div>
  );
}


const navigationMenuDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 overflow-x-auto rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";

function NavigationMenuDemo() {
  return (
    <NavigationMenu aria-label="Navegação demonstrativa">
      <NavigationMenuList>
        <NavigationMenuLink href="#inicio-demo" active>
          Início
        </NavigationMenuLink>

        <NavigationMenuMenu value="solucoes-demo">
          <NavigationMenuTrigger>Soluções</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLabel>Soluções</NavigationMenuLabel>
            <NavigationMenuLink href="#sites-demo">
              Sites premium
            </NavigationMenuLink>
            <NavigationMenuLink href="#landing-demo">
              Landing pages
            </NavigationMenuLink>
            <NavigationMenuLink href="#plataforma-demo">
              HPTECH Platform
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuMenu>

        <NavigationMenuMenu value="empresa-demo">
          <NavigationMenuTrigger>Empresa</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLabel>Empresa</NavigationMenuLabel>
            <NavigationMenuLink href="#sobre-demo">
              Sobre
            </NavigationMenuLink>
            <NavigationMenuLink href="#contato-demo">
              Contato
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuMenu>

        <NavigationMenuLink href="#precos-demo">
          Preços
        </NavigationMenuLink>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function ShadowNavigationMenuDemo({
  mode,
}: {
  mode: ShadowRootMode;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={navigationMenuDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint
        ? createPortal(<NavigationMenuDemo />, mountPoint)
        : null}
    </div>
  );
}


const accordionDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";
const accordionActionClasses =
  "inline-flex min-h-[var(--layout-touch-target)] items-center justify-center rounded-[var(--radius-md)] border border-hp-border px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium outline-none transition-colors hover:bg-hp-surface-subtle focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2";

function AccordionDemo() {
  return (
    <Accordion collapsible defaultValue="demo-1">
      <AccordionItem value="demo-1">
        <AccordionTrigger>Primeira seção</AccordionTrigger>
        <AccordionContent>
          Conteúdo demonstrativo da primeira seção.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="demo-2">
        <AccordionTrigger>Segunda seção</AccordionTrigger>
        <AccordionContent>
          Conteúdo demonstrativo da segunda seção.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="demo-3">
        <AccordionTrigger>Terceira seção</AccordionTrigger>
        <AccordionContent>
          Conteúdo demonstrativo da terceira seção.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function ShadowAccordionDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={accordionDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint ? createPortal(<AccordionDemo />, mountPoint) : null}
    </div>
  );
}


const collapsibleDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";
const collapsibleTriggerClasses =
  "w-full justify-between border border-hp-border bg-hp-surface";
const collapsibleContentClasses =
  "mt-2 rounded-[var(--radius-md)] border border-hp-border bg-hp-surface-subtle p-[var(--space-4)]";
const collapsibleActionClasses =
  "inline-flex min-h-[var(--layout-touch-target)] items-center justify-center rounded-[var(--radius-md)] border border-hp-border px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium outline-none transition-colors hover:bg-hp-surface focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2";

function CollapsibleDemo() {
  return (
    <Collapsible>
      <CollapsibleTrigger className={collapsibleTriggerClasses}>
        Mostrar detalhes
      </CollapsibleTrigger>
      <CollapsibleContent className={collapsibleContentClasses}>
        Conteúdo demonstrativo do Collapsible oficial da HPTECH Platform.
      </CollapsibleContent>
    </Collapsible>
  );
}

function ShadowCollapsibleDemo({
  mode,
}: {
  mode: ShadowRootMode;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={collapsibleDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint
        ? createPortal(<CollapsibleDemo />, mountPoint)
        : null}
    </div>
  );
}


const scrollAreaDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";
const scrollAreaActionClasses =
  "flex min-h-[var(--layout-touch-target)] w-full items-center rounded-[var(--radius-md)] border border-hp-border px-[var(--space-3)] py-[var(--space-2)] text-left text-sm font-medium outline-none transition-colors hover:bg-hp-surface-subtle focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2";

function ScrollAreaDemo() {
  return (
    <ScrollArea className="h-48 w-full rounded-[var(--radius-lg)] border border-hp-border">
      <div className="space-y-2 p-[var(--space-4)]">
        {Array.from({ length: 14 }, (_, index) => (
          <div
            key={index}
            className="rounded-[var(--radius-md)] border border-hp-border bg-hp-surface-subtle p-[var(--space-3)] text-sm"
          >
            Item demonstrativo {index + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function ShadowScrollAreaDemo({
  mode,
}: {
  mode: ShadowRootMode;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={scrollAreaDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint
        ? createPortal(<ScrollAreaDemo />, mountPoint)
        : null}
    </div>
  );
}


const tabsDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";
const tabsContentClasses =
  "border border-hp-border bg-hp-surface-subtle p-[var(--space-4)] text-sm";
const tabsActionClasses =
  "inline-flex min-h-[var(--layout-touch-target)] items-center justify-center rounded-[var(--radius-md)] border border-hp-border px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium outline-none transition-colors hover:bg-hp-surface focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2";

function TabsDemo() {
  return (
    <Tabs defaultValue="primeira">
      <TabsList>
        <TabsTrigger value="primeira">Primeira</TabsTrigger>
        <TabsTrigger value="segunda">Segunda</TabsTrigger>
        <TabsTrigger value="terceira">Terceira</TabsTrigger>
      </TabsList>
      <TabsContent value="primeira" className={tabsContentClasses}>
        Conteúdo demonstrativo da primeira aba.
      </TabsContent>
      <TabsContent value="segunda" className={tabsContentClasses}>
        Conteúdo demonstrativo da segunda aba.
      </TabsContent>
      <TabsContent value="terceira" className={tabsContentClasses}>
        Conteúdo demonstrativo da terceira aba.
      </TabsContent>
    </Tabs>
  );
}

function ShadowTabsDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={tabsDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint ? createPortal(<TabsDemo />, mountPoint) : null}
    </div>
  );
}


const toggleDemoClasses =
  "flex min-w-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]";

function ToggleDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Toggle>Favorito</Toggle>
      <Toggle variant="outline">Outline</Toggle>
      <Toggle defaultPressed>Ativo</Toggle>
    </div>
  );
}

function ShadowToggleDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");

    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={toggleDemoClasses}>
      <h3 className="font-semibold">ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint ? createPortal(<ToggleDemo />, mountPoint) : null}
    </div>
  );
}

function ToggleGroupDemoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={toggleDemoClasses}>
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function ToggleGroupDemo({ multiple = false }: { multiple?: boolean }) {
  return multiple ? (
    <ToggleGroup type="multiple" defaultValue={["email"]} aria-label="Canais de contato">
      <ToggleGroupItem value="email">E-mail</ToggleGroupItem>
      <ToggleGroupItem value="whatsapp">WhatsApp</ToggleGroupItem>
      <ToggleGroupItem value="telefone">Telefone</ToggleGroupItem>
    </ToggleGroup>
  ) : (
    <ToggleGroup type="single" defaultValue="lista" aria-label="Visualização">
      <ToggleGroupItem value="lista">Lista</ToggleGroupItem>
      <ToggleGroupItem value="grade">Grade</ToggleGroupItem>
    </ToggleGroup>
  );
}

function ShadowToggleGroupDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");
    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <div className={toggleDemoClasses}>
      <h3 className="font-semibold">ToggleGroup em ShadowRoot {mode}</h3>
      <div ref={wrapperRef} />
      {mountPoint ? createPortal(<ToggleGroupDemo multiple />, mountPoint) : null}
    </div>
  );
}

function BreadcrumbDemoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function BreadcrumbDemo() {
  return (
    <Breadcrumb
      items={[
        { label: "Centro Comercial", href: "#demo-centro" },
        { label: "CRM", href: "#demo-crm" },
      ]}
      currentLabel="Leads"
    />
  );
}

function ShadowBreadcrumbDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");
    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <BreadcrumbDemoCard title={`Breadcrumb em ShadowRoot ${mode}`}>
      <div ref={wrapperRef} />
      {mountPoint ? createPortal(<BreadcrumbDemo />, mountPoint) : null}
    </BreadcrumbDemoCard>
  );
}

function PaginationDemoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function PaginationDemo() {
  return <Pagination defaultPage={4} totalPages={12} />;
}

function ShadowPaginationDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");
    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <PaginationDemoCard title={`Pagination em ShadowRoot ${mode}`}>
      <div ref={wrapperRef} />
      {mountPoint ? createPortal(<PaginationDemo />, mountPoint) : null}
    </PaginationDemoCard>
  );
}

function TableDemoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-3 overflow-hidden rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function TableDemo() {
  return (
    <Table striped>
      <TableCaption>Dados inteiramente fictícios para homologação.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Nome</TableHead>
          <TableHead scope="col">Centro</TableHead>
          <TableHead scope="col">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableHead scope="row">Marina Costa</TableHead>
          <TableCell>Comercial</TableCell>
          <TableCell><Badge variant="success">Ativo</Badge></TableCell>
        </TableRow>
        <TableRow>
          <TableHead scope="row">Lucas Almeida</TableHead>
          <TableCell>Clínico</TableCell>
          <TableCell><Badge variant="info">Em análise</Badge></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function WideTableDemo() {
  const headers = [
    "Nome",
    "Empresa",
    "Centro",
    "Módulo",
    "Origem",
    "Responsável",
    "Status",
    "Atualização",
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead key={header} scope="col">{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableHead scope="row">Marina Costa</TableHead>
          <TableCell>Clínica Exemplo</TableCell>
          <TableCell>Comercial</TableCell>
          <TableCell>CRM</TableCell>
          <TableCell>Indicação</TableCell>
          <TableCell>Equipe Demo</TableCell>
          <TableCell><Badge variant="success">Ativo</Badge></TableCell>
          <TableCell>Hoje, 14:30</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function ShadowTableDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");
    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <TableDemoCard title={`Table em ShadowRoot ${mode}`}>
      <div ref={wrapperRef} />
      {mountPoint ? createPortal(<TableDemo />, mountPoint) : null}
    </TableDemoCard>
  );
}

type DataGridDemoRow = {
  id: string;
  name: string;
  email: string;
  source: string;
  status: "Novo" | "Qualificado" | "Em atendimento" | "Arquivado";
  owner: string;
  notes: string;
  createdAt: Date;
  disabled: boolean;
};

const DATA_GRID_ROWS: readonly DataGridDemoRow[] = [
  {
    id: "lead-1",
    name: "Marina Costa",
    email: "marina@example.test",
    source: "Indicação",
    status: "Qualificado",
    owner: "Equipe Demo",
    notes: "Busca uma demonstração completa da plataforma para a Clínica Exemplo.",
    createdAt: new Date("2026-08-01T10:00:00Z"),
    disabled: false,
  },
  {
    id: "lead-2",
    name: "Lucas Almeida",
    email: "lucas@example.test",
    source: "Landing page",
    status: "Novo",
    owner: "Equipe Demo",
    notes: "Contato demonstrativo sem qualquer dado pessoal real.",
    createdAt: new Date("2026-08-03T14:30:00Z"),
    disabled: false,
  },
  {
    id: "lead-3",
    name: "Clínica Exemplo",
    email: "contato@example.test",
    source: "Evento",
    status: "Em atendimento",
    owner: "HPTECH Demo",
    notes: "Texto longo para validar largura, quebra visual e rolagem horizontal controlada.",
    createdAt: new Date("2026-08-05T09:15:00Z"),
    disabled: false,
  },
  {
    id: "lead-4",
    name: "Registro Bloqueado",
    email: "bloqueado@example.test",
    source: "Importação",
    status: "Arquivado",
    owner: "Equipe Demo",
    notes: "Linha desabilitada para validar seleção e select-all.",
    createdAt: new Date("2026-08-07T16:45:00Z"),
    disabled: true,
  },
];

function DataGridActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={dropdownMenuTriggerClasses}>
        Ações
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Visualizar</DropdownMenuItem>
        <DropdownMenuItem>Editar demonstração</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const DATA_GRID_COLUMNS: readonly DataGridColumn<DataGridDemoRow>[] = [
  {
    id: "name",
    header: "Nome",
    getValue: (row) => row.name,
    getSortValue: (row) => row.name,
    renderCell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.name} size="sm" />
        <span className="font-medium">{row.name}</span>
      </div>
    ),
    sortable: true,
    hideable: false,
    minWidth: "13rem",
  },
  {
    id: "email",
    header: "E-mail",
    getValue: (row) => row.email,
    sortable: true,
    minWidth: "14rem",
  },
  {
    id: "source",
    header: "Origem",
    getValue: (row) => row.source,
    sortable: true,
    minWidth: "10rem",
  },
  {
    id: "status",
    header: "Status",
    getValue: (row) => row.status,
    renderCell: ({ row }) => (
      <Badge variant={row.status === "Arquivado" ? "neutral" : "info"}>
        {row.status}
      </Badge>
    ),
    minWidth: "10rem",
  },
  {
    id: "owner",
    header: "Responsável",
    getValue: (row) => row.owner,
    minWidth: "10rem",
  },
  {
    id: "notes",
    header: "Observações",
    getValue: (row) => row.notes,
    renderCell: ({ value }) => (
      <span className="block max-w-72 whitespace-normal">{String(value)}</span>
    ),
    minWidth: "18rem",
  },
  {
    id: "actions",
    header: "Ações",
    headerAriaLabel: "Ações da linha",
    renderCell: () => <DataGridActions />,
    hideable: false,
    align: "end",
    minWidth: "8rem",
  },
];

const DATA_GRID_COMPACT_COLUMNS: readonly DataGridColumn<DataGridDemoRow>[] =
  DATA_GRID_COLUMNS.filter((column) =>
    ["name", "source", "status"].includes(column.id),
  );

const DATA_GRID_VISIBILITY_COLUMNS: readonly DataGridColumn<DataGridDemoRow>[] =
  DATA_GRID_COLUMNS.filter((column) =>
    ["name", "email", "source"].includes(column.id),
  );

function formatGridSort(sort: DataGridSort | null): string {
  return sort ? `${sort.columnId} / ${sort.direction}` : "nenhum";
}

function DataGridDemoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-3 rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface p-[var(--space-4)]">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function DataGridDemo() {
  return (
    <DataGrid
      rows={DATA_GRID_ROWS}
      columns={DATA_GRID_VISIBILITY_COLUMNS}
      getRowId={(row) => row.id}
      getRowLabel={(row) => row.name}
      selectionMode="multiple"
      defaultSelectedRowIds={["lead-1"]}
      isRowDisabled={(row) => row.disabled}
      striped
    />
  );
}

function ShadowDataGridDemo({ mode }: { mode: ShadowRootMode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode });
    const target = document.createElement("div");
    root.append(target);
    wrapper.append(host);
    setMountPoint(target);

    return () => {
      setMountPoint(null);
      host.remove();
    };
  }, [mode]);

  return (
    <DataGridDemoCard title={`DataGrid em ShadowRoot ${mode}`}>
      <div ref={wrapperRef} />
      {mountPoint ? createPortal(<DataGridDemo />, mountPoint) : null}
    </DataGridDemoCard>
  );
}

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

const DrawerDemoHeading = DialogDemoHeading;

function DialogDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-hp-surface-subtle p-[var(--space-3)]">
      <dt className="text-hp-muted">{label}</dt>
      <dd className="mt-1 font-medium text-hp-foreground">{value}</dd>
    </div>
  );
}
