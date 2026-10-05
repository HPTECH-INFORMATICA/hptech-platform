# Catálogo de planos de tratamento

Planos são entidades separadas dos serviços. Um plano possui nome, descrição,
preço comercial, validade e um ou mais itens. Cada item referencia um serviço
da mesma clínica e define separadamente sessões pagas e cortesias.

O cenário `10 + 2` já pode ser cadastrado no catálogo: dez sessões contratadas,
duas cortesias, preço de R$ 3.000 e validade definida pela clínica. O banco
impede quantidades inválidas, serviços duplicados no mesmo plano e vínculos
entre empresas diferentes.

A interface está disponível em `Serviços > Planos` e segue o mesmo padrão de
ações do restante do produto: editar e salvar, desativar ou reativar e remover
logicamente. As permissões desta primeira fase reutilizam o módulo `SERVICES`.

Este incremento ainda não representa uma venda. A próxima fase criará o
contrato do paciente e o ledger imutável de reserva, consumo, cancelamento e
estorno. Até essa fase, nenhum saldo de sessões deve ser inferido ou alterado
manualmente.

## API

```text
GET    /api/v1/treatment-plans
POST   /api/v1/treatment-plans
PUT    /api/v1/treatment-plans/{plan_id}
PATCH  /api/v1/treatment-plans/{plan_id}/status
DELETE /api/v1/treatment-plans/{plan_id}
```

As consultas são tenant-aware e a remoção é lógica, preservando a base para os
futuros contratos e históricos.
