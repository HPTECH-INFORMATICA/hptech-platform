# Padrões de Desenvolvimento — HPTECH Platform

## Objetivo

Este documento define os padrões de código, nomenclatura, organização e qualidade utilizados no desenvolvimento da HPTECH Platform.

Todos os módulos devem seguir estas convenções.

---

# Princípios Gerais

- Código legível
- Componentes pequenos
- Responsabilidade única
- Tipagem forte
- Evitar duplicação
- Evitar regras de negócio dentro de componentes visuais
- Validar dados recebidos do usuário
- Separar frontend, backend e banco de dados
- Priorizar manutenção e escalabilidade

---

# Idioma do Código

O código-fonte deve utilizar nomes em inglês.

Exemplos:

```ts
const leads = [];
const appointments = [];
const currentUser = {};
```

Os textos exibidos para o usuário devem utilizar português do Brasil.

Exemplo:

```tsx
<h1>Próximos agendamentos</h1>
```

---

# Nomenclatura

## Componentes React

Utilizar PascalCase:

```text
LeadTable.tsx
LeadForm.tsx
DashboardHome.tsx
```

## Funções e variáveis

Utilizar camelCase:

```ts
const currentLead = {};
const totalRevenue = 0;

function createLead() {}
function updateAppointment() {}
```

## Tipos e interfaces

Utilizar PascalCase:

```ts
type LeadStatus = "NOVO" | "CONTATO";

interface Lead {
  id: string;
  name: string;
}
```

## Constantes globais

Utilizar letras maiúsculas:

```ts
const API_URL = "";
const DEFAULT_PAGE_SIZE = 20;
```

## Arquivos utilitários

Utilizar kebab-case:

```text
format-phone.ts
format-currency.ts
validate-email.ts
```

---

# Organização dos Componentes

Cada componente deve possuir apenas uma responsabilidade.

Exemplo:

```text
CRMHome
├── LeadHeader
├── LeadFilters
├── LeadTable
└── LeadPagination
```

Evitar componentes muito grandes que concentrem:

- formulário
- tabela
- filtros
- chamadas de API
- regras de negócio

---

# Componentes Visuais

Componentes reutilizáveis devem ficar em:

```text
apps/web/src/components/ui
```

Exemplos:

```text
Button.tsx
Card.tsx
Input.tsx
Badge.tsx
Avatar.tsx
Modal.tsx
```

Componentes específicos de cada módulo devem ficar dentro da pasta correspondente.

Exemplo:

```text
apps/web/src/components/crm
```

---

# Tipos TypeScript

Tipos compartilhados devem ficar em:

```text
apps/web/src/types
```

Exemplos:

```text
lead.ts
appointment.ts
user.ts
company.ts
financial.ts
```

Evitar utilizar:

```ts
any
```

Preferir tipos explícitos:

```ts
interface Lead {
  id: string;
  name: string;
  email: string;
}
```

---

# Comunicação com a API

Chamadas HTTP não devem ficar diretamente nos componentes visuais.

Utilizar:

```text
apps/web/src/services
```

Exemplo:

```text
services/lead-service.ts
```

Estrutura esperada:

```ts
export async function getLeads() {}

export async function createLead() {}

export async function updateLead() {}

export async function deleteLead() {}
```

---

# Regras de Negócio

Regras de negócio devem ficar:

- no backend, quando envolverem segurança ou consistência;
- em hooks ou funções específicas, quando forem apenas comportamentos da interface.

Exemplos de regras que devem ficar no backend:

- permissões;
- cálculo financeiro;
- acesso por empresa;
- validação de assinatura;
- alteração de status;
- exclusão de registros;
- controle de usuários.

---

# Formatação

Utilizar:

- indentação de 2 espaços;
- ponto e vírgula;
- aspas duplas;
- uma linha em branco entre blocos lógicos;
- nomes descritivos;
- funções pequenas.

---

# Imports

Organizar os imports nesta ordem:

1. Bibliotecas externas
2. Componentes internos
3. Hooks
4. Serviços
5. Tipos
6. Utilitários

Exemplo:

```tsx
import { useState } from "react";

import Button from "@/components/ui/Button";
import { useLeads } from "@/hooks/use-leads";
import { createLead } from "@/services/lead-service";
import type { Lead } from "@/types/lead";
import { formatPhone } from "@/utils/format-phone";
```

---

# Tratamento de Erros

Toda operação assíncrona deve tratar erros.

Exemplo:

```ts
try {
  await createLead(data);
} catch (error) {
  console.error("Erro ao criar lead:", error);
}
```

No futuro, os erros serão exibidos por notificações visuais.

---

# Commits

Utilizar mensagens objetivas.

Exemplos:

```text
feat: adiciona tabela de leads
fix: corrige filtro do CRM
docs: atualiza arquitetura
refactor: reorganiza componentes do dashboard
style: melhora responsividade do header
```

Tipos principais:

```text
feat
fix
docs
refactor
style
test
chore
```

---

# Branches

Estrutura recomendada:

```text
main
develop
feature/nome-da-funcionalidade
fix/nome-da-correcao
```

Exemplos:

```text
feature/crm-lead-table
feature/appointment-calendar
fix/dashboard-responsive
```

---

# Segurança

Nunca colocar no código:

- senhas;
- tokens;
- chaves privadas;
- credenciais do banco;
- segredos de API.

Utilizar variáveis de ambiente.

Exemplo:

```env
DATABASE_URL=
API_URL=
JWT_SECRET=
```

O arquivo `.env` não deve ser enviado para o GitHub.

---

# Critérios de Conclusão

Uma funcionalidade somente será considerada concluída quando:

- estiver tipada;
- estiver organizada;
- não apresentar erros no terminal;
- funcionar em desktop;
- funcionar em dispositivos móveis;
- possuir tratamento básico de erro;
- seguir o padrão visual da plataforma;
- estar preparada para integração com a API.
