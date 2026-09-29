# HPTECH Platform — Documentação

## Definição atual

A **HPTECH Platform** é o portfólio SaaS da HPTECH Informática. Cada produto
possui domínio e aplicação próprios, enquanto o **HPTECH Control Plane** fornece
o controle interno de organizações, assinaturas, entitlements, provisionamento
e suporte.

O sistema de gestão usado pelas clínicas contratantes chama-se **HPTECH Clinic**.
Ele não é o painel interno da HPTECH.

## Documentos normativos

Leia nesta ordem:

1. [`PRD/HPTECH_PLATFORM_PORTFOLIO.md`](PRD/HPTECH_PLATFORM_PORTFOLIO.md) —
   portfólio, vocabulário, superfícies e governança;
2. [`ADR/ADR-001-PORTFOLIO-CONTROL-PLANE-DATA-PLANES.md`](ADR/ADR-001-PORTFOLIO-CONTROL-PLANE-DATA-PLANES.md)
   — decisão de separação arquitetural;
3. [`PRD/HPTECH_CLINIC.md`](PRD/HPTECH_CLINIC.md) — produto para as clínicas;
4. [`PRD/HPTECH_CONTROL_PLANE.md`](PRD/HPTECH_CONTROL_PLANE.md) — operação
   interna do portfólio;
5. [`Roadmap/HPTECH_CLINIC_RECOVERY.md`](Roadmap/HPTECH_CLINIC_RECOVERY.md) —
   ordem de execução, gates e definição de pronto.

Contratos de domínio em execução:

- [`modules/professionals.md`](modules/professionals.md) — cadastro operacional,
  credenciais, unidades, serviços, documentos, remuneração e conta de acesso.

## Referências anteriores

- [`HPTECH_PLATFORM_V2.md`](HPTECH_PLATFORM_V2.md) permanece como documento de
  origem da visão clínica e das garantias transversais;
- [`ARCHITECTURE.md`](ARCHITECTURE.md), [`DATABASE.md`](DATABASE.md),
  [`API.md`](API.md) e documentos em [`modules/`](modules/) detalham a
  implementação existente;
- em caso de ambiguidade sobre plataforma versus produto, os documentos
  normativos listados acima possuem precedência;
- marcações antigas de módulo "concluído" descrevem entregas técnicas e não
  disponibilidade comercial.

## Stack atual do HPTECH Clinic

- Next.js, React, TypeScript e Tailwind CSS;
- FastAPI;
- PostgreSQL;
- Vercel e Render.

## Estado comercial

O HPTECH Clinic está em **Alpha interna**. A venda depende dos gates definidos
no roadmap de recuperação.

Desenvolvido por HPTECH Informática.
