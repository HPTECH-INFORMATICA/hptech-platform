# PRD — HPTECH Clinic

**Status:** Normativo — recuperação de produto
**Versão:** 1.0
**Data:** 29/09/2026
**Produto:** HPTECH Clinic
**Marca proprietária:** HPTECH Platform

## 1. Definição

O **HPTECH Clinic** é o sistema operacional das clínicas contratantes. Ele
centraliza a jornada comercial, contratual, clínica, financeira e operacional
da clínica, preservando isolamento entre organizações e unidades.

Ele não é o painel usado pela HPTECH para administrar clientes, assinaturas ou
produtos. Essa responsabilidade pertence ao HPTECH Control Plane.

## 2. Público inicial

O foco inicial é:

- clínicas de estética;
- clínicas capilares e de tricologia;
- clínicas de saúde e bem-estar com tratamentos seriados;
- operações particulares que vendem procedimentos, pacotes ou planos.

Especialidades médicas amplas, faturamento TISS e operações hospitalares não
devem ampliar o escopo inicial sem decisão formal de produto.

## 3. Promessa

Transformar um contato comercial em tratamento concluído e resultado
financeiro rastreável, sem planilhas paralelas:

```text
Captação
→ qualificação
→ avaliação
→ proposta/plano
→ contrato e assinatura
→ cobrança
→ agendamento
→ atendimento e prontuário
→ consumo de sessões e estoque
→ evolução e retorno
→ resultado financeiro e gerencial
```

## 4. Perfis principais

- Proprietário da clínica;
- Administrador;
- Gerente;
- Recepção;
- Comercial;
- Financeiro;
- Profissional assistencial;
- Marketing;
- Auditor/consulta;
- paciente, em experiências externas específicas.

Os papéis são da clínica. Nenhum papel representa operador interno da HPTECH.

## 5. Contexto obrigatório da interface

Após autenticação, a interface deve tornar inequívocos:

- produto: **HPTECH Clinic**;
- clínica e unidade ativas;
- nome e função do usuário;
- módulo atual.

A página inicial deve dizer explicitamente que o usuário está gerenciando a
clínica ativa. A terminologia visível deve usar "Clínica", "Unidade",
"Profissional" e "Paciente" em vez de termos genéricos sempre que aplicável.

## 6. Jornada e módulos

### 6.1 Dashboard

O dashboard deve ser orientado pelo perfil.

**Proprietário e gerente**

- faturamento realizado e previsto;
- margem e fluxo de caixa;
- inadimplência;
- ocupação da agenda;
- faltas e cancelamentos;
- conversão comercial;
- ticket médio;
- planos vendidos, ativos e abandonados;
- produtividade e comissão por profissional;
- alertas de estoque;
- metas e comparação com período anterior.

**Recepção**

- agenda do dia;
- confirmações pendentes;
- atrasos, encaixes e lista de espera;
- pagamentos pendentes;
- próximas ações do paciente.

**Comercial**

- novos leads;
- tempo de primeiro contato;
- tarefas vencidas;
- propostas abertas;
- conversão por origem e responsável;
- motivos de perda.

**Profissional**

- agenda pessoal;
- pacientes aguardando;
- prontuários e assinaturas pendentes;
- retornos recomendados;
- alertas clínicos autorizados.

Todos os indicadores devem aceitar filtros pertinentes e oferecer drill-down
para os registros que compõem o valor.

### 6.2 CRM

Capacidades obrigatórias:

- cadastro e deduplicação de leads;
- responsável, equipe e distribuição;
- múltiplos funis e etapas configuráveis;
- atividades, tarefas e próximo contato;
- timeline de interações;
- tags e segmentação;
- origem, campanha, anúncio e UTM;
- interesse, valor esperado e probabilidade;
- motivo de perda;
- score e SLA;
- WhatsApp com templates, consentimento e histórico;
- automações de follow-up;
- avaliação e agendamento a partir do lead;
- orçamento, proposta e plano de tratamento;
- conversão controlada em paciente;
- relatórios por origem, responsável, serviço e período.

### 6.3 Landing Pages

Capacidades obrigatórias para disponibilidade comercial:

- templates responsivos;
- editor de conteúdo e mídia;
- biblioteca de imagens e vídeos;
- identidade visual da clínica;
- preview desktop, tablet e celular;
- SEO;
- domínio próprio e HTTPS;
- formulário configurável e consentimento;
- CTA para WhatsApp e agendamento;
- integração com serviço, campanha e CRM;
- UTMs, Meta Pixel, Google Analytics e Tag Manager;
- visualizações, conversões e origem;
- versões, publicação, rollback e duplicação;
- proteção antispam e limites;
- testes de submissão até a criação do lead.

