# Roadmap de Recuperação — HPTECH Clinic

**Status:** Normativo
**Versão:** 1.0
**Data-base:** 29/09/2026
**Estado atual:** Alpha interna — não disponível comercialmente

## 1. Objetivo

Transformar a fundação técnica existente em um produto clínico integrado,
operável e comercializável, enquanto a HPTECH cria o controle interno necessário
para administrar um portfólio com múltiplos produtos.

Este roadmap substitui a interpretação de que Agenda, Financeiro, CRM ou Landing
Pages estão comercialmente concluídos. Entregas anteriores permanecem como base
técnica e serão reavaliadas pelos critérios deste documento.

## 2. Regras de execução

1. Priorizar jornadas ponta a ponta, não quantidade de telas.
2. Não iniciar um épico sem regras de negócio e critérios de aceite.
3. Não marcar módulo como pronto quando o cliente ainda precisa de planilha para
   completar o mesmo processo.
4. Integridade, auditoria e reversão fazem parte da funcionalidade.
5. Correções rápidas de experiência podem ocorrer em paralelo, mas não substituem
   modelagem de domínio.
6. Todo fluxo crítico deve possuir testes de backend, frontend e E2E.
7. Decisões clínicas, financeiras e de privacidade exigem revisão humana.
8. Novos produtos devem integrar o control plane desde o início.

## 3. Estados do backlog

- `DISCOVERY`: problema ainda sendo validado;
- `READY`: especificação e dependências aprovadas;
- `IN_PROGRESS`: desenvolvimento ativo;
- `VERIFYING`: validação técnica e de produto;
- `PILOT`: uso controlado por clientes parceiros;
- `DONE`: resultado validado e operável;
- `BLOCKED`: impedimento explícito e responsável definido.

`DONE` não significa apenas merge ou deploy.

## 4. Frente A — Clareza de produto

### A1. Identidade HPTECH Clinic — P0

- substituir a identificação visível genérica por HPTECH Clinic;
- exibir clínica ativa com destaque;
- exibir função e unidade atuais;
- revisar login, início, shell, configurações e mensagens;
- trocar terminologia visível de empresa por clínica quando apropriado;
- substituir tenant de demonstração por nome não confundível com a HPTECH.

**Aceite:** um usuário novo identifica em até cinco segundos qual produto está
usando e qual clínica está administrando, em desktop e celular.

### A2. Navegação e padrões operacionais — P0

- botão Voltar explícito em fluxos profundos;
- breadcrumbs consistentes;
- ações primárias e perigosas padronizadas;
- tabelas e cards alinhados;
- estados de carregamento, vazio e erro;
- atalhos e contexto por perfil.

**Aceite:** teste moderado com usuários representativos sem orientação externa.

## 5. Frente B — Control plane

### B1. Fundação interna — P0

- organização global;
- catálogo de produtos e planos;
- assinatura e entitlements;
- operadores internos e RBAC;
- auditoria;
- mapeamento organização ↔ tenant.

### B2. Provisionamento HPTECH Clinic — P0

- criação idempotente de tenant;
- proprietário inicial;
- configuração de plano;
- acompanhamento e retentativa;
- suspensão e reativação.

### B3. Operação e suporte — P1

- saúde do produto;
- chamados;
- acesso assistido temporário;
- trilha completa;
- métricas agregadas permitidas.

**Gate B:** uma clínica pode ser ativada, suspensa e reativada sem edição manual
do banco e sem conceder acesso global ao data plane.

## 6. Frente C — Cadastros estruturantes e onboarding

### C1. Clínica e unidades — P0

- dados cadastrais;
- unidades, endereços e horários;
- salas e recursos;
- identidade visual;
- configurações regionais.

### C2. Profissionais — P0

- cadastro civil e profissional completo;
- categoria e especialidade;
- conselho;
- contatos e endereço;
- unidades e serviços;
- comissão;
- disponibilidade;
- conta de acesso opcional por seletor único;
- correção da pesquisa de candidatos;
- navegação de retorno.

### C3. Pacientes — P0

