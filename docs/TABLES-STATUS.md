# Estado da mesa durante o atendimento

O estado da mesa é derivado do atendimento ativo, sem duplicar o estado em
`restaurant_tables`. As regras novas ficam no serviço, controller e rotas de
`tables`, com as ações na página administrativa de mesas.

| Tela / API | Atendimento no banco | Próxima ação |
| --- | --- | --- |
| Disponível / `available` | Sem atendimento ativo | Iniciar atendimento |
| Em aberto / `occupied` | `OPEN` | Solicitar conta |
| Conta solicitada / `closing_requested` | `CLOSING_REQUESTED` | Aguardar pagamento |
| Aguardando pagamento / `awaiting_payment` | `AWAITING_PAYMENT` | Fechar atendimento e liberar mesa |

O fechamento grava `CLOSED` e `closedAt`, mantém o histórico e libera a mesa.
A solicitação da conta grava `closingRequestedAt` e enfileira uma impressão
`BILL` na mesma transação, seguindo o padrão existente de atendimento.
O botão de fechamento é uma ação manual do operador: não registra nem confirma
transações financeiras. Os módulos de pedidos, atendimento e pagamentos não
foram modificados.

## API

`GET /api/v1/tables` e `GET /api/v1/tables/:id` retornam `status` e
`attendanceId` (string ou `null`), além dos dados e QR Code da mesa.

`PATCH /api/v1/tables/:id/status` recebe o próximo estado e a identificação
do atendimento que estava na tela:

```json
{ "status": "occupied", "attendanceId": null }
```

Após iniciar, envie o `attendanceId` retornado nas ações seguintes. A API
retorna a mesa atualizada; dados inválidos geram 400, mesa inexistente 404 e
conflitos 409. Não é permitido pular etapas, voltar estados, abrir atendimento
em mesa inativa, desativar mesa ocupada ou aplicar uma ação a atendimento antigo.

O serviço serializa ações da mesma mesa em transação. O índice único
`uq_attendances_one_active_per_table` inclui `AWAITING_PAYMENT`, impedindo
nova abertura também durante o pagamento, inclusive por outras rotas.

## Banco existente

O SQL principal contempla instalações novas e volumes existentes. Para aplicar
somente este ajuste, a partir de `backend`:

```sh
../node_modules/.bin/prisma db execute --file prisma/sql/tables-attendance-status.sql
npm run prisma:generate
```

O projeto usa um schema SQL inicial, sem histórico Prisma Migrate; por isso a
migração incremental está em `backend/prisma/sql`. Ela é reaplicável e preserva
os registros existentes. Reinicie a API após gerar o client em produção.

## Verificação

Na raiz:

```sh
node --import tsx --test backend/tests/tables.test.ts
```

Com o banco local migrado, a partir de `backend`:

```sh
RUN_TABLES_DB_TESTS=1 node --import tsx --test tests/tables.integration.test.ts
```

O teste de integração cria uma mesa temporária e remove apenas seus próprios
registros ao terminar. Verifica persistência, ciclo completo, reabertura,
ações concorrentes e a restrição de atendimento único nos três estados ativos.

Na interface, selecione uma mesa disponível e use os botões na sequência da
tabela acima. Os cartões, filtros e detalhes devem refletir cada etapa;
recarregar a página deve preservar o estado. Após fechar, deve ser possível
iniciar um novo atendimento na mesma mesa.
