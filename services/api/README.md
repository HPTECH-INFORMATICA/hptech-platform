# HPTECH Platform API

Backend da HPTECH Platform, desenvolvido com FastAPI, SQLAlchemy, PostgreSQL, Alembic e Pydantic.

A API oferece atualmente health check, operações de leads, Kanban do CRM, atualização do pipeline, exclusão de leads e consulta do histórico.

## Estado atual

A API está funcional para desenvolvimento e integração local com o frontend HPTECH Clinic.

Autenticação JWT, isolamento multiempresa e autorização RBAC estão implementados. A preparação para produção ainda exige configuração segura do ambiente e os controles operacionais documentados abaixo.

## Pré-requisitos

- Python 3.12 ou superior
- PostgreSQL
- PowerShell no Windows

Os comandos abaixo devem ser executados dentro de `services/api`.

## Ambiente virtual

Crie o ambiente:

```powershell
python -m venv .venv
```

Ative o ambiente:

```powershell
.\.venv\Scripts\Activate.ps1
```

## Instalação

Instale as dependências:

```powershell
python -m pip install -r requirements.txt
```

Valide o ambiente:

```powershell
python -m pip check
```

## Configuração

Copie o arquivo de exemplo:

```powershell
Copy-Item .env.example .env
```

Configure as seguintes variáveis no arquivo `.env`:

- `APP_NAME`: nome apresentado pela API.
- `APP_ENV`: ambiente atual da aplicação.
- `DATABASE_URL`: conexão SQLAlchemy com PostgreSQL.
- `JWT_SECRET`: segredo obrigatório usado para assinar os tokens.
- `JWT_ALGORITHM`: algoritmo fixo de assinatura dos tokens.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: duração dos tokens de acesso.
- `CORS_ORIGINS`: origens explícitas permitidas, separadas por vírgula; produção exige HTTPS.

Não versione `.env`. Não coloque credenciais reais em `.env.example`.

## Banco de dados e migrations

Consulte a revisão aplicada:

```powershell
python -m alembic current
```

Consulte as heads disponíveis:

```powershell
python -m alembic heads
```

Consulte o histórico:

```powershell
python -m alembic history
```

Aplique as migrations pendentes:

```powershell
python -m alembic upgrade head
```

A head atual do projeto é `3dd650dd94f9`.

## Execução

Inicie o servidor de desenvolvimento:

```powershell
python -m uvicorn app.main:app --reload
```

A API ficará disponível em:

```text
http://127.0.0.1:8000
```

## Documentação interativa

Swagger:

```text
http://127.0.0.1:8000/docs
```

Health check:

```text
http://127.0.0.1:8000/api/v1/health
```

## Endpoints atuais

```text
GET    /
GET    /api/v1/health
POST   /api/v1/leads
GET    /api/v1/leads
GET    /api/v1/leads/kanban
GET    /api/v1/leads/{lead_id}
PATCH  /api/v1/leads/{lead_id}
DELETE /api/v1/leads/{lead_id}
PATCH  /api/v1/leads/{lead_id}/pipeline
GET    /api/v1/lead-history/lead/{lead_id}
```

A movimentação pelo endpoint de pipeline cria o histórico internamente. Não existe endpoint público para criação manual de histórico.

## Validações técnicas

Valide as dependências:

```powershell
python -m pip check
```

Valide a importação da aplicação:

```powershell
python -B -c "from app.main import app; print(app.title)"
```

Os testes automatizados cobrem autenticação, RBAC, isolamento multiempresa, CORS e demais primitivas de segurança atuais.

## Limitações conhecidas

- Rate limiting de login ainda não foi implementado.
- Não existem refresh token, revogação por blacklist ou MFA.
- CSP completa, HSTS no edge e observabilidade de segurança permanecem pendentes para o hardening de produção.

## Requisitos antes de produção

Antes de qualquer exposição pública:

1. Configurar segredos e origens HTTPS próprios do ambiente.
2. Adicionar rate limiting distribuído ao login.
3. Definir CSP completa e HSTS na camada de borda HTTPS.
4. Adicionar observabilidade e auditoria operacional de segurança.
5. Validar migrations em ambiente isolado.