### 6.4 Pacientes

O cadastro deve suportar, conforme finalidade e base legal:

- nome civil, nome social e preferências de tratamento;
- CPF ou documento aplicável;
- nascimento;
- contatos;
- endereço;
- responsável legal e contato de emergência;
- profissão;
- origem e indicação;
- convênio, quando aplicável;
- consentimentos de privacidade e comunicação;
- alertas, alergias, condições e medicamentos;
- tags, anexos e documentos;
- unidade de relacionamento;
- histórico de alterações.

A visão 360 do paciente deve reunir:

- dados cadastrais;
- leads e origem;
- propostas e contratos;
- pagamentos;
- planos e saldo de sessões;
- agenda;
- atendimentos e evolução;
- fotos e documentos;
- comunicações e consentimentos.

#### Migração

O produto deve oferecer importação CSV/XLSX com:

- modelo de arquivo;
- mapeamento de colunas;
- pré-visualização;
- validação;
- deduplicação;
- execução assíncrona;
- relatório de erros;
- retomada e rollback seguro;
- auditoria;
- exportação;
- fluxo assistido pela HPTECH.

### 6.5 Profissionais

Profissional e conta de acesso são entidades distintas.

O profissional deve possuir:

- dados civis e contatos;
- CPF ou documento aplicável;
- profissão, categoria e especialidades;
- conselho profissional, número e UF, quando aplicável;
- endereço;
- unidades e locais de atendimento;
- serviços autorizados;
- disponibilidade, intervalos, férias e exceções;
- documentos;
- regras de comissão e remuneração;
- status e histórico;
- vínculo opcional com uma conta de acesso já existente ou convidada.

A busca de conta deve ser um único seletor pesquisável. A criação do cadastro
profissional não pode depender da criação de login.

### 6.6 Catálogo, serviços, produtos e planos

Devem ser conceitos separados:

- serviço ou procedimento;
- produto ou insumo;
- categoria;
- tabela de preço;
- pacote/plano de tratamento;
- item e quantidade contratada;
- cortesia;
- validade;
- oferta comercial;
- venda/contrato;
- sessão reservada, consumida, cancelada ou estornada.

O consumo de sessões deve usar um ledger imutável. Um contador editável não é
fonte de verdade.

#### Cenário obrigatório: plano 10 + 2

1. A clínica vende dez sessões por R$ 3.000 e concede duas cortesias.
2. A condição de pagamento é registrada e gera contas a receber.
3. O saldo inicial mostra dez sessões pagas e duas cortesias.
4. Agendar pode reservar uma sessão sem consumi-la definitivamente.
5. Concluir o primeiro atendimento consome uma sessão paga.
6. O saldo passa a nove pagas e duas cortesias.
7. Cancelar ou anular conforme política desfaz reserva/consumo com histórico.
8. Cada movimento identifica paciente, contrato, atendimento, profissional,
   data, usuário e justificativa.

### 6.7 Agenda

Capacidades obrigatórias:

- visões diária, semanal e mensal;
- visualização por profissional, unidade, sala e recurso;
- cores e legenda;
- drag-and-drop com validação;
- bloqueios, encaixes, recorrência e lista de espera;
- local, endereço e link de mapa;
- serviço, plano, sessão e situação financeira no contexto do agendamento;
- confirmação, cancelamento e reagendamento pelo paciente;
- envio de evento compatível com calendários;
- lembretes automáticos configuráveis;
- histórico de envio, entrega e resposta;
- alertas para profissional e recepção;
- agendamento online controlado.

### 6.8 Atendimento e prontuário

O atendimento é entidade própria vinculada ao agendamento:

- check-in, início e conclusão;
- anamnese e formulários configuráveis;
- diagnóstico, observações e evolução;
- procedimento realizado;
- fotos antes, durante e depois;
- comparação selecionável de fotos;
- exames, arquivos e documentos;
- produtos e insumos consumidos;
- sessão utilizada;
- consentimentos;
- assinatura do profissional e paciente;
- retorno e próxima sessão;
- relatório compartilhável com o paciente;
- histórico versionado e auditável.

Fotos e documentos devem usar armazenamento seguro de objetos, autorização por
tenant, criptografia aplicável, backup, retenção e registro de acesso.

### 6.9 Contratos e assinaturas

