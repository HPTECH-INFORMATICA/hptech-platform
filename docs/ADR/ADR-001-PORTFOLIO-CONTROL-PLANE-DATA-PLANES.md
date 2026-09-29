# ADR-001 — Separar portfólio, control plane e data planes

**Status:** Aceito
**Data:** 29/09/2026

## Contexto

A expressão HPTECH Platform vinha sendo usada simultaneamente para a marca do
ecossistema, para o sistema de clínicas e para uma futura administração interna.
Com a criação de outros produtos, essa ambiguidade cria risco de experiência,
segurança, cobrança e evolução arquitetural.

## Decisão

1. HPTECH Platform passa a significar o portfólio.
2. O sistema operacional das clínicas passa a se chamar HPTECH Clinic.
3. A operação interna será implementada no HPTECH Control Plane.
4. Cada produto constitui um data plane independente.
5. Organizações e assinaturas possuem identidade global, mas o tenant e os
   papéis operacionais permanecem locais ao produto.
6. Operadores internos não serão modelados como superadministradores dos
   produtos.
7. Acesso de suporte será excepcional, temporário, justificado e auditado.

## Consequências positivas

- identidade clara para clientes;
- isolamento preservado;
- novos produtos reutilizam capacidades comerciais;
- cobrança e provisionamento centralizados;
- suporte controlado;
- evolução independente dos produtos;
- menor risco de vazamento entre tenants.

## Custos e consequências negativas

- novos contratos de integração;
- mapeamento entre organização global e tenant local;
- operação distribuída exige idempotência e observabilidade;
- migração gradual da nomenclatura existente;
- autenticação central futura exige planejamento de compatibilidade.

## Alternativas rejeitadas

### Um único monólito e banco para todos os produtos

Rejeitado por acoplamento de domínio, impacto operacional e risco de segurança.

### Superadministrador em cada produto

Rejeitado porque mistura identidades internas e do cliente, amplia privilégios
e dificulta auditoria.

### Administração manual diretamente nos bancos

Rejeitada como operação normal por ausência de validação, rastreabilidade,
reversão e segurança.

## Implementação incremental

O control plane pode começar como monólito modular. Produtos existentes adotam
primeiro identificadores globais, entitlements e provisionamento. Mensageria e
serviços separados somente serão introduzidos quando escala ou confiabilidade
justificarem.
