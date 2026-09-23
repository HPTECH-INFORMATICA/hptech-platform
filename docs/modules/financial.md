# Módulo Financeiro

## Objetivo

Registrar receitas e despesas da operação com isolamento multiempresa,
permissões explícitas, integridade no PostgreSQL e histórico auditável.

## Arquitetura publicada

O módulo é composto por:

- modelo e migration PostgreSQL de `transactions`;
- repositório tenant-aware;
- domínio transacional no backend;
- API FastAPI protegida por RBAC;
- BFF same-origin autenticado no Next.js;
- interface responsiva para consulta e operação dos lançamentos.

O backend permanece como autoridade de permissão, tenant, referências e ciclo
de vida. Controles ocultos ou desabilitados no frontend servem apenas à
experiência do usuário.

## Integridade e ciclo de vida

Um lançamento possui tipo `INCOME` ou `EXPENSE` e nasce como `PENDING`.
Enquanto pendente, pode ser editado, marcado como pago ou cancelado.

Ao registrar pagamento, a API exige data e forma de pagamento e move o registro
para `PAID`. Lançamentos pagos são imutáveis e não podem ser removidos.
Cancelamentos preservam o registro no histórico. A remoção permitida é lógica,
por `deleted_at`.

O banco valida valor positivo, enums oficiais e coerência entre status e data
de pagamento. Referências opcionais a lead e agendamento são tenant-safe.

## API

```text
GET    /api/v1/financial/transactions
POST   /api/v1/financial/transactions
GET    /api/v1/financial/transactions/{transaction_id}
PATCH  /api/v1/financial/transactions/{transaction_id}
DELETE /api/v1/financial/transactions/{transaction_id}
POST   /api/v1/financial/transactions/{transaction_id}/pay
POST   /api/v1/financial/transactions/{transaction_id}/cancel
```

A listagem aceita período de vencimento, tipo, status e paginação. O
`company_id` nunca é recebido do cliente; ele vem da identidade autenticada.

## RBAC

- `VIEW`: consulta e lista lançamentos;
- `CREATE`: cria lançamentos;
- `UPDATE`: edita pendentes, registra pagamento e cancela;
- `DELETE`: executa remoção lógica quando permitida pelo ciclo.

`OWNER`, `ADMIN` e `FINANCIAL` possuem o conjunto completo. `MANAGER` pode
consultar, criar e atualizar. `RECEPTIONIST` pode consultar e criar. Os demais
papéis não recebem acesso financeiro por padrão.

## Interface web

A rota `/financeiro` exige `FINANCIAL:VIEW`. A tela oferece:

- filtros por tipo, status e vencimento;
- paginação;
- representação em tabela no desktop e cartões no mobile;
- criação e edição de lançamentos pendentes;
- registro de pagamento;
- cancelamento e remoção lógica conforme permissão;
- estados de carregamento, erro, vazio, sucesso e somente leitura.

As mutações passam pela sessão HttpOnly e por um BFF com validação same-origin,
allowlist de caminhos e allowlist de parâmetros.

## Fora do escopo atual

Permanecem como evoluções futuras:

- fluxo de caixa consolidado e indicadores agregados;
- contas recorrentes;
- conciliação bancária;
- comissões;
- geração automática de recebíveis a partir de atendimentos concluídos;
- integrações com meios de pagamento e emissão fiscal.
