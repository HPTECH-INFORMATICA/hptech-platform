# HPTECH Platform v2
## Documento Mestre da Plataforma

**Versão:** 2.0
**Status:** Documento Oficial de Arquitetura
**Projeto:** HPTECH Platform
**Empresa:** HPTECH INFORMÁTICA

---

# Visão

A HPTECH Platform é uma plataforma SaaS multiempresa desenvolvida para clínicas, consultórios e negócios de saúde, estética e bem-estar.

Ela não é apenas um CRM.

Ela une:

- Website profissional
- Landing Pages
- CRM
- Agenda
- Financeiro
- Marketing
- Inteligência Artificial
- Automações
- Relatórios
- Gestão operacional

Tudo dentro de uma única plataforma.

---

# Missão

Permitir que pequenas e médias clínicas tenham acesso à mesma tecnologia utilizada pelas grandes redes.

Nosso objetivo é reduzir trabalho operacional, aumentar conversões e facilitar a gestão completa do negócio.

---

# Público-alvo

Inicialmente:

- Clínicas de Estética
- Harmonização Facial
- Clínicas Capilares
- Clínicas de Emagrecimento
- Dermatologistas
- Dentistas
- Nutricionistas
- Fisioterapia
- Psicólogos
- Clínicas Médicas

A arquitetura será genérica para permitir expansão futura.

---

# Arquitetura

Modelo:

Multi-Tenant

Cada empresa possui:

- usuários
- pacientes
- agenda
- financeiro
- serviços
- produtos
- landing pages
- IA
- configurações

isolados.

Nenhum dado é compartilhado entre empresas.

---

# Conceito

Cada clínica possui um "Sistema Operacional".

Esse sistema possui diversos Centros.

---

# Centros Operacionais

## Centro Comercial

Responsável por:

- Leads
- CRM
- Kanban
- WhatsApp
- Landing Pages
- Campanhas
- Conversões

---

## Centro Clínico

Responsável por:

- Agenda
- Pacientes
- Prontuário
- Evolução
- Serviços
- Procedimentos
- Fotos

---

## Centro Financeiro

Responsável por:

- Receitas
- Despesas
- Caixa
- Fluxo de Caixa
- Comissões
- Pagamentos
- Assinaturas

---

## Centro Administrativo

Responsável por:

- Funcionários
- Permissões
- Empresas
- Configurações
- Auditoria
- Logs

---

## Centro de Inteligência

Responsável por:

- IA
- Insights
- Relatórios
- Dashboards
- Alertas
- Automações

---

# Jornada do Paciente

1. Descobre a clínica
2. Landing Page
3. Cadastro do Lead
4. CRM
5. Contato
6. Agendamento
7. Avaliação
8. Procedimento
9. Retorno
10. Pós-venda
11. Fidelização

---

# Módulos

## CRM

- Pipeline
- Lead
- Origem
- Histórico
- Tags
- Kanban

---

## Agenda

- Calendário
- Profissionais
- Salas
- Procedimentos
- Confirmações

---

## Financeiro

- Receitas
- Despesas
- Fluxo
- Comissões
- Pagamentos

---

## Landing Pages

- Construtor
- Templates
- SEO
- Domínios
- Analytics

---

## IA

- Atendimento
- Resumos
- Respostas
- Marketing
- Insights

---

## Relatórios

- Leads
- Financeiro
- Conversão
- Agenda
- Campanhas
- Funcionários

---

# Website Integrado

Cada cliente possui:

Site institucional

+

Landing Pages

+

Painel Administrativo

Tudo compartilhando o mesmo banco.

---

# Planos

## START

- Website
- Landing Page
- CRM
- Agenda

---

## PROFISSIONAL

Tudo do Start

+

- Financeiro
- IA
- Relatórios

---

## PREMIUM

Tudo do Profissional

+

- Automações
- API
- Integrações
- White Label

---

# Inteligência Artificial

A IA será transversal.

Ela estará presente em toda a plataforma.

Exemplos:

## CRM

- resumir conversas
- responder clientes
- sugerir follow-up

## Agenda

- encaixes
- conflitos

## Financeiro

- previsões
- inadimplência

## Marketing

- campanhas
- anúncios
- conteúdo

## Website

- SEO
- textos
- FAQ

---

# Perfis

- Administrador
- Gerente
- Recepção
- Financeiro
- Profissional
- Marketing
- Cliente

Cada perfil possui permissões específicas.

---

# Integrações Futuras

- WhatsApp
- Google Calendar
- Google Agenda
- Google Analytics
- Meta Ads
- Google Ads
- Stripe
- Mercado Pago
- OpenAI
- Evolution API
- N8N
- ERP

---

# Princípios

A plataforma deve ser:

- Modular
- Escalável
- Responsiva
- Multiempresa
- Segura
- Rápida
- Orientada a componentes
- Orientada a APIs
- Preparada para IA

---

# Princípios de UX

