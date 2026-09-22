# Banco de Dados — HPTECH Platform

## Objetivo

A HPTECH Platform utilizará PostgreSQL como banco de dados principal.

O banco deverá suportar:

- múltiplas empresas;
- múltiplos usuários;
- isolamento dos dados;
- CRM;
- agenda;
- financeiro;
- landing pages;
- inteligência artificial;
- auditoria;
- crescimento modular.

---

# Tecnologia

Banco:

```text
PostgreSQL
```

Provedor inicial:

```text
Neon
```

Backend responsável pelo acesso:

```text
FastAPI
```

ORM:

```text
Será definido na etapa de implementação do backend.
```

---

# Estratégia Multiempresa

A plataforma será Multi-Tenant.

Cada empresa será representada por um registro em:

```text
companies
```

As principais tabelas possuirão:

```text
company_id
```

Exemplo:

```text
leads
appointments
financial_transactions
landing_pages
users
```

Isso permitirá identificar a empresa proprietária de cada registro.

---

# Regra de Isolamento

Um usuário somente poderá acessar dados pertencentes à empresa associada à sua conta.

Exemplo:

```text
Usuário da Empresa A
↓
Somente dados com company_id da Empresa A
```

A filtragem por empresa deverá ser obrigatória no backend.

O frontend nunca será responsável pela segurança do isolamento entre empresas.

---

# Entidades Principais

## Companies

Representa uma empresa cliente da plataforma.

Campos iniciais:

```text
id
name
document
email
phone
slug
status
created_at
updated_at
```

---

## Users

Representa um usuário da plataforma.

Campos iniciais:

```text
id
company_id
name
email
password_hash
role
status
created_at
updated_at
```

---

## Leads

Representa um contato comercial ou potencial cliente.

Campos iniciais:

```text
id
company_id
name
phone
whatsapp
email
source
interest
status
assigned_user_id
notes
created_at
updated_at
```

---

## Appointments

Representa um agendamento clínico tenant-aware. Horários são persistidos como
instantes com timezone, enquanto a entrada da API usa data e hora civil no fuso
IANA configurado para a empresa.

Campos atuais:

```text
id
company_id
lead_id
professional_id
patient_id
clinical_professional_id
service_id
service_name_snapshot
service_duration_minutes_snapshot
service_price_snapshot
title
description
starts_at
ends_at
status
notes
deleted_at
created_at
updated_at
```

`professional_id` é a referência legada para `users.id` e permanece nullable.
O contrato clínico usa `clinical_professional_id` com referência tenant-safe
para `professionals.id`.

Os estados suportados são `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`,
`CANCELED` e `NO_SHOW`. Agendamentos ativos do mesmo profissional não podem se
sobrepor; a restrição PostgreSQL considera o intervalo semiaberto `[starts_at,
ends_at)` e ignora registros cancelados, concluídos, ausentes ou removidos.

Os snapshots de serviço preservam nome, duração e preço existentes no momento
da criação. As relações com paciente, profissional clínico e serviço usam
chaves compostas com `company_id` para impedir referências entre tenants.

---

## Financial Transactions

Representa entradas e saídas financeiras.

Campos iniciais:

```text
id
company_id
type
category
description
amount
due_date
payment_date
status
created_at
updated_at
```

O campo `amount` deverá ser armazenado como decimal, nunca como texto.

Exemplo visual:

```text
R$ 150,00
```

No banco, o valor será armazenado numericamente.

---

## Landing Pages

Representa uma landing page criada dentro da plataforma.

Campos iniciais:

```text
id
company_id
name
slug
status
template
content
published_at
created_at
updated_at
```

---

# Campos de Auditoria

As tabelas principais deverão utilizar:

```text
created_at
updated_at
```

Quando necessário:

```text
created_by
updated_by
deleted_at
```

---

# Exclusão Lógica

Dados importantes não deverão ser apagados permanentemente de forma imediata.

Quando aplicável, será utilizado:

```text
deleted_at
```

Quando esse campo possuir uma data, o registro será considerado excluído.

Isso é chamado de exclusão lógica ou soft delete.

---

# Identificadores

