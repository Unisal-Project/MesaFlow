# MesaFlow — Regras de Negócio e Contexto do Projeto

## 1. Objetivo

O MesaFlow é um sistema de gerenciamento de pedidos, comandas, mesas, produtos, estoque, pagamentos e impressão de pedidos para estabelecimentos.

Este documento deve ser usado como referência por desenvolvedores e agentes de IA antes de criar ou alterar funcionalidades do projeto.

A implementação deve preservar as regras descritas aqui, salvo quando houver decisão explícita de mudança de escopo.

---

## 2. Stack da V1

- TypeScript
- Fastify
- Zod
- Prisma ORM
- MariaDB
- React
- ESP32 para integração com impressão

Arquitetura esperada no backend:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Repository / Prisma
  ↓
MariaDB
```

Organização sugerida:

```text
modules/
├── auth/
├── users/
├── categories/
├── products/
├── stock/
├── tables/
├── attendances/
├── orders/
├── payments/
└── print/
```

---

## 3. Perfis de acesso

### Cliente

O cliente não precisa possuir conta ou autenticação tradicional.

O acesso acontece pelo QR Code físico da mesa.

Pode:

- visualizar cardápio;
- criar pedidos;
- visualizar sua comanda;
- fazer novos pedidos enquanto o atendimento estiver aberto;
- solicitar fechamento da conta;
- cancelar um pedido dentro do prazo permitido.

### Funcionário

Pode:

- visualizar pedidos;
- visualizar mesa de origem;
- atualizar status dos pedidos;
- alterar quantidade ou itens quando necessário;
- personalizar pedidos;
- cancelar pedidos;
- visualizar comandas;
- finalizar atendimentos;
- registrar pagamentos;
- controlar disponibilidade e estoque;
- receber/imprimir pedidos.

### Administrador

Possui as permissões de funcionário e também pode:

- cadastrar e editar produtos;
- cadastrar categorias;
- cadastrar mesas;
- gerenciar funcionários;
- controlar estoque;
- acompanhar vendas;
- visualizar faturamento;
- consultar histórico e relatórios.

---

## 4. Modelo conceitual principal

O centro do sistema é o atendimento/comanda, e não o pedido.

```text
Mesa
  ↓
Atendimento
  ↓
Pedido 1
Pedido 2
Pedido 3
  ↓
Itens
  ↓
Pagamento
  ↓
Fechamento
```

Uma mesma mesa pode ter vários atendimentos ao longo do tempo, mas somente um atendimento ativo por vez.

---

## 5. Mesas e QR Code

- Cada mesa possui um QR Code permanente.
- O QR Code identifica a mesa, não um atendimento específico.
- O token do QR Code deve ser único.
- A mesa não precisa armazenar um status duplicado no banco.
- O estado operacional da mesa é derivado do atendimento atual.

Exemplo:

```text
sem atendimento ativo      → LIVRE
atendimento OPEN            → OCUPADA
CLOSING_REQUESTED           → AGUARDANDO_PAGAMENTO
```

Uma mesa jamais pode possuir dois atendimentos ativos simultaneamente.

---

## 6. Atendimento / Comanda

Status da V1:

```text
OPEN
CLOSING_REQUESTED
CLOSED
CANCELLED
```

### OPEN

- aceita pedidos;
- cliente pode fazer novos pedidos;
- funcionário pode operar normalmente.

### CLOSING_REQUESTED

- cliente solicitou a conta;
- funcionário deve realizar fechamento/pagamento;
- não deve ser tratado como atendimento encerrado.

### CLOSED

- atendimento finalizado;
- não aceita novos pedidos;
- representa histórico;
- mesa volta a ficar livre.

### CANCELLED

- atendimento cancelado administrativamente;
- não aceita novos pedidos.

---

## 7. Produtos

Cada produto possui:

- categoria;
- nome;
- descrição;
- preço atual;
- quantidade em estoque;
- `available`;
- `active`.

### `active`

Indica se o produto faz parte do catálogo do estabelecimento.

`active = false` significa que o produto foi descontinuado ou removido do cardápio.

### `available`

Indica disponibilidade operacional atual.

Um produto pode continuar cadastrado e ativo, mas estar temporariamente indisponível.

### Estoque zero

Quando:

```text
stock_quantity = 0
```

o produto deve ser considerado indisponível para novos pedidos.

O backend deve impedir a inclusão do produto sem estoque.

---

## 8. Preço dos produtos

`products.price` representa o preço atual.

`order_items.unit_price` representa o preço cobrado no momento da venda.

Nunca recalcular uma venda antiga usando `products.price`.

Exemplo:

```text
Produto vendido por R$20,00
Preço alterado depois para R$25,00
Venda antiga continua registrada como R$20,00
```

---

## 9. Criação de pedido

Um pedido pertence sempre a um atendimento.

Um atendimento pode possuir vários pedidos.

Fluxo obrigatório:

```text
receber pedido
    ↓
