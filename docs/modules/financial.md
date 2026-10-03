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
- consolidação server-side do fluxo de caixa;
- geração automática de recebíveis ao concluir atendimentos;
- BFF same-origin autenticado no Next.js;
- interface responsiva para consulta e operação dos lançamentos.

O backend permanece como autoridade de permissão, tenant, referências e ciclo
de vida. Controles ocultos ou desabilitados no frontend servem apenas à
experiência do usuário.

## Integridade e ciclo de vida

Um lançamento possui tipo `INCOME` ou `EXPENSE` e nasce como `PENDING`.
Enquanto pendente, pode ser editado, marcado como pago ou cancelado.

Ao registrar pagamento, a API exige data e forma de pagamento e move o registro
para `PAID`. Lançamentos pagos e cancelados somente podem ser corrigidos ou
removidos por `OWNER` e `ADMIN`. Toda correção registra os campos alterados e a
remoção permanece lógica, por `deleted_at`, preservando o histórico de
auditoria.

O banco valida valor positivo, enums oficiais e coerência entre status e data
de pagamento. Referências opcionais a lead e agendamento são tenant-safe.

Ao concluir um atendimento com preço maior que zero, o backend cria uma receita
`PENDING` vinculada ao agendamento na mesma transação da mudança de estado. O
valor e a descrição vêm do snapshot do serviço, e o vencimento usa a data local
do término no fuso da empresa. Serviços gratuitos não geram recebível.

Cada agendamento pode manter somente uma receita ativa por empresa. Essa
invariante é aplicada no domínio e por índice único parcial no PostgreSQL;
lançamentos removidos logicamente não bloqueiam uma recriação deliberada.

## API

```text
GET    /api/v1/financial/transactions
GET    /api/v1/financial/summary
POST   /api/v1/financial/transactions
GET    /api/v1/financial/transactions/{transaction_id}
PATCH  /api/v1/financial/transactions/{transaction_id}
DELETE /api/v1/financial/transactions/{transaction_id}
POST   /api/v1/financial/transactions/{transaction_id}/pay
POST   /api/v1/financial/transactions/{transaction_id}/cancel
```

A listagem aceita período de vencimento, tipo, status e paginação. O
`company_id` nunca é recebido do cliente; ele vem da identidade autenticada.

O resumo financeiro consolida, no backend, receitas e despesas pagas e
pendentes. Cancelados e removidos não participam dos totais. O saldo realizado
considera somente pagamentos concluídos; o saldo projetado inclui pendências.

## RBAC

- `VIEW`: consulta e lista lançamentos;
- `CREATE`: cria lançamentos;
- `UPDATE`: edita pendentes, registra pagamento e cancela; `OWNER` e `ADMIN`
  também corrigem lançamentos concluídos;
- `DELETE`: executa remoção lógica; em registros concluídos exige `OWNER` ou
  `ADMIN`.

`OWNER`, `ADMIN` e `FINANCIAL` possuem o conjunto completo. `MANAGER` pode
consultar, criar e atualizar. `RECEPTIONIST` pode consultar e criar. Os demais
papéis não recebem acesso financeiro por padrão.

## Interface web

A rota `/financeiro` exige `FINANCIAL:VIEW`. A tela oferece:

- filtros por tipo, status e vencimento;
- indicadores de receitas, despesas, saldo realizado e saldo projetado;
- paginação;
- representação em tabela no desktop e cartões no mobile;
- criação e edição de pendentes, com correção master de concluídos;
- registro de pagamento;
- cancelamento e remoção lógica conforme permissão;
- estados de carregamento, erro, vazio, sucesso e somente leitura.

As mutações passam pela sessão HttpOnly e por um BFF com validação same-origin,
allowlist de caminhos e allowlist de parâmetros.

## Fora do escopo atual

Permanecem como evoluções futuras:

- contas recorrentes;
- conciliação bancária;
- comissões;
- integrações com meios de pagamento e emissão fiscal.