- cadastro revisado;
- contatos, endereço e responsáveis;
- consentimentos;
- alertas clínicos autorizados;
- anexos e tags;
- visão 360 inicial.

### C4. Migração — P0

- importador CSV/XLSX;
- mapeamento;
- preview;
- validação e deduplicação;
- job assíncrono;
- erros e rollback;
- auditoria e exportação.

**Gate C:** uma clínica piloto consegue iniciar com dados reais sem recadastro
manual e sem acesso da engenharia ao banco.

## 7. Frente D — Catálogo e venda de tratamento

### D1. Catálogo — P0

- serviço;
- produto/insumo;
- categoria;
- tabela de preços;
- profissional e unidade elegíveis;
- ficha prevista de consumo.

### D2. Planos e pacotes — P0

- itens e quantidades;
- cortesias;
- validade;
- preço e condições;
- ledger de sessões;
- reserva, consumo, cancelamento e estorno.

### D3. Proposta e contrato — P0

- avaliação comercial;
- orçamento;
- proposta;
- plano de tratamento;
- templates;
- assinatura;
- cobrança e contas a receber.

**Gate D:** cenário automatizado de dez sessões mais duas cortesias passa do
contrato à segunda sessão com saldo, pagamento e auditoria corretos.

## 8. Frente E — CRM e aquisição

### E1. CRM operacional — P0

- responsável;
- tarefas e atividades;
- timeline;
- próximos contatos;
- valor;
- motivo de perda;
- tags;
- deduplicação;
- funis configuráveis;
- relatórios básicos.

### E2. WhatsApp e automações — P1

- provedor oficial;
- templates;
- consentimento;
- entrega e resposta;
- follow-ups;
- distribuição e SLA.

### E3. Landing Pages comercial — P1

- mídia e identidade;
- editor responsivo;
- domínio;
- formulários configuráveis;
- tracking e analytics;
- integração com campanhas, serviços e CRM;
- versões e rollback;
- testes E2E.

**Gate E:** origem → landing page → lead → atividade → avaliação → proposta é
rastreável e mensurável.

## 9. Frente F — Agenda e jornada clínica

### F1. Calendário operacional — P0

- dia, semana e mês;
- profissional, unidade, sala e recurso;
- cards completos;
- cores, filtros e legenda;
- bloqueios, recorrência e lista de espera;
- edição e correção conforme política.

### F2. Comunicação — P0

- confirmação;
- cancelamento e reagendamento;
- WhatsApp/e-mail;
- lembretes;
- arquivo/link de calendário;
- Maps e instruções;
- alertas profissionais;
- fila idempotente e histórico de entrega.

### F3. Atendimento e prontuário — P0

- check-in e atendimento;
- formulários e anamnese;
- evolução;
- fotos antes/durante/depois;
- comparação;
- documentos e anexos;
- assinaturas;
- consumo de sessão e insumos;
- relatório para paciente;
- próxima sessão;
- versionamento e auditoria.

**Gate F:** agendamento confirmado produz atendimento assinado, evolução,
consumo e retorno sem controles externos.

## 10. Frente G — Financeiro, compras e estoque

### G1. Estrutura financeira — P0

- plano de contas;
- categorias;
- centros de custo;
- contas bancárias e caixas;
- métodos de pagamento;
- fornecedores.

### G2. Pagar e receber — P0

- parcelas e recorrência;
- baixa parcial/total;
- juros, multa e desconto;
- estorno e cancelamento;
- anexos;
- usuário responsável;
- vencidos;
- fluxo de caixa.

### G3. Compras e estoque — P0

- compras e documentos;
- lotes, validade e custo;
- entradas e saídas;
- inventário e ajustes;
- depósitos;
- estoque mínimo;
- consumo por atendimento;
- rastreabilidade.

### G4. Gestão financeira — P1

- conciliação;
- comissão e repasse;
- fechamento de caixa;
- DRE gerencial;
- relatórios;
- integrações de pagamento;
- fase fiscal aprovada separadamente.

**Gate G:** uma compra de insumos gera estoque e obrigação financeira; um
atendimento consome insumos; pagamentos e estornos preservam trilha completa.

