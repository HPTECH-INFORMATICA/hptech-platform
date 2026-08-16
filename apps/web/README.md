# HPTECH Clinic — Frontend

Frontend da HPTECH Clinic, desenvolvido com Next.js e integrado ao backend FastAPI. O CRM/Kanban é o principal módulo funcional atual.

## Pré-requisitos

- Node.js compatível com as dependências do projeto
- pnpm compatível com o workspace
- Backend FastAPI em execução

As dependências do monorepo devem ser instaladas a partir da raiz:

```powershell
pnpm install --frozen-lockfile
```

## Configuração de ambiente

A partir da raiz do repositório, copie o arquivo de exemplo:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

O tenant é derivado da sessão autenticada e não deve ser configurado no frontend.

Mantenha `NEXT_PUBLIC_API_URL` apontando para o backend FastAPI.

Não versione `.env.local`.

## Execução local

A partir da raiz do monorepo:

```powershell
pnpm --filter web dev
```

O frontend ficará disponível em:

```text
http://localhost:3000
```

Também é possível executar diretamente em `apps/web`:

```powershell
pnpm dev
```

## Rotas principais

- `/`: redireciona para `/crm`
- `/crm`: CRM com Kanban de leads

O CRM depende do backend FastAPI e das duas variáveis de ambiente configuradas.

## Validações

A partir da raiz:

```powershell
pnpm --filter web exec tsc --noEmit --incremental false
pnpm --filter web lint
pnpm --filter web build
```

A partir de `apps/web`:

```powershell
pnpm exec tsc --noEmit --incremental false
pnpm lint
pnpm build
```