A definição final entre UUID e identificadores sequenciais será realizada antes da criação das migrations.

A recomendação inicial para um sistema SaaS é utilizar UUID.

Exemplo:

```text
550e8400-e29b-41d4-a716-446655440000
```

---

# Datas

Datas e horários serão armazenados de forma padronizada.

O backend deverá considerar fuso horário.

Na interface, as datas serão exibidas no padrão brasileiro.

Exemplo:

```text
29/07/2026
```

---

# Valores Financeiros

Valores monetários devem utilizar tipo decimal.

Nunca utilizar ponto flutuante comum para cálculos financeiros.

Exemplo:

```text
numeric(14, 2)
```

Apresentação no frontend:

```text
R$ 1.250,00
```

---

# Índices

Serão criados índices para campos utilizados em:

- buscas;
- filtros;
- relacionamentos;
- login;
- isolamento por empresa.

Exemplos:

```text
company_id
email
status
created_at
start_at
due_date
```

---

# Regras Obrigatórias

- Toda entidade de negócio deverá possuir `company_id`.
- Toda consulta deverá respeitar o tenant atual.
- E-mails de usuários deverão possuir restrições de unicidade.
- Senhas nunca serão armazenadas em texto puro.
- Valores financeiros utilizarão decimal.
- Registros importantes deverão possuir auditoria.
- Alterações estruturais serão realizadas por migrations.

---

# Relacionamento Company e User

Cada usuário pertence inicialmente a uma empresa.

```text
companies
1
↓
N
users
```

Relacionamento:

```text
users.company_id → companies.id
```

---

# Regras da Empresa

Uma empresa poderá possuir os seguintes status:

```text
TRIAL
ACTIVE
SUSPENDED
CANCELED
```

Significados:

```text
TRIAL
Empresa em período de avaliação.

ACTIVE
Empresa com acesso normal à plataforma.

SUSPENDED
Empresa temporariamente impedida de utilizar a plataforma.

CANCELED
Empresa com contrato ou assinatura cancelada.
```

---

# Regras do Usuário

Um usuário poderá possuir os seguintes status:

```text
INVITED
ACTIVE
SUSPENDED
INACTIVE
```

O usuário somente poderá acessar a plataforma quando:

```text
company.status = ACTIVE ou TRIAL
```

e:

```text
user.status = ACTIVE
```

---

# Papéis de Usuário

Papéis iniciais:

```text
OWNER
ADMIN
MANAGER
PROFESSIONAL
RECEPTIONIST
SALES
FINANCIAL
VIEWER
```

O papel controla o conjunto inicial de permissões do usuário.

A validação definitiva deverá ocorrer no backend.

---

# Regra de Segurança Multiempresa

Toda consulta de dados deverá incluir a empresa do usuário autenticado.

Exemplo conceitual:

```sql
SELECT *
FROM leads
WHERE company_id = :authenticated_company_id;
```

Nunca utilizar um `company_id` enviado livremente pelo frontend como fonte confiável.

O backend deverá obter o identificador da empresa por meio da sessão ou do token autenticado.
---

# Modelo Conceitual do CRM

## Lead

Relacionamentos:

```text
Company
1
↓
N
Lead
```

```text
User
1
↓
N
Lead
```

```text
Lead
1
↓
N
LeadHistory
```

```text
Lead
1
↓
N
Activity
```

```text
Lead
N
↓
N
Tag
```

---

# Funil Comercial

```text
NEW

↓

CONTACTED

↓

QUALIFIED

↓

PROPOSAL

↓

NEGOTIATION

↓

WON
```

ou

```text
LOST
```

---

# Origens

```text
Instagram

Facebook

Google

Website

WhatsApp

Indicação

Evento

Outro
```

---

# Histórico

Toda alteração importante deverá gerar histórico.

Exemplos:

- criação;
- alteração;
- troca de responsável;
- troca de status;
- envio de WhatsApp;
- envio de e-mail;
- observações;
- atividades.

---

# Auditoria

Nenhuma alteração importante deverá ser perdida.

Sempre que possível registrar:

- usuário;
- data;
- ação executada.