## 11. Frente H — Dashboard, qualidade e comercialização

### H1. Dashboards por perfil — P0

Implementar somente depois que as fontes transacionais correspondentes forem
confiáveis. Todo indicador deve possuir definição, origem, período e drill-down.

### H2. Qualidade — P0 contínuo

- testes frontend;
- E2E das jornadas;
- acessibilidade;
- desempenho;
- segurança;
- isolamento;
- backup/restore;
- observabilidade;
- gestão de incidentes.

### H3. Piloto — P0

- três a cinco clínicas parceiras do público inicial;
- migração assistida;
- treinamento;
- suporte próximo;
- medição de tarefas externas;
- registro e priorização de feedback;
- critérios de saída objetivos.

### H4. Disponibilidade comercial — Gate final

- jornadas P0 aprovadas;
- pilotos aprovados;
- nenhum defeito crítico aberto;
- control plane operacional;
- onboarding e suporte publicados;
- termos, cobrança e privacidade aprovados;
- restauração testada;
- aprovação executiva registrada.

## 12. Primeiro lote executável

O primeiro lote deve reduzir ambiguidade e preparar os domínios seguintes:

1. **A1:** identidade HPTECH Clinic e clínica ativa;
2. **A2:** retorno explícito na disponibilidade e correções visuais críticas;
3. **C2 Discovery/Design:** modelo completo de profissional e vínculo de conta;
4. **C3 Discovery/Design:** modelo completo de paciente;
5. **C4 Discovery/Design:** contrato do importador;
6. **B1 Discovery/Architecture:** modelo mínimo do control plane;
7. criar testes frontend para os fluxos alterados.

Não iniciar simultaneamente prontuário, estoque e financeiro completo antes de
aprovar os modelos de paciente, profissional, catálogo, plano e atendimento.

## 13. Dependências críticas

```text
Organização/unidade
├── profissionais e locais
├── pacientes e migração
└── catálogo
    └── planos/propostas/contratos
        └── agenda
            └── atendimento/prontuário
                ├── sessões
                ├── estoque
                └── financeiro

Control plane
└── assinatura/entitlements/provisionamento
    └── piloto e comercialização
```

## 14. Definition of Ready

Um item somente entra em desenvolvimento quando possui:

- problema e usuário;
- fluxo principal e exceções;
- regras de permissão;
- impacto em dados e auditoria;
- dependências;
- desenho ou contrato de interface quando aplicável;
- critérios de aceite verificáveis;
- estratégia de testes e migração.

## 15. Definition of Done

- código revisado;
- migrations reversíveis e testadas;
- autorização backend;
- auditoria aplicável;
- testes backend, frontend e E2E proporcionais ao risco;
- UX responsiva e acessível;
- telemetria;
- documentação;
- validação de produto;
- deploy verificado;
- sem dependência manual oculta;
- status atualizado com evidência.

## 16. Registro de progresso

O progresso deve ser registrado por épico e gate neste documento ou em sistema
de gestão vinculado. Percentuais genéricos de "módulo concluído" são proibidos
sem listar quais resultados e critérios foram comprovados.

### 2026-09-29 — lote inicial

| Item | Estado | Evidência | Pendência para concluir |
| --- | --- | --- | --- |
| A1 — identidade do produto | Em validação | Interface e metadados identificam **HPTECH Clinic**, exibem a clínica ativa e separam o produto da marca HPTECH Platform. Lint e build de produção aprovados. | Validação visual em produção e revisão das comunicações restantes. |
| A2 — correções críticas | Em andamento | Disponibilidade ganhou retorno explícito. Campos base não são mais deslocados por textos auxiliares; tabelas alinham conteúdo variável pelo topo; cards preenchem o grid e ações operacionais usam rodapé estável. Modal de Profissionais ganhou largura e rolagem interna apropriadas. Lint, build de 35 rotas e captura renderizada do catálogo aprovados. | Validar visualmente as telas autenticadas em produção e continuar a revisão dos fluxos profundos. |
| C2 — profissional | Em validação | Primeiro incremento publicado no commit `8de8177`: identificação, CPF validado por clínica, nascimento, contatos, profissão, categoria, observações e conta opcional. Migration reversível aplicada; 666 testes da API, build, readiness, OpenAPI, proteção de sessão e logs pós-deploy aprovados. | Validar o formulário autenticado com a clínica; implementar conselhos, endereços, especialidades, unidades, serviços, documentos, remuneração, estados completos, auditoria e integração com agenda. |
| Documentação de produto | Concluída para esta fase | PRDs do portfólio, HPTECH Clinic e Control Plane; ADR de arquitetura; roadmap de recuperação. | Manter os documentos atualizados a cada gate. |

