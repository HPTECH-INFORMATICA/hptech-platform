# Arquitetura da HPTECH Platform

## Objetivo

A HPTECH Platform é uma plataforma SaaS Multiempresa (Multi-Tenant), desenvolvida com arquitetura modular, API First e preparada para escalabilidade.

---

# Arquitetura Geral

Cliente (Browser)

↓

Next.js (Frontend)

↓

FastAPI (Backend)

↓

PostgreSQL (Banco)

↓

Storage / Integrações

---

# Organização

apps/
packages/
services/
infra/
docs/
tests/

---

# Frontend

Framework:

- Next.js

Linguagem:

- TypeScript

UI:

- React

Estilização:

- TailwindCSS

---

# Backend

Framework

FastAPI

Responsabilidades

- autenticação
- regras de negócio
- APIs
- validações
- integração IA

---

# Banco

PostgreSQL

ORM

(Será definido posteriormente)

---

# Infraestrutura

Frontend

Vercel

Backend

Render

Banco

Neon PostgreSQL

Arquivos

Cloudflare R2 (futuro)

---

# Princípios

- Modular
- Escalável
- API First
- Clean Architecture
- SOLID
- Componentização
- Multiempresa

---

# Fluxo

Usuário

↓

Interface Next.js

↓

API FastAPI

↓

Banco PostgreSQL

↓

Resposta JSON

↓

Interface Atualizada