- Zero curva de aprendizado
- Tarefas frequentes em até 3 cliques
- Contexto primeiro
- Mobile first
- Feedback visual imediato
- Consistência entre componentes
- IA como assistente, nunca como obstáculo
- Acessibilidade desde a base
- Navegação previsível
- Redução de retrabalho operacional

---

# Design

- Visual premium
- Interface limpa
- Poucos cliques
- Tipografia moderna
- Cards grandes
- Muito espaço em branco
- Modo claro e escuro
- Animações suaves

---

# Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind

## Backend

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL

## Infra

- Docker
- GitHub
- Vercel
- Render
- Neon

---

# Roadmap Oficial

## Sprint 1 — Fundação

- Monorepo
- Frontend
- Backend
- Banco

## Sprint 2 — Nova Identidade

- Design System
- Layout Premium
- Dashboard Real
- Navegação do Painel Operacional

## Sprint 3 — Segurança e Multiempresa

- Autenticação
- Permissões
- Multiempresa
- Tenant derivado do usuário autenticado

## Sprint 4 — Operação Clínica

- Agenda
- Pacientes
- Serviços
- Avaliações

## Sprint 5 — Financeiro

- Receitas
- Despesas
- Caixa
- Comissões
- Relatórios financeiros

## Sprint 6 — Website e Landing Pages

- Website Builder
- Landing Builder
- SEO
- Domínios
- Analytics

## Sprint 7 — Inteligência Artificial

- Assistente comercial
- Resumos
- Sugestões
- Insights
- Automações inteligentes

## Sprint 8 — Marketplace

- Produtos
- Serviços
- Parceiros
- Integrações comerciais

## Sprint 9 — Automações

- WhatsApp
- Follow-up
- Lembretes
- Campanhas
- Fluxos N8N

## Sprint 10 — Versão Comercial

- Planos
- Billing
- Onboarding
- Deploy multi-cliente
- Suporte operacional

---

# Garantias Arquiteturais Transversais

## Isolamento Multi-Tenant

- O tenant deve ser derivado exclusivamente da identidade autenticada.
- Não confiar em company_id enviado pelo cliente para autorização.
- Toda entidade empresarial deve possuir escopo de tenant.
- Repositories e services devem aplicar isolamento centralmente.
- Arquivos, caches, filas, logs, integrações e contexto de IA também devem respeitar o tenant.
- Operações entre tenants devem ser explícitas, restritas e auditadas.
- Testes automatizados de isolamento multiempresa são obrigatórios.

## Governança de Dados Clínicos e LGPD

- Privacidade e proteção de dados desde a concepção.
- Classificação dos dados por sensibilidade.
- Consentimento e finalidade de tratamento.
- Princípio do menor privilégio.
- Trilha de auditoria para ações críticas.
- Políticas de retenção, anonimização e exclusão.
- Exportação e portabilidade de dados.
- Criptografia em trânsito e em repouso.
- Backups protegidos e restauração testada.
- Separação entre dados clínicos e dados comerciais.

## Limites entre Módulos e Integrações

- A plataforma começa como monólito modular.
- Cada módulo possui responsabilidade, regras e camada de aplicação próprias.
- Alterações de dados devem passar pelo serviço responsável pelo domínio.
- Compartilhar PostgreSQL não autoriza acesso indiscriminado entre módulos.
- Comunicação entre módulos deve usar contratos internos explícitos.
- Integrações externas devem utilizar adaptadores.
- Notificações, automações e tarefas demoradas devem poder evoluir para processamento assíncrono.
- APIs e eventos relevantes devem ser versionados.
- Extração para serviços independentes somente por necessidade comprovada.

## Governança de Inteligência Artificial

- Contexto de IA isolado por tenant.
- Minimização e mascaramento de dados enviados a provedores.
- Proibição de treinamento externo com dados do cliente sem consentimento explícito.
- Registro do provedor, modelo, finalidade e ação resultante.
- Revisão humana obrigatória para ações clínicas, financeiras ou irreversíveis.
- IA não substitui decisão profissional.
- Permissões específicas por capacidade de IA.
- Fallback seguro quando o provedor estiver indisponível.
- Possibilidade de desativação da IA por empresa.

---

# Regra Principal

Toda nova funcionalidade deve responder:

> Isso torna a HPTECH Platform uma plataforma melhor para qualquer clínica?

Se a resposta for não, a funcionalidade deve ser reavaliada.

---

# Regra de Arquitetura

Este documento define a arquitetura oficial da HPTECH Platform v2.

Após a revisão final:

- a estrutura dos centros operacionais deve ser preservada;
- a visão de produto não deve ser alterada;
- os módulos não devem ser reorganizados sem necessidade crítica;
- tecnologias aprovadas não devem ser substituídas por preferência técnica;
- novas funcionalidades devem ser adicionadas por extensão, sem quebrar a base definida;
- qualquer exceção exige diagnóstico e aprovação explícita antes de implementação.

---

# Filosofia

Não estamos construindo apenas um sistema.

Estamos construindo o sistema operacional das clínicas brasileiras.
