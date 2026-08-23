# Deploy — HPTECH Platform

## Objetivo

Este documento define a estratégia inicial de publicação, configuração de ambientes e operação da HPTECH Platform.

A plataforma será composta por:

- frontend;
- backend;
- banco de dados;
- armazenamento de arquivos;
- integrações externas;
- monitoramento.

---

# Arquitetura de Produção

```text
Usuário
↓
Vercel — Frontend Next.js
↓
Render — API FastAPI
↓
Neon — PostgreSQL
```

Serviços futuros:

```text
Cloudflare R2 — arquivos
Redis — cache e filas
Sentry — monitoramento de erros
Resend — envio de e-mails
```

## Email transacional e convites

O provider oficial de email transacional é o Resend. A integração é executada
exclusivamente pelo backend e exige:

```text
RESEND_API_KEY=
EMAIL_FROM=HPTECH Platform <no-reply@dominio-verificado.example>
FRONTEND_PUBLIC_URL=https://app.example.com
USER_INVITATION_TTL_HOURS=24
```

- verifique o domínio e o remetente no Resend;
- armazene `RESEND_API_KEY` somente no secret manager do backend;
- nunca exponha a chave como `NEXT_PUBLIC_*`;
- confirme que `FRONTEND_PUBLIC_URL` aponta para a aplicação oficial;
- faça um smoke test controlado: crie o convite, receba o email, abra o link,
  defina a senha e autentique-se;
- o token usa fragmento de URL e não é enviado em requisições de navegação;
- não registre URLs de convite, tokens ou senhas em logs.

---

# Ambientes

A plataforma deverá possuir ambientes separados.

## Desenvolvimento

Utilizado no computador do desenvolvedor.

Exemplo:

```text
Frontend:
http://localhost:3000

Backend:
http://localhost:8000
```

---

## Homologação

Utilizado para testes antes da publicação oficial.

Exemplo:

```text
https://staging.hptechinformatica.com
```

A homologação deverá utilizar:

- banco separado;
- variáveis próprias;
- credenciais próprias;
- integrações de teste;
- dados não produtivos.

---

## Produção

Ambiente utilizado pelos clientes.

Exemplo:

```text
https://app.hptechinformatica.com
```

A produção deverá utilizar:

- banco exclusivo;
- segredos protegidos;
- backups;
- HTTPS;
- monitoramento;
- logs;
- controle de acesso.

---

# Frontend

Tecnologia:

```text
Next.js
```

Hospedagem inicial:

```text
Vercel
```

Diretório do projeto:

```text
apps/web
```

---

# Configuração do Projeto na Vercel

Configurações previstas:

```text
Framework Preset: Next.js
Root Directory: apps/web
Install Command: pnpm install
Build Command: pnpm build
Output Directory: padrão do Next.js
```

Como o projeto utiliza monorepo, a configuração poderá exigir acesso ao arquivo:

```text
pnpm-workspace.yaml
```

na raiz do repositório.

---

# Backend

Tecnologia:

```text
FastAPI
```

Hospedagem inicial:

```text
Render
```

Diretório previsto:

```text
services/api
```

Comando de inicialização previsto:

```text
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

O comando definitivo será validado após a criação da estrutura do backend.

---

# Banco de Dados

Tecnologia:

```text
PostgreSQL
```

Provedor inicial:

```text
Neon
```

A conexão será realizada por variável de ambiente.

Exemplo:

```env
DATABASE_URL=
```

A URL real nunca deverá ser salva no código ou enviada para o GitHub.

---

# Variáveis de Ambiente

## Frontend

Arquivo local:

```text
apps/web/.env.local
```

Exemplo:

```env
API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Em produção:

```env
API_URL=https://api.hptechinformatica.com/api/v1
NEXT_PUBLIC_APP_URL=https://app.hptechinformatica.com
```

---

## Backend

Arquivo local previsto:

```text
services/api/.env
```

Exemplo:

```env
APP_ENV=development
APP_NAME=HPTECH Platform
DATABASE_URL=
JWT_SECRET=
CORS_ORIGINS=http://localhost:3000
```

Outras variáveis serão adicionadas conforme as integrações forem implementadas.

---

# Segurança das Variáveis

Nunca enviar para o GitHub:

```text
.env
.env.local
.env.production
.env.development
```

O repositório deverá possuir apenas arquivos de exemplo.

Exemplo:

```text
.env.example
```

Conteúdo de exemplo:

```env
DATABASE_URL=
JWT_SECRET=
API_URL=
```

---

# Arquivo `.gitignore`

O projeto deverá ignorar, no mínimo:

```text
node_modules
.next
.env
.env.local
.env.development
.env.production
__pycache__
.venv
dist
coverage
```

---

# Domínios

Estrutura recomendada:

```text
hptechinformatica.com
www.hptechinformatica.com
app.hptechinformatica.com
api.hptechinformatica.com
staging.hptechinformatica.com
```

