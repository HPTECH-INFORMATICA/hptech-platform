# HPTECH Platform API

Backend da HPTECH Platform, desenvolvido com FastAPI, SQLAlchemy, PostgreSQL, Alembic e Pydantic.

A API oferece health check, autenticação e administração tenant-aware, CRM e o domínio de serviços agendáveis.

## Estado atual

A API está funcional para desenvolvimento e integração local com o frontend HPTECH Clinic.

Autenticação JWT, isolamento multiempresa e autorização RBAC estão implementados. A preparação para produção ainda exige configuração segura do ambiente e os controles operacionais documentados abaixo.

## Pré-requisitos

- Python 3.12
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
python -m pip install -r requirements-dev.txt
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
- `LOGIN_RATE_LIMIT_ATTEMPTS`: máximo de falhas por janela e identidade de origem.
- `LOGIN_RATE_LIMIT_WINDOW_SECONDS`: duração da janela de limitação do login.
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

A head atual do projeto é `b6e4d2a91c73`.

O bootstrap administrativo do primeiro OWNER está descrito em
`../../docs/SECURITY_DEPLOY_CHECKLIST.md`; ele exige uma empresa existente e
solicita a senha interativamente.

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

Readiness com verificação PostgreSQL sanitizada:

```text
http://127.0.0.1:8000/api/v1/readiness
```

`health` comprova apenas o processo vivo. `readiness` executa somente
`SELECT 1`, possui timeout de conexão e retorna `503` sem detalhes internos
quando o banco não está disponível.

## Endpoints atuais

```text
GET    /
GET    /api/v1/health
GET    /api/v1/readiness
POST   /api/v1/leads
GET    /api/v1/leads
GET    /api/v1/leads/kanban
GET    /api/v1/leads/{lead_id}
PATCH  /api/v1/leads/{lead_id}
DELETE /api/v1/leads/{lead_id}
PATCH  /api/v1/leads/{lead_id}/pipeline
GET    /api/v1/lead-history/lead/{lead_id}
GET    /api/v1/services
POST   /api/v1/services
GET    /api/v1/services/{service_id}
PATCH  /api/v1/services/{service_id}
PATCH  /api/v1/services/{service_id}/status
DELETE /api/v1/services/{service_id}
```

A movimentação pelo endpoint de pipeline cria o histórico internamente. Não existe endpoint público para criação manual de histórico.

### Serviços

O módulo `SERVICES` usa as ações RBAC `VIEW`, `CREATE`, `UPDATE` e `DELETE`.
As permissões efetivas continuam sendo calculadas pela política-base combinada
com os overrides tenant-aware. Todos os endpoints derivam `company_id` da
identidade autenticada e respondem `404` para registros de outro tenant.

Serviços removidos usam soft delete: `deleted_at` é preenchido e `is_active`
passa a `false`. A desativação pelo endpoint de status não remove o registro.
Criação, atualização, mudança de status e remoção geram eventos no AuditLog na
mesma transação da mutação. Agenda, Appointment e Patient não fazem parte deste
lote.

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

Antes de importar a aplicação, `tests/conftest.py` força `APP_ENV=test` e uma
URL PostgreSQL exclusivamente loopback com nome terminado em `_test`. Isso
impede que a suíte use a `DATABASE_URL` do `.env` ou alcance Neon/produção. Os
testes atuais usam doubles determinísticos e não criam banco externo.

## Limitações conhecidas

- Não existem refresh token, revogação por blacklist ou MFA.
- Audit trail administrativo completo permanece como evolução futura.

## Requisitos antes de produção

Antes de qualquer exposição pública:

1. Configurar segredos e origens HTTPS próprios do ambiente.
2. Aplicar a migration do rate limiting persistido no PostgreSQL.
3. Confirmar CSP e HSTS no endpoint público servido por HTTPS.
4. Encaminhar logs de segurança agregados para a observabilidade operacional.
5. Validar migrations em ambiente isolado.