validar atendimento ativo
    ↓
validar produtos
    ↓
validar disponibilidade
    ↓
validar estoque
    ↓
criar order
    ↓
criar order_items
    ↓
debitar estoque
    ↓
registrar stock_movements
    ↓
criar print_job
```

A criação deve ocorrer dentro de uma transação.

Se qualquer etapa falhar, toda a operação deve sofrer rollback.

---

## 10. Estoque

O estoque é debitado no momento em que o pedido é confirmado/criado.

Exemplo:

```text
estoque inicial: 20
pedido: 2 unidades

novo estoque: 18
```

Movimento:

```text
type = SALE
quantity = -2
```

A atualização do estoque deve ser segura contra concorrência.

O sistema nunca deve permitir:

```text
stock_quantity < 0
```

---

## 11. Histórico de estoque

Toda alteração significativa deve gerar `stock_movements`.

Tipos:

```text
ENTRY
EXIT
ADJUSTMENT
SALE
CANCELLATION
```

### ENTRY

Entrada normal de estoque.

### EXIT

Saída administrativa não associada diretamente a venda.

### SALE

Débito originado por pedido.

### ADJUSTMENT

Alteração manual ou diferença gerada por edição de pedido.

### CANCELLATION

Reposição decorrente de cancelamento.

Sempre que possível, o movimento deve guardar referência ao pedido e/ou item responsável.

---

## 12. Alteração de pedido

Funcionário ou administrador pode alterar um pedido quando necessário.

Ao alterar quantidade, não recalcular todo o estoque: movimentar apenas a diferença.

Exemplo:

```text
pedido tinha 2 unidades
foi alterado para 3

diferença = +1 item no pedido
estoque = -1
```

Movimento:

```text
type = ADJUSTMENT
quantity = -1
```

Outro exemplo:

```text
pedido tinha 3
foi alterado para 1

diferença = -2 itens no pedido
estoque = +2
```

Movimento:

```text
type = ADJUSTMENT
quantity = +2
```

Toda alteração que afete pedido e estoque deve usar transação.

---

## 13. Personalização de pedido

Na V1, personalizações simples podem ser armazenadas em:

```text
order_items.notes
```

Exemplo:

```text
sem cebola
sem tomate
adicionar gelo
```

A V1 não possui estrutura complexa de:

- ingredientes;
- grupos de adicionais;
- modificadores;
- combos;
- opções pagas.

Esses recursos ficam fora do escopo inicial.

---

## 14. Cancelamento pelo cliente

O cliente pode cancelar um pedido somente até 5 minutos após sua criação.

Regra:

```text
agora <= order.created_at + 5 minutos
```

A validação dos 5 minutos pertence ao backend, não ao banco.

Ao cancelar:

1. verificar se pedido ainda não está cancelado;
2. alterar status para `CANCELLED`;
3. registrar `cancelled_at`;
4. registrar `cancellation_source = CUSTOMER`;
5. repor estoque;
6. registrar `CANCELLATION`;
7. manter histórico do pedido.

Pedido cancelado nunca deve ser excluído fisicamente.

---

## 15. Cancelamento por funcionário ou administrador

Funcionário e administrador podem cancelar pedidos depois dos 5 minutos.

O cancelamento deve registrar:

- `cancelled_at`;
- `cancelled_by`;
- `cancellation_source`;
- `cancellation_reason`;
- `restore_stock`.

Para funcionário/admin, o motivo deve ser obrigatório na regra de negócio.

---

## 16. Reposição de estoque no cancelamento

Nem todo cancelamento administrativo significa que o item pode voltar ao estoque.

Exemplo:

```text
café já preparado
pedido cancelado financeiramente
```

O café não retorna fisicamente ao estoque.

Por isso existe:

```text
restore_stock
```

### `restore_stock = true`

- repor quantidade;
- gerar `stock_movements` do tipo `CANCELLATION`.

### `restore_stock = false`

- não modificar estoque;
- registrar apenas o cancelamento financeiro/operacional.

Para cancelamento normal do cliente dentro dos 5 minutos, a regra padrão da V1 é restaurar estoque.

---

## 17. Idempotência de cancelamento

Um pedido já cancelado não pode ser cancelado novamente.

Nunca permitir:

```text
CANCELLED
  ↓
