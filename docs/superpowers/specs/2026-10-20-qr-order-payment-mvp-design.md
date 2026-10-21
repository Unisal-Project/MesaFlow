# MVP — pedidos por QR Code e fechamento de mesa

**Status:** aprovado para planejamento de implementação  
**Data:** 2026-10-20

## Objetivo

Permitir que clientes façam pedidos usando o QR Code físico da mesa, sem
cadastro ou escolha manual de comanda. O restaurante recebe os pedidos na
mesma mesa e encerra a conta no seu terminal fixo após o recebimento total.

O MVP deve privilegiar um fluxo natural para o cliente e não requer um celular
ou tablet para cada garçom.

## Princípios de produto

- Escanear o QR apenas abre o cardápio; não ocupa a mesa e não cria atendimento.
- O primeiro pedido confirmado abre o atendimento da mesa.
- Todos os celulares que usarem o QR da mesma mesa trabalham no mesmo
  atendimento ativo.
- O cliente informa apenas um nome ao enviar um pedido. Não há login, PIN,
  seleção de grupo ou escolha de comanda.
- A liberação da mesa é uma ação da equipe, nunca do cliente.
- Pagamentos no MVP são registrados como um único valor consolidado da conta,
  independentemente de como o valor foi dividido entre os presentes.

## Fluxo do cliente

### Cardápio e pedido

1. O cliente lê o QR Code da mesa.
2. O navegador abre o cardápio público associado ao token da mesa.
3. O cliente seleciona itens e toca em **Fazer pedido**.
4. Antes do primeiro envio naquele navegador, informa seu primeiro nome.
5. O backend localiza a mesa pelo token e, se não houver atendimento ativo,
   cria um atendimento `OPEN`.
6. O pedido é criado no atendimento ativo, associado ao nome informado.
7. A mesa passa a aparecer como `occupied` para a equipe.

O nome serve para identificar os pedidos na operação. Não é autenticação e não
é usado para impedir que outro cliente envie pedidos.

### Vários clientes na mesma mesa

Uma segunda pessoa lê o mesmo QR, monta seu próprio carrinho e informa o nome
ao confirmar. O pedido é adicionado ao atendimento existente da mesa, mantendo
o responsável visível:

```text
Mesa 7 — atendimento ativo
Ana: 2 hambúrgueres
Carlos: 1 porção e 2 refrigerantes
```

O navegador pode guardar localmente o nome já informado para reduzir repetição
em pedidos seguintes naquele mesmo aparelho. Se a pessoa usar outro aparelho,
informa o nome novamente; isso continua sendo um novo pedido dentro da mesma
mesa.

## Fechamento e pagamento

1. Um cliente toca em **Pedir conta** no cardápio da mesa.
2. A mesa passa para `closing_requested` e a tela operacional fixa do
   restaurante mostra que a conta foi solicitada.
3. O garçom atende a mesa e decide, com os clientes, como dividir o valor.
4. Cobranças por cartão, Pix ou dinheiro são feitas fora do MesaFlow, usando a
   maquininha e os procedimentos já disponíveis no estabelecimento.
5. Depois que o valor **total** da conta estiver recebido, o operador abre a
   mesa no terminal fixo e usa **Pagamento recebido**.
6. O backend registra um pagamento consolidado com o valor integral, estado
   `PAID` e data/hora de confirmação; então fecha o atendimento e libera a
   mesa (`available`).

O cliente não escolhe nem confirma a modalidade de pagamento no MVP. Se for
útil, a tela pode oferecer uma preferência de pagamento apenas como aviso para
a equipe, sem transformar isso em registro financeiro definitivo.

## Divisão de conta: limite explícito do MVP

É permitido que clientes dividam a conta entre si na maquininha. Porém, o
sistema não registra inicialmente parcelas, itens pagos por pessoa, método por
pagamento ou saldo parcial. A equipe só confirma o pagamento no sistema quando
o total da mesa foi acertado.

Consequências intencionais:

- se um casal pagar e sair antes, a mesa permanece aberta no sistema até que o
  saldo total seja resolvido;
- o pagamento salvo é único e corresponde ao total da conta;
- relatórios de faturamento não dependem de crédito, débito, Pix ou dinheiro.

Uma evolução futura pode introduzir parcelas de pagamento e alocação de itens
por pessoa, sem alterar o fluxo básico de QR e pedidos.

## Estados da mesa

| Estado exposto | Atendimento | Significado operacional |
| --- | --- | --- |
| `available` | nenhum ativo | livre para receber o primeiro pedido |
| `occupied` | `OPEN` | pedidos podem ser enviados pelo QR |
| `closing_requested` | `CLOSING_REQUESTED` | cliente pediu a conta; equipe deve atender |
| `awaiting_payment` | `AWAITING_PAYMENT` | reservado para a etapa interna de confirmação, se necessária |

O fechamento efetivo grava o atendimento como `CLOSED`; como ele deixa de ser
ativo, a mesa volta a ser apresentada como `available`.

## Dados mínimos a persistir

- Mesa: identificador, número, token QR e ativação (já existem).
- Atendimento: mesa, estado e datas de abertura/fechamento (já existem).
- Pedido: atendimento, itens e nome informado pelo cliente responsável.
- Solicitação de conta: data/hora e atendimento correspondente, derivada do
  estado `CLOSING_REQUESTED`.
- Pagamento consolidado: atendimento, valor total, `PAID`, data/hora e,
  futuramente, operador que confirmou.

O modelo de `payments` contém `attendance_id`, `amount`, `status` e `paid_at`.
O MVP não armazena modalidade de pagamento.

## Dashboard

O dashboard deve considerar apenas pagamentos `PAID`. Métricas iniciais:

- faturamento por dia, semana e mês;
- quantidade de contas fechadas;
- ticket médio;
- número de mesas em atendimento e com conta solicitada.

Não faz parte do MVP filtrar ou consolidar faturamento por método de pagamento.

## Regras e validações essenciais

- QR inválido ou mesa inativa não abre cardápio nem aceita pedido.
- O primeiro pedido cria o atendimento de forma atômica; pedidos concorrentes
  pelo mesmo QR devem entrar no mesmo atendimento ativo.
- Não pode haver dois atendimentos ativos para a mesma mesa.
- Após solicitar conta, novos pedidos devem ser bloqueados no QR até que a
  equipe reabra o atendimento ou conclua o fechamento.
- Só a ação interna de pagamento recebido pode fechar o atendimento e liberar
  a mesa.
- Um pagamento confirmado por engano deve poder ser cancelado/revertido com
  trilha de auditoria; o histórico não deve ser apagado.

## Fora do escopo do MVP

- Integração direta com adquirentes ou maquininhas.
- Confirmação automática de Pix.
- Cobrança por cartão no celular do cliente.
- Pagamento parcial registrado no sistema.
- Divisão automática por pessoas ou seleção de itens para cada pagador.
- Cadastro, autenticação ou PIN do cliente.

## Direção de implementação

A implementação deverá separar APIs públicas de QR/pedido das APIs internas de
operação. O QR é uma credencial de localização da mesa, não autorização para
executar ações administrativas. O módulo atual de `tables` continua sendo a
fonte do estado da mesa; pedidos e pagamentos passam a operar sobre o
atendimento ativo que ele representa.
