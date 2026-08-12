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

#### Dependências arquiteturais

- Breadcrumb -> PageHeader
- Pagination -> Table -> DataGrid
- Calendar -> DatePicker
- DatePicker -> Filters

#### Fila posterior sem numeração oficial

A fila posterior ainda não possui numeração oficial e permanece sujeita a um novo Gate arquitetural para cada sprint:

- Section
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

Section e Filters são as candidatas prioritárias imediatamente após PageHeader. Essa prioridade não oficializa DS-22 nem DS-23.

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

- Calendário
- Agendamentos
- Confirmações

---

## Fase 4

Financeiro

- Contas
- Fluxo de Caixa
- Recebimentos

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
