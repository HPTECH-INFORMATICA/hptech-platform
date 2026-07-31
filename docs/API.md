# API — HPTECH Platform

## Visão Geral

A API da HPTECH Platform será desenvolvida com FastAPI.

Ela será responsável por:

- autenticação;
- autorização;
- regras de negócio;
- isolamento multiempresa;
- validações;
- acesso ao banco;
- integrações externas;
- inteligência artificial.

---

# URL Base

Ambiente local:

```text
http://localhost:8000
```

Prefixo principal:

```text
/api/v1
```

Exemplo:

```text
POST /api/v1/leads
```

---

# Formato dos Dados

A API utilizará JSON.

Exemplo:

```json
{
  "name": "João Silva",
  "whatsapp": "41999999999",
  "email": "joao@email.com",
  "source": "Instagram",
  "interest": "Tratamento capilar"
}
```

---

# Recursos Iniciais

```text
/api/v1/auth
/api/v1/users
/api/v1/companies
/api/v1/leads
/api/v1/appointments
/api/v1/financial
/api/v1/landing-pages
```

---

# Métodos HTTP

```text
GET
POST
PUT
PATCH
DELETE
```

Uso esperado:

```text
GET    /leads
GET    /leads/{id}
POST   /leads
PATCH  /leads/{id}
DELETE /leads/{id}
```

---

# Respostas de Sucesso

Exemplo:

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "João Silva",
    "status": "NOVO"
  }
}
```

---

# Respostas de Erro

Exemplo:

```json
{
  "detail": "Lead não encontrado."
}
```

---

# Status HTTP

```text
200 — Operação concluída
201 — Registro criado
204 — Operação concluída sem conteúdo
400 — Requisição inválida
401 — Usuário não autenticado
403 — Usuário sem permissão
404 — Registro não encontrado
409 — Conflito de dados
422 — Erro de validação
500 — Erro interno
```

---

# Paginação

Listagens deverão utilizar paginação.

Exemplo:

```text
GET /api/v1/leads?page=1&page_size=20
```

Resposta esperada:

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 0,
  "total_pages": 0
}
```

---

# Filtros

Exemplo:

```text
GET /api/v1/leads?status=NOVO&source=Instagram
```

---

# Busca

Exemplo:

```text
GET /api/v1/leads?search=joao
```

---

# Ordenação

Exemplo:

```text
GET /api/v1/leads?order_by=created_at&order=desc
```

---

# Autenticação

A autenticação utilizará tokens seguros.

O formato definitivo será detalhado durante a implementação do módulo de autenticação.

Todas as rotas privadas deverão validar:

- usuário autenticado;
- empresa do usuário;
- função e permissões;
- status da conta.

---

# Multiempresa

O `company_id` não deverá ser recebido livremente do frontend em operações comuns.

O backend deverá identificar a empresa a partir do usuário autenticado.

Exemplo:

```text
Token do usuário
↓
Backend identifica a empresa
↓
Consulta somente dados da empresa
```

Isso evita que um usuário tente acessar registros de outra empresa.

---

# Versionamento

A API utilizará versionamento:

```text
/api/v1
```

Novas versões poderão ser criadas sem quebrar integrações antigas:

```text
/api/v2
```