- propostas e orçamentos versionados;
- templates de documentos;
- preenchimento automático;
- envio por WhatsApp e e-mail;
- assinatura de paciente, responsável, profissional e clínica;
- acompanhamento de status por webhook;
- armazenamento do documento final;
- cancelamento, expiração e auditoria;
- integração por contrato com HPTECH Sign ou provedor aprovado.

### 6.10 Financeiro

Capacidades obrigatórias:

- plano de contas;
- categorias e subcategorias;
- centros de custo;
- fornecedores e favorecidos;
- contas bancárias e caixas;
- contas a pagar e receber;
- parcelas e recorrência;
- competência, vencimento e pagamento;
- pagamentos parciais;
- juros, multa, desconto e acréscimo;
- métodos de pagamento;
- conta de entrada e saída;
- anexos e comprovantes;
- baixa, estorno e cancelamento auditados;
- conciliação;
- transferências;
- abertura e fechamento de caixa;
- inadimplência;
- comissões e repasses;
- fluxo de caixa e DRE gerencial;
- relatórios e exportações;
- integrações de pagamento;
- emissão fiscal em fase explicitamente aprovada.

### 6.11 Compras e estoque

- catálogo de produtos e insumos;
- unidades de medida;
- fornecedores;
- depósitos e locais;
- lotes, validade e rastreabilidade;
- estoque mínimo;
- entradas, saídas, transferências e ajustes;
- inventário;
- perdas;
- custo médio;
- documento de compra;
- entrada gerando estoque e conta a pagar;
- ficha de consumo por serviço;
- baixa de insumos ao concluir atendimento;
- usuário, profissional e atendimento responsáveis;
- alertas de quantidade e vencimento;
- relatórios de consumo e custo por procedimento.

## 7. Política de correção, exclusão e auditoria

Papéis de proprietário ou administrador podem corrigir operações dentro de
regras explícitas, mas não podem apagar silenciosamente fatos clínicos ou
financeiros concluídos.

O produto deve oferecer:

- edição enquanto rascunho ou pendente;
- reabertura autorizada;
- aditivo ou nova versão;
- anulação com justificativa;
- estorno financeiro;
- reversão de sessão e estoque;
- histórico anterior e posterior;
- ator, data, motivo e correlação;
- aprovação adicional quando o risco justificar.

Exclusão física é restrita a dados sem valor histórico e conforme política de
retenção, privacidade e segurança aprovada.

## 8. Requisitos não funcionais

- isolamento multi-tenant testado;
- RBAC aplicado no backend;
- auditoria de ações sensíveis;
- LGPD desde a concepção;
- criptografia em trânsito e em repouso quando aplicável;
- backup e restauração testados;
- observabilidade e alertas;
- filas idempotentes para comunicações e importações;
- acessibilidade WCAG compatível com o produto;
- responsividade;
- desempenho medido em fluxos críticos;
- exportabilidade dos dados;
- testes de backend, frontend e E2E;
- recuperação documentada de incidentes.

## 9. Métricas de produto

- tempo para importar e ativar uma clínica;
- tempo até primeiro agendamento e primeiro pagamento;
- percentual de agenda confirmada automaticamente;
- taxa de faltas;
- conversão de lead em avaliação, proposta e venda;
- utilização de planos e sessões;
- inadimplência;
- ocupação por profissional e unidade;
- fechamento de prontuários e assinaturas pendentes;
- divergências de estoque;
- usuários ativos por perfil;
- tarefas realizadas fora do sistema;
- satisfação e retenção.

## 10. Gates de lançamento

### Alpha interna

- identidade do produto e clínica inequívocas;
- jornadas críticas navegáveis com dados de demonstração;
- nenhuma falha conhecida de isolamento;
- monitoramento e backup ativos.

### Piloto controlado

- importação assistida;
- fluxo lead → contrato → pagamento → atendimento completo;
- agenda e lembretes confiáveis;
- prontuário e documentos básicos;
- plano de sessões e estoque rastreáveis;
- financeiro operacional;
- suporte e control plane mínimos;
- testes E2E dos fluxos críticos.

### Disponível comercialmente

- pilotos concluídos com critérios medidos;
- ausência de defeitos críticos abertos;
- onboarding, treinamento e suporte publicados;
- restauração de backup testada;
- contratos, cobrança e suspensão automatizados;
- métricas operacionais e de produto disponíveis;
- aprovação formal de produto, engenharia, segurança e operação.

## 11. Estado atual

O produto está em **Alpha interna**. Os módulos atuais representam fundações
técnicas e recortes iniciais; não devem ser anunciados como módulos comerciais
completos até cumprirem este PRD e os gates correspondentes.