### 2026-09-30 — revisão visual e navegação

| Item | Estado | Evidência | Pendência para concluir |
| --- | --- | --- | --- |
| A2 — shell e navegação | Em validação | Cabeçalho corrigido para permanecer fixo; menu lateral passou a representar módulos e submódulos, com ícones, estado ativo, expansão e recolhimento; área do usuário deixou de expor o papel “Proprietário”. | Validar em produção, incluir breadcrumb nos fluxos profundos e executar teste moderado com usuários. |
| A2 — Início | Em validação | Áreas disponíveis agora são cards de ação inteiros, com ícone, descrição e affordance de navegação. | Validar hierarquia e conteúdo por perfil em produção. |
| A2 — Serviços e Financeiro | Em validação | Colunas numéricas e de status receberam largura e comportamento de quebra controlados; múltiplos botões por linha foram substituídos por menu de ações. | Revisar as demais tabelas do produto e validar desktop/celular autenticados. |
| F1 — Agenda operacional | Em andamento | Cards expõem paciente, profissional, serviço, duração, preço, status, unidade principal e endereço. O detalhe gera confirmação por WhatsApp com links para Google Agenda e Maps. | A visualização ainda não atende o gate F: faltam dia/mês, múltiplas unidades e salas, pagamento, sessões, automação de comunicação e prontuário. |
| G — Financeiro completo | Não iniciado | A base atual mantém resumo e lançamentos simples; recebeu somente correção visual das ações e colunas. | Modelar e implementar plano de contas, categorias, centros de custo, contas bancárias, pagar/receber, documentos, compras, estoque, juros, multas, descontos, conciliação e auditoria. |

### 2026-10-01 — controle master da Agenda

| Item | Estado | Evidência | Pendência para concluir |
| --- | --- | --- | --- |
| F1 — correção e remoção master | Em validação | `OWNER` e `ADMIN` receberam `APPOINTMENTS:DELETE`; a remoção lógica aceita qualquer status, exige motivo e registra auditoria. Estados terminais permitem somente correção de observações. Contratos BFF/API e 668 testes da API aprovados. | Publicar backend e frontend, validar com conta master e incluir uma tela de histórico/correções. |

### 2026-10-02 — localização e comunicação da Agenda

| Item | Estado | Evidência | Pendência para concluir |
| --- | --- | --- | --- |
| C1/F1 — unidade principal | Em validação | Clínica ganhou unidade principal e endereço estruturado nas Configurações. Agenda exibe esses dados no card e no detalhe. Migração reversível, lint, build e 668 testes da API aprovados. | Evoluir para múltiplas unidades, salas e vínculo explícito por agendamento. |
| F1/E2 — confirmação do agendamento | Em validação | Menu de ações foi padronizado com Serviços. A confirmação por WhatsApp inclui clínica, unidade, endereço, data, horário, serviço, profissional, Google Agenda e Maps. | Implementar provedor oficial, templates consentidos, fila, entrega, lembretes e histórico de comunicação. |
| F2 — atendimento clínico | Planejado | Escopo preservado no PRD: fotos antes/durante/depois, evolução técnica, histórico e documentos assináveis. | Modelar prontuário, consentimento, armazenamento seguro, retenção, auditoria e assinatura antes da implementação. |

Próxima execução: publicar e validar o incremento de localização/comunicação da
Agenda. Depois, evoluir a Agenda para sessões e pagamento antes de iniciar o
prontuário clínico, mantendo dados clínicos separados dos dados operacionais.
