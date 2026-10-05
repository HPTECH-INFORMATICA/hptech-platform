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

Nesta primeira entrega são gravados o contrato, o recebível e os créditos
iniciais. Reserva e consumo pela Agenda serão implementados na etapa seguinte.

Na tela de Pacientes, o menu de ações oferece `Planos contratados`. Usuários com
permissão de atualização podem contratar um plano ativo como pago integralmente
ou em aberto. A consulta exibe preço contratado, validade, situação financeira
e saldo separado de sessões pagas e cortesias.

## API

```text
POST /api/v1/patient-plan-contracts
GET  /api/v1/patient-plan-contracts?patient_id={patient_id}
```
