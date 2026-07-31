# Módulo de Usuários

## Objetivo

O módulo de usuários controla o acesso dos colaboradores de cada empresa à HPTECH Platform.

---

# Escopo

O módulo será responsável por:

- cadastro de usuários;
- convite por e-mail;
- ativação;
- alteração de função;
- suspensão;
- desativação;
- permissões;
- associação com empresa;
- auditoria de acesso.

---

# Papéis

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

---

# Regras

## Owner

É o proprietário principal da conta.

Possui acesso total à empresa.

A empresa deverá possuir pelo menos um usuário com papel:

```text
OWNER
```

---

## Admin

Gerencia a maior parte da plataforma, usuários e configurações operacionais.

Não deverá possuir automaticamente permissão para alterar propriedade da empresa.

---

## Manager

Gerencia operações, CRM, agenda, relatórios e parte do financeiro.

---

## Professional

Acessa informações relacionadas ao atendimento e à própria agenda.

---

## Receptionist

Gerencia leads, pacientes e agendamentos.

---

## Sales

Gerencia oportunidades e contatos comerciais.

---

## Financial

Acessa o módulo financeiro e relatórios autorizados.

---

## Viewer

Possui acesso somente para visualização.

---

# Fluxo de Convite

```text
Administrador cadastra o e-mail
↓
Sistema cria usuário com status INVITED
↓
Usuário recebe convite
↓
Usuário define a senha
↓
Conta passa para ACTIVE
```

---

# Regras de Segurança

- O usuário não escolhe livremente a empresa.
- O vínculo com a empresa é definido pelo convite.
- As permissões devem ser validadas no backend.
- Usuários suspensos não podem acessar a plataforma.
- Toda alteração de função deve ser auditada.
- Um usuário comum não poderá promover a si próprio.
- O último OWNER da empresa não poderá ser removido sem transferência de propriedade.
