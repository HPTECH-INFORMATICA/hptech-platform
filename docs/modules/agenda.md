# Módulo Agenda

## Objetivo

Organizar a operação clínica por empresa, paciente, profissional e serviço,
preservando isolamento multiempresa, regras de disponibilidade, integridade de
horários e um ciclo de atendimento auditável.

## Arquitetura publicada

O módulo é composto por:

- modelo e migrations PostgreSQL de `appointments`;
- repositório tenant-aware;
- domínio transacional no backend;
- API FastAPI protegida por RBAC;
- BFF autenticado no Next.js;
- agenda semanal responsiva;
- editor para criação, edição e reagendamento;
- comandos explícitos para o ciclo operacional.

O backend permanece como autoridade de permissão, tenant, disponibilidade,
transição de estado e conflito. Ocultar ou desabilitar controles no frontend é
apenas uma melhoria de experiência.

## Contrato temporal

A API recebe data e hora civil sem timezone junto de um offset opcional para
desambiguar horários repetidos. O backend resolve essa entrada usando o fuso IANA
da empresa e persiste `starts_at` e `ends_at` como instantes com timezone.

Horários inexistentes durante mudanças de DST são rejeitados. Horários ambíguos
exigem offset explícito. A interface converte os instantes para o fuso da empresa
ao exibir a agenda.

## Integridade e disponibilidade

Um agendamento somente é criado ou reagendado quando:

- paciente, profissional e serviço existem no mesmo tenant e estão ativos;
- o intervalo está dentro da disponibilidade semanal efetiva;
- nenhuma exceção de indisponibilidade bloqueia o intervalo;
- não existe conflito com outro agendamento ativo do profissional.

Além da validação transacional, o PostgreSQL aplica uma exclusion constraint
GiST tenant-aware sobre intervalos semiabertos. Intervalos adjacentes são
permitidos; sobreposições concorrentes são rejeitadas no banco.

## Snapshots do serviço

Nome, duração e preço do serviço são copiados para o agendamento. Alterações
posteriores no cadastro do serviço não reescrevem o histórico clínico ou
financeiro do agendamento existente.

## Integração financeira

Ao concluir um atendimento com preço maior que zero, o mesmo domínio
transacional cria uma receita pendente vinculada ao agendamento. O valor e a
descrição usam o snapshot do serviço, e o vencimento considera a data local do
término no fuso IANA da empresa.

A conclusão e a criação do recebível são atômicas: ambas persistem juntas ou
nenhuma persiste. Serviços gratuitos não geram lançamento. Uma restrição
parcial no PostgreSQL impede mais de uma receita ativa para o mesmo agendamento
e empresa, inclusive sob concorrência.

## Ciclo operacional

Transições permitidas:

```text
SCHEDULED -> CONFIRMED | IN_PROGRESS | CANCELED | NO_SHOW
CONFIRMED -> IN_PROGRESS | CANCELED | NO_SHOW
IN_PROGRESS -> COMPLETED
```

`COMPLETED`, `CANCELED` e `NO_SHOW` são estados terminais. Agendamentos em
andamento permitem somente alteração de observações; estados terminais são
imutáveis.

## API

```text
GET    /api/v1/appointments
POST   /api/v1/appointments
GET    /api/v1/appointments/{appointment_id}
PATCH  /api/v1/appointments/{appointment_id}
POST   /api/v1/appointments/{appointment_id}/reschedule
POST   /api/v1/appointments/{appointment_id}/confirm
POST   /api/v1/appointments/{appointment_id}/start
POST   /api/v1/appointments/{appointment_id}/complete
POST   /api/v1/appointments/{appointment_id}/cancel
POST   /api/v1/appointments/{appointment_id}/no-show
```

A listagem exige janela temporal com instantes timezone-aware e aceita filtros
por profissional, paciente, serviço e status, com paginação limitada.

## RBAC e isolamento

- `VIEW`: lista e consulta detalhes;
- `CREATE`: cria agendamentos;
- `UPDATE`: edita, reagenda e executa transições.

O `company_id` nunca é aceito do cliente. Ele é obtido da sessão autenticada.
Usuários profissionais enxergam somente a própria agenda clínica. Recursos de
outro tenant ou fora desse escopo retornam `404` quando aplicável.

## Interface web

A rota `/agenda` exige `APPOINTMENTS:VIEW`. A tela oferece:

- navegação semanal;
- grade desktop por dia e profissional;
- visualização compacta por dia no mobile;
- detalhes acessíveis em Dialog;
- criação, edição e reagendamento conforme permissões;
- comandos de confirmação, início, conclusão, cancelamento e ausência;
- feedback de carregamento, vazio, erro e sucesso.

As mutações passam pelo BFF same-origin e pela sessão HttpOnly existente.

## Fora do escopo atual

Permanecem como evoluções futuras:

- confirmações automáticas por e-mail ou mensageria;
- lembretes e filas assíncronas;
- integração com calendários externos;
- salas e recursos compartilhados;
- recorrência;
- lista de espera.