CANCELLED novamente
```

Isso evitaria duplicar a reposição de estoque.

A regra deve ser validada antes de qualquer movimentação.

---

## 18. Status de pedidos

Status da V1:

```text
PENDING
PREPARING
READY
DELIVERED
CANCELLED
```

Fluxo esperado:

```text
PENDING
   ↓
PREPARING
   ↓
READY
   ↓
DELIVERED
```

`CANCELLED` representa saída excepcional do fluxo.

Mudanças inválidas de estado devem ser rejeitadas pelo Service.

---

## 19. Conta e pagamentos

O cliente pode solicitar fechamento da conta.

Isso altera o atendimento para:

```text
CLOSING_REQUESTED
```

O pagamento pertence ao atendimento, não ao pedido individual.

Métodos da V1:

```text
CASH
PIX
CREDIT_CARD
DEBIT_CARD
```

Status:

```text
PENDING
PAID
CANCELLED
```

Um atendimento pode possuir mais de um pagamento.

Isso permite pagamento dividido.

Exemplo:

```text
total: R$100

PIX: R$50
CREDIT_CARD: R$50
```

---

## 20. Fechamento do atendimento

Antes de fechar um atendimento, validar:

- atendimento não está fechado;
- valor pago é suficiente conforme regra financeira definida;
- pagamentos válidos estão registrados.

Ao finalizar:

```text
attendance.status = CLOSED
closed_at = agora
closed_by = funcionário/admin
```

A mesa automaticamente passa a ser considerada livre.

---

## 21. Histórico de vendas

Não criar tabela específica chamada `sales_history`.

O histórico deve ser obtido a partir de:

```text
attendances
orders
order_items
payments
```

Atendimentos fechados formam o histórico operacional.

Pagamentos `PAID` formam a base financeira.

---

## 22. Faturamento

Não persistir tabelas redundantes como:

```text
daily_revenue
monthly_revenue
```

O faturamento deve ser calculado a partir de pagamentos com:

```text
status = PAID
```

usando `paid_at`.

Isso permite obter:

- faturamento diário;
- faturamento mensal;
- histórico;
- ticket médio;
- produtos mais vendidos;
- quantidade vendida.

---

## 23. Impressão e ESP32

Pedidos devem poder gerar trabalhos de impressão.

Tabela:

```text
print_jobs
```

Tipos:

```text
ORDER
BILL
```

Status:

```text
PENDING
SENT
PRINTED
FAILED
```

A impressão não deve depender de uma única tentativa síncrona.

Fluxo:

```text
pedido criado
    ↓
print_job PENDING
    ↓
dispositivo/processo busca trabalho
    ↓
imprime
    ↓
