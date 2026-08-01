# HPTECH Platform API

Backend da HPTECH Platform, desenvolvido com FastAPI, SQLAlchemy, PostgreSQL, Alembic e Pydantic.

A API oferece atualmente health check, operações de leads, Kanban do CRM, atualização do pipeline, exclusão de leads e consulta do histórico.

## Estado atual

A API está funcional para desenvolvimento e integração local com o frontend HPTECH Clinic.

Autenticação e autorização multiempresa ainda não estão implementadas. A API não está pronta para exposição pública ou uso com dados reais em ambiente acessível externamente.

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
- `JWT_SECRET`: segredo reservado para a futura integração JWT.
- `JWT_ALGORITHM`: algoritmo previsto para assinatura dos tokens.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: duração prevista dos tokens.
- `CORS_ORIGINS`: origens permitidas pelo CORS, separadas por vírgula.

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

Ainda não existem testes automatizados configurados para o backend.

## Limitações conhecidas

- As rotas não exigem autenticação.
- Não existe autorização baseada no usuário ou empresa.
- `company_id` ainda é recebido do cliente.
- O GET de histórico ainda é público.
- O helper JWT existente não protege nenhuma rota.
- O fechamento da sessão realiza rollback implícito, mas não existe tratamento centralizado de erros de integridade.
- A API não deve ser exposta publicamente nem utilizada com dados reais sem as proteções necessárias.

## Requisitos antes de produção

Antes de qualquer exposição pública:

1. Implementar autenticação.
2. Derivar o tenant do usuário autenticado.
3. Implementar autorização multiempresa.
4. Proteger as rotas de leads e histórico.
5. Validar configuração segura de JWT e CORS.
6. Adicionar tratamento de erros e rollback explícito.
7. Criar testes automatizados.
8. Validar migrations em ambiente isolado.