Uso previsto:

```text
www.hptechinformatica.com
Site institucional

app.hptechinformatica.com
Plataforma SaaS

api.hptechinformatica.com
Backend FastAPI

staging.hptechinformatica.com
Ambiente de homologação
```

---

# HTTPS

Todos os ambientes públicos deverão utilizar HTTPS.

Não será permitido o uso de conexões inseguras em produção.

Exemplo correto:

```text
https://app.hptechinformatica.com
```

Exemplo incorreto:

```text
http://app.hptechinformatica.com
```

---

# CORS

O backend deverá aceitar requisições apenas de origens autorizadas.

Exemplo em desenvolvimento:

```text
http://localhost:3000
```

Exemplo em produção:

```text
https://app.hptechinformatica.com
```

Não utilizar em produção:

```text
*
```

A liberação ampla de origens pode expor a API a riscos desnecessários.

---

# Migrations

Toda alteração estrutural no banco deverá ser realizada por migrations.

Exemplos:

```text
criar tabela companies
adicionar campo company_id em leads
criar índice para status
alterar tamanho do campo email
```

Não alterar manualmente o banco de produção sem registrar a mudança em uma migration.

---

# Processo de Deploy

Fluxo recomendado:

```text
Desenvolvimento local
↓
Commit
↓
Push para branch
↓
Pull Request
↓
Revisão
↓
Merge
↓
Deploy em homologação
↓
Testes
↓
Deploy em produção
```

Durante a fase inicial, o processo poderá ser simplificado, mas deverá evoluir para esse padrão.

---

# Branches e Ambientes

Estratégia inicial:

```text
main
Produção

develop
Homologação

feature/*
Desenvolvimento de funcionalidades

fix/*
Correções
```

---

# Verificações Antes do Deploy

Antes de publicar uma nova versão:

- confirmar que o projeto compila;
- executar os testes disponíveis;
- verificar erros no terminal;
- validar variáveis de ambiente;
- conferir migrations;
- testar autenticação;
- testar isolamento multiempresa;
- testar as principais rotas;
- validar responsividade;
- revisar permissões;
- verificar se nenhum segredo foi enviado ao GitHub.

---

# Comandos do Frontend

Na raiz do monorepo:

```bash
pnpm install
pnpm dev
pnpm build
```

O comando abaixo deverá concluir sem erros antes do deploy:

```bash
pnpm build
```

---

# Comandos do Backend

Os comandos definitivos serão definidos após a criação do FastAPI.

Estrutura prevista:

```bash
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Em produção:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

# Logs

O sistema deverá registrar eventos importantes, como:

- falhas de autenticação;
- erros da API;
- integrações com falha;
- tarefas automáticas;
- operações administrativas;
- erros de banco;
- alterações críticas.

Logs não deverão armazenar:

- senhas;
- tokens completos;
- dados sensíveis desnecessários;
- credenciais;
- informações financeiras completas.

---

# Monitoramento

Ferramentas futuras previstas:

```text
Sentry
UptimeRobot
Better Stack
```

O monitoramento deverá permitir identificar:

- indisponibilidade;
- erros do frontend;
- erros do backend;
- lentidão;
- falhas em integrações;
- uso elevado de recursos.

---

# Backups

O banco de produção deverá possuir política de backup.

Requisitos mínimos:

- backup automático;
- retenção definida;
- teste de restauração;
- separação entre produção e homologação;
- proteção das credenciais.

Um backup somente é confiável quando sua restauração foi testada.

---

# Rollback

Toda publicação deverá permitir retorno à versão anterior em caso de erro.

Possíveis ações:

```text
reverter o deploy do frontend;
reverter o deploy do backend;
restaurar migration compatível;
desativar temporariamente uma funcionalidade;
utilizar feature flags futuramente.
```

Migrations destrutivas deverão ser evitadas.

---

# Disponibilidade

Na fase inicial, a plataforma utilizará serviços gerenciados para reduzir complexidade operacional:

- Vercel;
- Render;
- Neon.

Conforme a plataforma crescer, a infraestrutura poderá evoluir para:

- containers;
- filas;
- cache;
- workers;
- balanceamento;
- observabilidade centralizada.

---

# Critérios para Produção

A HPTECH Platform somente deverá entrar em produção quando possuir:

- autenticação funcional;
- isolamento multiempresa validado;
- banco com migrations;
- HTTPS;
- variáveis protegidas;
- tratamento de erros;
- logs;
- backup;
- política de acesso;
- testes dos fluxos principais;
- páginas de erro;
- documentação de recuperação.

---

# Responsabilidade

A publicação deverá respeitar os documentos:

```text
ARCHITECTURE.md
DATABASE.md
API.md
CODING-STANDARDS.md
```

Nenhuma decisão de infraestrutura deverá comprometer:

- segurança;
- isolamento dos clientes;
- integridade dos dados;
- possibilidade de crescimento;
- manutenção da plataforma.
