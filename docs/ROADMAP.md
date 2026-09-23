# Roadmap HPTECH Platform

## Fase 1

- Estrutura
- Dashboard
- UI
- Documentação

### Continuidade oficial do Design System

- DS-15 — Breadcrumb
  - Categoria: NAVEGAÇÃO
- DS-16 — Pagination
  - Categoria: NAVEGAÇÃO
- DS-17 — Table
  - Categoria: DADOS
- DS-18 — DataGrid
  - Categoria: DADOS
- DS-19 — Calendar
  - Categoria: INTERAÇÃO
- DS-20 — DatePicker
  - Categoria: COMPOSIÇÃO
- DS-21 — PageHeader
  - Categoria: COMPOSIÇÃO
  - Objetivo arquitetural: fornecer a estrutura transversal oficial para os cabeçalhos das páginas da plataforma.
  - Responsabilidades:
    - breadcrumb opcional;
    - título semântico;
    - descrição opcional;
    - metadata opcional;
    - ações;
    - responsividade;
    - composição independente de domínio.
  - Não responsabilidades:
    - roteamento;
    - permissões;
    - fetch;
    - estado global;
    - filtros;
    - conteúdo da página;
    - regras de negócio;
    - tenant;
    - telemetria.
- DS-22 — Section
  - Categoria: COMPOSIÇÃO
  - Objetivo arquitetural: fornecer agrupamento semântico oficial para áreas internas das páginas da HPTECH Platform.
  - Responsabilidades:
    - raiz semântica `<section>`;
    - título opcional;
    - descrição opcional;
    - ações opcionais;
    - conteúdo;
    - espaçamento estrutural;
    - responsividade;
    - composição independente de domínio.
  - Relação estrutural:
    - PageHeader fornece contexto, título principal, breadcrumb, metadata e ações principais da página;
    - Section agrupa internamente o conteúdo por assunto, normalmente com heading `h2`;
    - subseções legítimas podem usar heading `h3`;
    - Card fornece superfície visual, pode ser composto dentro de Section e não substitui Section.
  - Contrato preliminar para o Gate de implementação:

    ```ts
    export type SectionProps = React.HTMLAttributes<HTMLElement> & {
      title?: ReactNode;
      description?: ReactNode;
      actions?: ReactNode;
      children: ReactNode;
      titleAs?: "h2" | "h3";
    };
    ```

  - Decisões preliminares:
    - `children` obrigatório;
    - `title` opcional;
    - `titleAs` padrão `h2`, limitado a `h2 | h3`;
    - `forwardRef<HTMLElement>`;
    - atributos nativos preservados;
    - sem metadata ou variants;
    - sem estados `loading`, `empty` ou `error`;
    - sem fetch, permissões, filtros, roteamento, domínio ou telemetria;
    - Skeleton, EmptyState e Alert permanecem composições externas.
  - Acessibilidade:
    - quando houver heading, associá-lo semanticamente à Section;
    - normalmente usar `h2` após o `h1` do PageHeader;
    - usar `h3` somente em subseção legítima;
    - não criar `role="region"` automaticamente;
    - Section sem título não se torna região artificial;
    - o consumidor pode fornecer `aria-label` ou `aria-labelledby` explicitamente;
    - ações permanecem depois do heading na ordem do DOM.

#### Dependências arquiteturais

- Breadcrumb -> PageHeader
- Pagination -> Table -> DataGrid
- Calendar -> DatePicker
- DatePicker -> Filters

#### Fila posterior sem numeração oficial

A fila posterior ainda não possui numeração oficial e permanece sujeita a um novo Gate arquitetural para cada sprint:

- Filters
- StatCard/KPI Card
- ChartCard
- Timeline
- StatusIndicator
- KanbanColumn
- KanbanCard
- Progress
- Loading
- Stepper
- FileUpload
- Componentes de IA

Filters permanece candidata prioritária, mas não possui numeração oficial. A DS-23 não está oficializada.

Após a DS-22 — Section, um novo Gate arquitetural decidirá entre o retorno ao Dashboard, o retorno ao CRM ou um Gate de Filters baseado em necessidade real. A continuidade para uma DS-23 não é automática.

Após as fundações transversais imediatamente necessárias, o Design System não avançará por uma longa fila especulativa. O desenvolvimento voltará a ser orientado pelos módulos consumidores reais, que determinarão a prioridade dos componentes posteriores.

---

## Fase 2

CRM

- Leads
- Pacientes
- Pipeline
- WhatsApp

---

## Fase 3

Agenda

- Calendário semanal operacional — concluído
- Agendamentos, reagendamento e ciclo de atendimento — concluído
- Confirmação manual no ciclo do agendamento — concluído
- Confirmações automatizadas e integrações de mensageria — evolução futura

---

## Fase 4

Financeiro

- Lançamentos de receitas e despesas — concluído
- Ciclo pendente, pago e cancelado — concluído
- API multiempresa protegida por RBAC — concluído
- Interface operacional responsiva — concluído
- Fluxo de caixa consolidado — evolução futura
- Recebimentos automáticos derivados de atendimentos — evolução futura

---

## Fase 5

Landing Pages

- Builder
- Templates
- SEO

---

## Fase 6

Inteligência Artificial

- Atendimento
- Automações
- Resumos

---

## Fase 7

Marketplace

- Temas
- Plugins
- Integrações

---

## Fase 8

Produção

- Docker
- Deploy
- Monitoramento
