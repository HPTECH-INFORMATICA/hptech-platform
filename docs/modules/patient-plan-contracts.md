# Contratação de planos por paciente

A contratação é separada do catálogo. Ao vender um plano, o backend preserva
uma fotografia imutável do nome, descrição, preço, validade, serviços, sessões
pagas e cortesias vigentes naquele momento. Alterações posteriores no catálogo
não reescrevem o contrato do paciente.

A criação é atômica e produz, na mesma transação:

- contrato vinculado ao paciente e ao plano de origem;
- itens contratados com snapshots comerciais;
- créditos iniciais separados em `PAID` e `COURTESY`;
- uma única receita, paga ou pendente conforme a condição informada;
- evento de auditoria.

O ledger de sessões é append-only. O PostgreSQL rejeita `UPDATE` e `DELETE` em
seus eventos. O saldo é calculado pelos movimentos `CREDIT`, `RESERVE`,
`RELEASE`, `CONSUME`, `RESTORE` e `EXPIRE`, nunca por um contador editável.

A Agenda pode vincular o agendamento a um item contratado. A criação reserva
uma sessão paga — ou uma cortesia quando o saldo pago terminou — sem consumi-la
definitivamente. A conclusão libera tecnicamente a reserva e registra o consumo
na mesma transação; cancelamento e ausência devolvem a sessão. A exclusão
auditada pelo usuário master devolve a reserva ou restaura uma sessão já
consumida.

Uma sessão de plano nunca gera uma segunda receita por atendimento. A situação
financeira exibida na Agenda vem do único recebível do contrato. O agendamento
expõe plano, posição da sessão, total contratado e saldos pago e cortesia para o
card e o detalhe operacional.

Na tela de Pacientes, o menu de ações oferece `Planos contratados`. Usuários com
permissão de atualização podem contratar um plano ativo como pago integralmente
ou em aberto. A consulta exibe preço contratado, validade, situação financeira
e saldo separado de sessões pagas e cortesias.

## API

```text
POST /api/v1/patient-plan-contracts
GET  /api/v1/patient-plan-contracts?patient_id={patient_id}
```
