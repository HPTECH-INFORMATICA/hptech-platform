# Módulo de Profissionais — contrato de domínio C2

## Estado

**IN_PROGRESS — primeiro incremento implementado e em publicação.** Este documento
substitui o cadastro mínimo anterior como referência funcional e técnica. O modelo
agora possui identificação, contatos, profissão, categoria, observações, status e
conta opcional. Conselhos, endereços, especialidades, unidades, serviços,
documentos e remuneração permanecem nos incrementos seguintes.

### Evidência do primeiro incremento — 29/09/2026

- migration reversível adiciona os campos sem invalidar registros existentes;
- `full_name` foi retroalimentado a partir de `display_name` e passou a ser
  obrigatório;
- CPF é normalizado, validado e único por clínica entre registros não excluídos;
- busca cobre nome, nome social, CPF, email e profissão;
- interface responsiva separa identificação, contato, atuação e acesso;
- conta de acesso continua opcional e independente do cadastro profissional;
- 666 testes da API, lint direcionado e build de produção do frontend aprovados;
- migration aplicada e confirmada no banco de produção.

Este marco não fecha C2. A conclusão depende de todas as entidades, permissões,
auditoria, integrações com agenda e critérios de aceite definidos abaixo.

## Objetivo

Manter o cadastro operacional e assistencial de cada profissional da clínica,
independentemente de ele possuir login. O profissional pertence ao tenant da
clínica; a conta de usuário apenas concede acesso ao sistema.

```text
Pessoa/profissional da clínica != conta de autenticação
```

Criar, suspender ou remover uma conta não pode apagar o profissional, seus
agendamentos, atendimentos, documentos, comissões ou histórico.

## Entidades

### `professionals`

Identidade e estado principal:

- `id`, `company_id` e `user_id` opcional;
- nome completo e nome de exibição;
- nome social opcional;
- CPF ou documento estrangeiro;
- data de nascimento;
- email, telefone e WhatsApp;
- profissão e categoria;
- observações administrativas;
- status operacional e motivo da inativação;
- datas de criação, atualização e exclusão lógica.

CPF deve ser normalizado para dígitos, validado pelo algoritmo oficial e ser
único entre profissionais não excluídos do mesmo tenant. Documento estrangeiro
não é tratado como CPF.

### `professional_registrations`

Um profissional pode possuir um ou mais registros:

- conselho ou órgão;
- número;
- UF;
- especialidade associada, quando aplicável;
- validade;
- indicador de registro principal;
- status de verificação.

A combinação `company_id + council + number + state` deve ser única entre
registros ativos.

### `professional_addresses`

Endereços pessoais ou profissionais, com CEP, logradouro, número, complemento,
bairro, cidade, UF, país e indicador principal. Endereço pessoal exige
permissão específica e não deve aparecer na agenda do paciente.

### `professional_specialties`

Associa o profissional a especialidades padronizadas por tenant. Uma delas pode
ser principal. Texto livre não substitui a entidade de especialidade.

### `professional_units`

Associa o profissional às unidades e locais em que pode trabalhar. O vínculo
possui status, período de vigência e indicador principal. Disponibilidade e
agenda devem respeitar esse escopo.

### `professional_services`

Lista os serviços/procedimentos que o profissional está autorizado a realizar,
com vigência e eventual duração específica. A existência do serviço no catálogo
não autoriza automaticamente todos os profissionais.

### `professional_compensation_rules`

Regra versionada de remuneração ou comissão por profissional, unidade, serviço
ou categoria, com tipo, base de cálculo, valor/percentual e vigência. Mudanças não
reescrevem cálculos financeiros já consolidados.

### `professional_documents`

Metadados de documentos armazenados em objeto privado:

- tipo e nome;
- chave do objeto, hash e tamanho;
- validade;
- status de verificação;
- autor do envio e datas;
- classificação de sensibilidade e retenção.

Arquivos não devem ser gravados no PostgreSQL nem expostos por URL pública
permanente.

## Conta de acesso

O vínculo continua opcional e um-para-um dentro da clínica:

1. a conta é criada ou convidada em **Configurações > Usuários**;
2. após ativa ou elegível, aparece no campo **Conta de acesso (opcional)**;
3. o administrador vincula explicitamente a conta ao profissional;
4. o papel `PROFESSIONAL` e as permissões efetivas continuam sendo controlados
   por RBAC, não pelo simples vínculo;
5. desvincular preserva ambas as entidades e gera auditoria.

O seletor deve listar somente contas do mesmo tenant que não estejam vinculadas
a outro profissional, preservando a conta atual durante uma edição.

