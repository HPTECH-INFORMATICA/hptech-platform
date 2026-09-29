# PRD — HPTECH Platform

**Status:** Normativo
**Versão:** 1.0
**Data:** 29/09/2026
**Responsável:** HPTECH Informática
**Escopo:** Portfólio de produtos, identidade de clientes e governança comum

## 1. Decisão de produto

A **HPTECH Platform** é o ecossistema de produtos SaaS da HPTECH Informática.
Ela não é sinônimo de um produto específico e não deve ser apresentada ao
cliente como se todos os produtos fossem um único sistema monolítico.

Produtos atuais e planejados pertencem ao portfólio, por exemplo:

- **HPTECH Clinic:** operação comercial, clínica, financeira e administrativa
  de clínicas contratantes;
- **BCOS:** produto independente, com domínio e proposta próprios;
- **HPTECH Sign:** capacidade ou produto futuro para geração, envio e assinatura
  de documentos;
- outros produtos aprovados pelo processo de portfólio.

Cada produto possui experiência, permissões, dados operacionais, roadmap e
ciclo de vida próprios. Todos são governados por uma camada interna comum,
chamada **HPTECH Control Plane**.

## 2. Problema

Sem uma separação explícita entre plataforma, produtos e clientes:

- o usuário não sabe se está administrando a própria empresa ou a HPTECH;
- papéis administrativos do cliente podem ser confundidos com papéis internos;
- cobrança, licenciamento e suporte tendem a ser implementados separadamente em
  cada produto;
- acessos globais improvisados ameaçam o isolamento entre clientes;
- métricas, provisionamento e operação do portfólio ficam fragmentados;
- novos produtos repetem infraestrutura e regras já resolvidas.

## 3. Visão

Permitir que uma organização contrate um ou mais produtos HPTECH, acesse cada
produto em um ambiente claramente identificado e seja administrada internamente
pela HPTECH sem mistura de dados, permissões ou responsabilidades.

## 4. Vocabulário oficial

| Termo | Significado |
|---|---|
| HPTECH | Marca empresarial |
| HPTECH Platform | Ecossistema e portfólio de produtos |
| Produto | Aplicação comercial independente do portfólio |
| Organização | Pessoa jurídica ou operação contratante |
| Tenant | Fronteira técnica de isolamento de uma organização dentro de um produto |
| Assinatura | Contratação de um produto e plano por uma organização |
| Entitlement | Funcionalidade, limite ou capacidade liberada pela assinatura |
| Data plane | Aplicação e dados operacionais de um produto |
| Control plane | Operação interna de clientes, produtos, planos, acessos e provisionamento |
| Operador HPTECH | Colaborador interno autorizado a operar o control plane |
| Administrador do cliente | Usuário que administra apenas sua organização em um produto |

Na experiência do usuário, termos específicos do setor devem substituir termos
genéricos quando isso melhorar a compreensão. No HPTECH Clinic, por exemplo,
"Clínica" ou "Unidade" deve ser preferido a "Empresa".

## 5. Superfícies do ecossistema

### 5.1 Portal do cliente

Responsável por:

- identidade da organização;
- produtos contratados;
- usuários e acesso organizacional;
- plano, assinatura e cobrança;
- abertura e acompanhamento de suporte;
- entrada nos produtos autorizados.

Domínio recomendado: `account.hptechinformatica.com`.

### 5.2 Aplicações de produto

Cada aplicação resolve o trabalho operacional de seu público. A aplicação deve
exibir permanentemente:

- nome do produto;
- organização ou unidade ativa;
- usuário e função atuais;
- ambiente, quando não for produção.

Exemplos de domínios:

- `clinic.hptechinformatica.com` para HPTECH Clinic;
- domínio próprio para BCOS;
- domínios adicionais conforme o catálogo de produtos.

### 5.3 Operação interna

O HPTECH Control Plane é exclusivo da equipe HPTECH. Ele não compartilha papéis
administrativos com as aplicações dos clientes.

Domínio recomendado: `admin.hptechinformatica.com`.

## 6. Modelo de organização e assinatura

Uma organização pode:

- contratar um ou mais produtos;
- possuir uma ou mais unidades;
- possuir usuários com acesso a produtos diferentes;
- contratar planos e complementos diferentes por produto;
- estar em avaliação, ativa, inadimplente, suspensa ou cancelada;
- ter limites de usuários, unidades, armazenamento, mensagens e uso;
- encerrar um produto sem necessariamente encerrar os demais.

O identificador global da organização não substitui o identificador de tenant
de cada produto. Cada data plane mantém seu próprio mapeamento e isolamento.

## 7. Capacidades compartilhadas

Devem ser fornecidas centralmente ou por contratos comuns:

- catálogo de produtos e planos;
- organizações e assinaturas;
- autenticação organizacional e federação de identidade;
- entitlements e feature flags comerciais;
- provisionamento e desprovisionamento;
- faturamento e cobrança da HPTECH;
- notificações transacionais comuns;
- auditoria da operação interna;
- suporte e acesso excepcional;
- telemetria de disponibilidade e adoção;
- termos, consentimentos e documentos comerciais;
- integrações transversais aprovadas.

Dados operacionais sensíveis permanecem no produto de origem. Prontuários,
fotos clínicas, agenda e financeiro da clínica não devem ser replicados no
control plane como mecanismo de conveniência.

## 8. Princípios arquiteturais

1. **Separação entre control plane e data planes.**
2. **Isolamento por tenant derivado da identidade autenticada.**
3. **Menor privilégio e negação por padrão.**
4. **Nenhum superadministrador oculto dentro dos produtos.**
5. **Acesso de suporte temporário, justificado, consentido e auditado.**
6. **Contratos versionados entre plataforma e produtos.**
7. **Operações assíncronas idempotentes para provisionamento e integrações.**
8. **Dados pertencem ao domínio que os produz.**
9. **Monólitos modulares são aceitáveis; microserviços exigem necessidade real.**
10. **Toda capacidade comercial deve possuir observabilidade operacional.**

## 9. Governança de produto

Cada produto deve possuir:

- PRD próprio;
- público e problema explícitos;
- jornada principal ponta a ponta;
- mapa de entidades e integrações;
- matriz de papéis e permissões;
- métricas de adoção, resultado e qualidade;
- roadmap por resultados do cliente;
- critérios de entrada em piloto e venda;
- plano de migração, suporte e encerramento;
- responsável de produto e responsável técnico.

## 10. Definição de pronto comercial

Uma funcionalidade não está pronta apenas porque possui tabela, endpoint,
formulário e teste unitário. Ela somente pode ser marcada como pronta quando:

- resolve o resultado declarado no PRD;
- funciona no fluxo anterior e posterior da jornada;
- possui autorização, auditoria e tratamento de reversão;
- possui estados de erro, vazio, carregamento e indisponibilidade;
- é utilizável em desktop e dispositivos móveis aplicáveis;
- possui testes de backend, frontend e fluxo crítico ponta a ponta;
- possui telemetria e suporte operacional;
- possui documentação de uso;
- foi validada com usuário representativo;
- não obriga o cliente a manter um controle paralelo para completar o processo.

O status oficial deve ser um entre:

- **Descoberta**;
- **Especificado**;
- **Em desenvolvimento**;
- **Alpha interna**;
- **Piloto controlado**;
- **Disponível comercialmente**;
- **Descontinuado**.

## 11. Métricas do portfólio

- tempo entre contratação e primeiro valor percebido;
- taxa de ativação por produto;
- organizações e usuários ativos;
- retenção e cancelamento;
- receita recorrente e inadimplência;
- adoção de módulos e entitlements;
- volume e causa de chamados;
- disponibilidade e taxa de erro;
- tempo de provisionamento;
- incidentes de segurança ou isolamento;
- satisfação por produto.

## 12. Não objetivos

- centralizar todos os bancos dos produtos;
- permitir acesso irrestrito da HPTECH aos dados dos clientes;
- criar um único papel global com poder sobre todos os ambientes;
- compartilhar regras clínicas com produtos não clínicos;
- lançar vários produtos incompletos para aumentar artificialmente o portfólio.

## 13. Precedência

Este documento esclarece e atualiza a interpretação de
`docs/HPTECH_PLATFORM_V2.md`: a HPTECH Platform é o portfólio; o sistema
operacional de clínicas é o produto HPTECH Clinic. As garantias anteriores de
segurança, multi-tenancy e auditoria permanecem obrigatórias.