PRINTED
```

Em caso de erro:

```text
FAILED
```

O sistema pode tentar novamente.

A existência de `print_jobs` evita perder pedidos caso ESP32/impressora estejam temporariamente indisponíveis.

---

## 24. Transações obrigatórias

Usar transações do Prisma em operações que afetam múltiplas entidades.

Principalmente:

### Criação de pedido

```text
order
order_items
products.stock_quantity
stock_movements
print_jobs
```

### Alteração de pedido

```text
order_items
products.stock_quantity
stock_movements
```

### Cancelamento

```text
orders
products.stock_quantity
stock_movements
```

Se uma operação falhar:

```text
ROLLBACK
```

Nenhum estado parcial deve permanecer salvo.

---

## 25. Integridade e segurança de estoque

Antes de debitar estoque:

- validar quantidade solicitada;
- garantir que produto está ativo;
- garantir que produto está disponível;
- garantir que existe estoque suficiente.

A atualização deve ser atômica ou protegida por transação/condição adequada para evitar corrida entre pedidos simultâneos.

Exemplo que deve ser evitado:

```text
estoque = 2

Cliente A pede 2
Cliente B pede 2

resultado inválido:
estoque = -2
```

Somente uma operação deve conseguir consumir as duas unidades.

---

## 26. Regras de exclusão

Registros históricos importantes não devem ser apagados fisicamente durante a operação normal.

Preferir:

```text
active = false
status = CANCELLED
```

em vez de `DELETE`.

Especialmente para:

- produtos vendidos;
- pedidos;
- atendimentos;
- pagamentos;
- movimentos de estoque.

Isso preserva auditoria e relatórios.

---

## 27. Entidades da V1

```text
users
categories
products
restaurant_tables
attendances
orders
order_items
stock_movements
payments
print_jobs
```

---

## 28. Relacionamentos principais

```text
CATEGORY 1 ─── N PRODUCT

PRODUCT 1 ─── N ORDER_ITEM

PRODUCT 1 ─── N STOCK_MOVEMENT

RESTAURANT_TABLE 1 ─── N ATTENDANCE

ATTENDANCE 1 ─── N ORDER

ORDER 1 ─── N ORDER_ITEM

ATTENDANCE 1 ─── N PAYMENT

ORDER / ATTENDANCE ─── PRINT_JOB
```

---

## 29. Regras que NÃO devem ser inferidas automaticamente

Um agente de IA não deve adicionar sem decisão explícita:

- cadastro obrigatório de clientes;
- reservas de mesas;
- cupons;
- programa de fidelidade;
- múltiplos estabelecimentos;
- delivery;
- ingredientes complexos;
- adicionais pagos;
- combos;
- divisão individual da comanda por pessoa;
- integração com gateway de pagamento;
- fechamento automático do atendimento;
- exclusão automática de dados históricos.

Esses pontos não fazem parte da V1 atual.

---

## 30. Princípios para novas implementações

Antes de alterar banco ou regras:

1. verificar se a mudança pertence à V1;
2. preservar histórico de vendas;
3. preservar histórico de estoque;
4. não duplicar informações calculáveis;
5. usar transação quando houver múltiplas alterações relacionadas;
6. não permitir estoque negativo;
7. não permitir dois atendimentos ativos na mesma mesa;
8. não permitir pedido em atendimento fechado;
9. não recalcular venda antiga usando preço atual;
10. não apagar pedidos cancelados;
11. registrar autoria e motivo de ações administrativas relevantes;
12. manter responsabilidades de validação de negócio no Service/backend.

---

## 31. Resumo operacional da V1

```text
QR Code da mesa
      ↓
identifica mesa
      ↓
localiza/cria atendimento
      ↓
cliente visualiza cardápio
      ↓
cliente cria pedido
      ↓
valida estoque
      ↓
pedido + itens
      ↓
estoque debitado
      ↓
histórico de estoque
      ↓
print_job
      ↓
preparo
      ↓
entrega
      ↓
cliente pode pedir novamente
      ↓
solicita conta
      ↓
funcionário registra pagamento
      ↓
fecha atendimento
      ↓
mesa fica livre
      ↓
dados permanecem disponíveis para histórico e relatórios
```

---

## 32. Fonte de verdade

Este documento representa as regras de negócio definidas para a primeira versão do MesaFlow.

Em caso de divergência entre implementação gerada automaticamente e este documento, a implementação deve ser revisada de acordo com estas regras, salvo quando uma mudança posterior de requisito tiver sido explicitamente aprovada.