## Estados

```text
DRAFT -> ACTIVE -> INACTIVE
             \-> ON_LEAVE -> ACTIVE
```

- `DRAFT`: cadastro incompleto, não pode receber agenda;
- `ACTIVE`: apto conforme unidades, serviços e disponibilidade;
- `ON_LEAVE`: afastamento temporário, bloqueia novos agendamentos no período;
- `INACTIVE`: não recebe novos agendamentos, mas permanece no histórico.

Exclusão lógica é correção administrativa e somente pode ocorrer quando as
dependências permitirem. Histórico clínico e financeiro nunca é apagado em
cascata.

## Regras de agenda

Um profissional só pode ser selecionado quando, no instante do agendamento:

- estiver ativo;
- estiver vinculado à unidade/local escolhido;
- estiver autorizado para o serviço;
- possuir disponibilidade efetiva;
- não possuir afastamento, exceção ou conflito.

Agendamentos antigos mantêm snapshots suficientes para leitura mesmo que o
profissional seja inativado ou altere nome, conselho ou especialidade.

## Permissões e privacidade

- `PROFESSIONALS:VIEW`: dados operacionais não sensíveis;
- `PROFESSIONALS:CREATE`: cria cadastro;
- `PROFESSIONALS:UPDATE`: altera dados operacionais e associações;
- `PROFESSIONALS:DELETE`: solicita exclusão lógica permitida;
- permissões específicas futuras: documentos, remuneração e dados pessoais;
- o próprio profissional não pode elevar permissões nem alterar regras de
  remuneração;
- toda leitura ou mudança sensível deve ser auditável;
- todas as consultas e constraints devem incluir `company_id`.

## API alvo

```text
GET    /professionals
POST   /professionals
GET    /professionals/{id}
PATCH  /professionals/{id}
PATCH  /professionals/{id}/status
DELETE /professionals/{id}

GET    /professionals/{id}/registrations
POST   /professionals/{id}/registrations
PATCH  /professionals/{id}/registrations/{registration_id}
DELETE /professionals/{id}/registrations/{registration_id}

GET|PUT /professionals/{id}/addresses
GET|PUT /professionals/{id}/specialties
GET|PUT /professionals/{id}/units
GET|PUT /professionals/{id}/services
GET|POST|PATCH /professionals/{id}/compensation-rules
GET|POST|DELETE /professionals/{id}/documents
```

Associações não devem ser sobrescritas sem controle de concorrência. Updates
devem aceitar versão ou `updated_at` esperado e retornar conflito quando o
registro tiver sido alterado por outro usuário.

## Migração incremental

1. adicionar campos escalares anuláveis sem quebrar clientes existentes;
2. popular `full_name` a partir de `display_name`;
3. criar tabelas de registros, endereços e especialidades;
4. criar unidades/locais antes de `professional_units`;
5. criar autorização de serviços;
6. introduzir estados novos mantendo `is_active` durante a transição;
7. migrar API e interface por compatibilidade;
8. remover campos legados apenas em migration posterior e reversível.

Nenhuma migration deve exigir preenchimento manual em produção para manter o
sistema iniciando.

## Interface alvo

O cadastro será dividido em seções, sem um formulário monolítico:

1. Identificação e contato;
2. Profissão, categoria, especialidades e conselhos;
3. Endereços;
4. Unidades, serviços e disponibilidade;
5. Documentos;
6. Remuneração;
7. Acesso ao sistema;
8. Histórico e auditoria.

Listagens devem mostrar nome, profissão/especialidade principal, unidade, conta
de acesso, status e ações permitidas. Em telas estreitas, os mesmos dados devem
ser apresentados em cards legíveis.

## Critérios de aceite do C2

- profissional pode existir e operar sem login;
- conta só pode ser vinculada depois de existir no mesmo tenant;
- CPF e registro profissional seguem normalização, unicidade e validação;
- dados pessoais, documentos e remuneração respeitam permissões distintas;
- unidades, serviços e agenda rejeitam associações cruzadas entre tenants;
- inativação bloqueia novos agendamentos sem apagar histórico;
- alterações sensíveis geram auditoria antes/depois;
- migrations possuem caminho de downgrade e teste de dados existentes;
- API, frontend e fluxo de agenda possuem testes de sucesso, permissão,
  concorrência e isolamento;
- o fluxo completo é validado em desktop e mobile.

## Fora do primeiro incremento

- folha de pagamento;
- validação automática em conselhos externos;
- assinatura eletrônica de contrato do profissional;
- portal autônomo do profissional;
- marketplace ou agenda pública do profissional.
