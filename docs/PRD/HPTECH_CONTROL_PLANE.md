# PRD — HPTECH Control Plane

**Status:** Normativo — produto interno
**Versão:** 1.0
**Data:** 29/09/2026
**Usuários:** Equipe interna autorizada da HPTECH

## 1. Objetivo

Fornecer o controle interno de todas as organizações, produtos, assinaturas,
licenças, provisionamentos e operações do portfólio HPTECH Platform, sem
misturar papéis internos com papéis dos clientes e sem conceder acesso
irrestrito aos dados operacionais dos produtos.

## 2. Princípio central

O control plane administra **quem contratou o quê, em qual estado, com quais
limites e como o produto está operando**. Ele não é um atalho para consultar ou
alterar prontuários, agendas, documentos ou finanças internas do cliente.

## 3. Perfis internos

- Administrador da plataforma;
- Operações;
- Comercial;
- Financeiro HPTECH;
- Suporte N1/N2;
- Engenharia/SRE;
- Segurança e privacidade;
- Auditor somente leitura.

Cada perfil deve receber permissões mínimas e segregação de funções. Ações de
alto risco podem exigir aprovação de uma segunda pessoa.

## 4. Capacidades

### 4.1 Organizações

- dados cadastrais e responsáveis;
- unidades e contatos;
- situação comercial;
- produtos contratados;
- histórico de relacionamento;
- termos e documentos;
- anotações internas não sensíveis;
- vínculos entre grupos econômicos quando necessário.

### 4.2 Catálogo comercial

- produtos;
- planos;
- complementos;
- preços e moedas;
- limites;
- período de avaliação;
- versões de oferta;
- disponibilidade por segmento;
- entitlements associados.

Alterar uma oferta não deve reescrever contratos existentes sem uma migração
explícita.

### 4.3 Assinaturas e cobrança

- contratação, ativação e renovação;
- trial;
- upgrade e downgrade;
- cancelamento;
- inadimplência e recuperação;
- faturas e pagamentos;
- descontos autorizados;
- histórico de mudanças;
- integração com provedor de cobrança;
- conciliação da receita da própria HPTECH.

### 4.4 Entitlements e uso

- funcionalidades liberadas;
- número de usuários e unidades;
- armazenamento;
- mensagens e integrações;
- uso medido;
- alertas de limite;
- bloqueios graduais e seguros;
- feature flags comerciais auditadas.

### 4.5 Provisionamento

- criação do tenant em cada produto;
- associação entre organização global e tenant local;
- criação ou convite do proprietário inicial;
- configuração de plano e limites;
- acompanhamento de etapas;
- retentativas idempotentes;
- compensação em caso de falha;
- suspensão e reativação;
- encerramento e exportação.

### 4.6 Suporte

- chamados e severidade;
- produto, organização e ambiente afetados;
- timeline e comunicação;
- diagnóstico por metadados e logs permitidos;
- vínculo com incidentes;
- acesso assistido excepcional;
- consentimento e justificativa;
- duração limitada;
- ações totalmente auditadas;
- revogação imediata.

Impersonação silenciosa e credenciais compartilhadas são proibidas.

### 4.7 Operação e observabilidade

- disponibilidade por produto;
- versão implantada;
- falhas de provisionamento;
- filas e integrações;
- erros por organização sem exposição indevida de dados;
- consumo de infraestrutura;
- incidentes;
- manutenção programada;
- comunicação de status;
- indicadores de adoção e saúde do cliente.

### 4.8 Segurança e auditoria

- MFA obrigatório para operadores internos;
- autenticação separada ou política reforçada;
- sessões curtas para ações privilegiadas;
- trilha imutável;
- motivo obrigatório para ações sensíveis;
- alertas de comportamento anômalo;
- revisão periódica de acessos;
- registro de exportações;
- segregação entre suporte, financeiro e engenharia;
- resposta a incidentes.

## 5. Arquitetura

### 5.1 Dados próprios

O control plane mantém:

- organizações globais;
- produtos e planos;
- assinaturas;
- entitlements;
- provisionamentos;
- operadores internos;
- cobranças da HPTECH;
- chamados;
- auditoria interna;
- metadados de saúde e uso permitidos.

Ele não mantém cópias de prontuários ou outros dados operacionais sensíveis dos
produtos.

### 5.2 Integração com produtos

Cada produto expõe contratos autenticados para:

- provisionar tenant;
- aplicar entitlements;
- suspender ou reativar acesso;
- consultar saúde e versão;
- obter métricas agregadas permitidas;
- solicitar exportação ou encerramento.

Comandos devem possuir chave de idempotência, correlação, status consultável e
auditoria. Eventos de domínio devem usar outbox ou mecanismo equivalente antes
de qualquer adoção de mensageria distribuída.

### 5.3 Identidade

Organização, assinatura e usuário global podem ser compartilhados como
identidade comercial. Papéis operacionais permanecem locais a cada produto.

Um `OWNER` no HPTECH Clinic não possui qualquer autoridade no control plane. Um
operador HPTECH não recebe automaticamente acesso ao data plane do cliente.

## 6. Estados mínimos

### Organização

- PROSPECT;
- TRIAL;
- ACTIVE;
- DELINQUENT;
- SUSPENDED;
- CANCELED;
- ARCHIVED.

### Assinatura

- DRAFT;
- TRIALING;
- ACTIVE;
- PAST_DUE;
- SUSPENDED;
- CANCELED;
- EXPIRED.

### Provisionamento

- REQUESTED;
- RUNNING;
- SUCCEEDED;
- FAILED;
- COMPENSATING;
- DEPROVISIONED.

Transições devem ser explícitas, validadas e auditadas.

## 7. MVP interno

O primeiro release deve permitir:

1. cadastrar uma organização;
2. escolher produto e plano;
3. criar uma assinatura;
4. provisionar o tenant;
5. convidar o proprietário inicial;
6. consultar status e falhas;
7. alterar entitlements;
8. suspender e reativar;
9. registrar atendimento de suporte;
10. consultar auditoria.

Cobrança pode começar integrada a um provedor, mas qualquer etapa manual deve
ser explícita e auditada, nunca executada diretamente no banco.

## 8. Critérios de aceite do MVP

- nenhuma ação exige edição manual de banco em operação normal;
- provisionamento pode ser repetido sem criar tenant duplicado;
- falhas são visíveis e recuperáveis;
- suspensão não destrói dados;
- reativação restaura o acesso conforme política;
- operador sem permissão não vê nem executa ação privilegiada;
- acesso de suporte expira automaticamente;
- todas as ações sensíveis possuem ator, data, motivo e correlação;
- produtos recebem somente os entitlements de sua assinatura;
- testes comprovam que cliente e operador interno são domínios de identidade
  separados.

## 9. Não objetivos do MVP

- CRM comercial completo da própria HPTECH;
- contabilidade empresarial completa da HPTECH;
- data warehouse com dados clínicos;
- acesso irrestrito e permanente aos ambientes dos clientes;
- automação de todos os produtos antes do primeiro contrato de integração.
