# MesaFlow — Arquitetura da Aplicação

## 1. Visão Geral

O MesaFlow é um sistema de gerenciamento de pedidos e comandas para estabelecimentos, com foco em atendimento por mesa, cardápio digital via QR Code, controle de estoque, pedidos, pagamentos, histórico de vendas e integração com impressão.

Cada mesa possui um QR Code próprio. Ao escanear esse QR Code, o cliente acessa o cardápio digital já vinculado à mesa correspondente.

Exemplo:

```text
QR Code
   ↓
Mesa
   ↓
Cardápio
   ↓
Atendimento / Comanda
   ↓
Pedidos
   ↓
Pagamento
```

O sistema possui três perfis principais de acesso:

- Cliente;
- Funcionário;
- Administrador.

---

## 2. Objetivo do Sistema

O sistema deve permitir que o cliente realize pedidos diretamente da mesa, enquanto funcionários e administradores acompanham a operação em tempo real.

A aplicação deverá centralizar:

- cardápio;
- produtos;
- categorias;
- mesas;
- atendimentos;
- pedidos;
- itens do pedido;
- estoque;
- pagamentos;
- impressão;
- vendas;
- histórico financeiro.

---

## 3. Perfis de Acesso

### 3.1 Cliente

O cliente não precisa possuir conta ou autenticação tradicional na V1.

O acesso ocorre pelo QR Code da mesa.

Fluxo:

```text
QR Code
   ↓
Mesa identificada
   ↓
Cardápio
   ↓
Pedido
   ↓
Comanda
```

O cliente poderá:

- visualizar produtos disponíveis;
- visualizar preços;
- consultar descrições;
- adicionar produtos ao pedido;
- realizar pedidos;
- acompanhar o valor da comanda;
- realizar novos pedidos enquanto o atendimento estiver aberto;
- cancelar um pedido dentro do prazo permitido;
- solicitar fechamento da conta.

---

### 3.2 Funcionário

O funcionário acessa a parte operacional do sistema.

Entre suas responsabilidades:

- visualizar pedidos recebidos;
- identificar a mesa de origem;
- acompanhar atendimentos abertos;
- acompanhar status dos pedidos;
- alterar pedidos quando necessário;
- personalizar itens;
- cancelar pedidos;
- controlar disponibilidade dos produtos;
- registrar pagamentos;
- fechar atendimentos;
- receber ou imprimir pedidos.

---

### 3.3 Administrador

O administrador possui acesso às funcionalidades operacionais e administrativas.

Entre suas responsabilidades:

- cadastrar e editar produtos;
- cadastrar categorias;
- cadastrar mesas;
- gerenciar funcionários;
- controlar estoque;
- visualizar todos os atendimentos;
- acompanhar pedidos;
- acompanhar vendas;
- visualizar faturamento diário;
- visualizar faturamento mensal;
- consultar histórico e relatórios.

---

## 4. Arquitetura Geral

A aplicação utiliza um servidor central com backend e banco de dados.

Todos os tipos de usuário interagem com a aplicação através do frontend.

```text
       Cliente
         │
         │ QR Code
         ▼
   ┌──────────────┐
   │              │
   │    React     │
   │   Frontend   │
   │              │
   └──────┬───────┘
          │
          │ HTTP / REST
          ▼
   ┌──────────────┐
   │              │
   │   Fastify    │
   │   Backend    │
   │     API      │
   │              │
   └──────┬───────┘
          │
          │ Prisma ORM
          ▼
   ┌──────────────┐
   │              │
   │   MariaDB    │
   │              │
   └──────────────┘

Funcionário ─────► React ─────► Fastify
Administrador ──► React ─────► Fastify
```

Nenhum cliente, funcionário ou administrador deve acessar diretamente o banco de dados.

Toda operação deve passar pela API.

---

## 5. Stack da V1

A stack definida para a primeira versão é:

- **TypeScript** — linguagem principal;
- **React** — frontend;
- **Fastify** — backend/API;
- **Zod** — validação de dados;
- **Prisma ORM** — comunicação com banco;
- **MariaDB** — banco de dados;
- **ESP32** — integração com sistema de impressão.

---

## 6. Arquitetura do Backend

O backend deve seguir uma separação de responsabilidades.

Estrutura conceitual:

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

### Route

Responsável por:

- definir rotas HTTP;
- aplicar schemas;
- configurar autenticação;
- conectar requisição ao controller.

### Controller

Responsável por:

- receber a requisição;
- extrair parâmetros;
- chamar o Service;
- retornar resposta HTTP.

O Controller não deve concentrar regra de negócio.

### Service

Responsável pelas regras de negócio.

Exemplos:

- validar estoque;
- verificar atendimento aberto;
- impedir pedido em atendimento fechado;
- validar cancelamento em até 5 minutos;
- calcular diferença de estoque;
- controlar status;
- executar transações.

### Prisma / Repository

Responsável pela persistência dos dados.

O acesso ao banco deve ficar isolado dessa camada.

---

## 7. Organização Inicial de Módulos

Estrutura sugerida:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── categories/
│   ├── products/
│   ├── stock/
│   ├── tables/
│   ├── attendances/
│   ├── orders/
│   ├── payments/
│   └── print/
│
├── database/
├── plugins/
├── shared/
└── server.ts
```

Essa estrutura pode ser ajustada durante o desenvolvimento sem alterar as regras de domínio.

---

## 8. Conceito Central: Atendimento / Comanda

O centro do sistema é o atendimento.

Para o usuário, o atendimento representa a comanda da mesa.

No código e no banco, a entidade será chamada de:

```text
Attendance
```

ou:

```text
attendance
```

Fluxo:

```text
Mesa
  ↓
Attendance
  ↓
Order
  ↓
OrderItem
  ↓
Payment
```

Uma mesa pode possuir vários atendimentos ao longo do tempo.

Porém:

```text
1 mesa
   ↓
no máximo 1 atendimento ativo
```

---

## 9. Fluxo Principal

```text
QR Code da mesa
      ↓
Cliente abre cardápio
      ↓
Sistema identifica a mesa
      ↓
Localiza ou cria atendimento
      ↓
Cliente cria pedido
      ↓
Backend valida produtos e estoque
      ↓
Pedido é salvo
      ↓
Estoque é debitado
      ↓
Movimentação de estoque é registrada
      ↓
Trabalho de impressão é criado
      ↓
Funcionário recebe pedido
      ↓
Pedido é preparado
      ↓
Pedido é entregue
      ↓
Cliente pode fazer novos pedidos
      ↓
Cliente solicita fechamento
      ↓
Funcionário registra pagamento
      ↓
Atendimento é encerrado
      ↓
Mesa fica livre
      ↓
Venda permanece disponível para histórico
```

---

## 9.1 Fluxo Operacional entre Cliente, Cozinha, Garçom e Caixa

O fluxo operacional do MesaFlow envolve o cliente, a aplicação, a cozinha, o garçom e o caixa.

Fluxo geral:

```text
Cliente
   │
   │ QR Code / Pedido
   ▼
React
   │
   │ HTTP / REST
   ▼
Fastify
   │
   ├──────────────► MariaDB
   │                   │
   │                   └── pedidos / estoque / pagamentos / print_jobs
   │
   ▼
print_job
   │
   ▼
ESP32
   │
   ▼
Impressora
   │
   ▼
Cozinha
   │
   │ preparo
   ▼
Garçom
   │
   │ entrega
   ▼
Cliente
   │
   │ solicita fechamento
   ▼
Caixa
   │
   │ registra pagamento
   ▼
Fastify
   │
   ▼
MariaDB
   │
   ▼
Atendimento CLOSED
```
---

## 10. Status do Atendimento

Status definidos para a V1:

```text
OPEN
CLOSING_REQUESTED
CLOSED
CANCELLED
```

### OPEN

Atendimento aberto e aceitando pedidos.

### CLOSING_REQUESTED

Cliente solicitou fechamento da conta.

### CLOSED

Atendimento finalizado.

Não aceita novos pedidos.

### CANCELLED

Atendimento cancelado administrativamente.

---

## 11. Status do Pedido

Status definidos:

```text
PENDING
PREPARING
READY
DELIVERED
CANCELLED
```

Fluxo normal:

```text
PENDING
   ↓
PREPARING
   ↓
READY
   ↓
DELIVERED
```

Fluxo alternativo:

```text
qualquer estado permitido
        ↓
CANCELLED
```

As transições devem ser validadas pelo Service.

---

## 12. Fluxo de Criação de Pedido

A criação de pedido é uma operação crítica.

Fluxo esperado:

```text
Cliente envia pedido
       ↓
OrderController
       ↓
OrderService
       ↓
valida atendimento
       ↓
valida produtos
       ↓
valida disponibilidade
       ↓
valida estoque
       ↓
Prisma Transaction
       │
       ├── cria order
       ├── cria order_items
       ├── reduz stock_quantity
       ├── cria stock_movements
       └── cria print_job
       ↓
COMMIT
```

Se qualquer etapa falhar:

```text
ROLLBACK
```

Nenhum estado parcial deve permanecer salvo.

---

## 13. Estoque

O estoque atual é armazenado em:

```text
products.stock_quantity
```

O histórico de alterações é armazenado em:

```text
stock_movements
```

O estoque é debitado no momento em que um pedido é criado.

Exemplo:

```text
estoque = 20

pedido = 2 unidades

novo estoque = 18
```

Movimento:

```text
type = SALE
quantity = -2
```

O sistema nunca deve permitir:

```text
stock_quantity < 0
```

---

## 14. Disponibilidade de Produtos

Produtos possuem dois conceitos diferentes:

### active

Indica se o produto faz parte do catálogo.

```text
active = false
```

significa que o produto não deve mais ser oferecido normalmente.

### available

Indica disponibilidade operacional.

Um produto pode estar ativo, mas temporariamente indisponível.

Se:

```text
stock_quantity = 0
```

o backend deve considerá-lo indisponível para novos pedidos.

---

## 15. Alteração de Pedido e Estoque

Funcionário ou administrador pode alterar um pedido.

Caso a alteração mude a quantidade, somente a diferença deve ser aplicada ao estoque.

Exemplo:

```text
quantidade antiga = 2
quantidade nova = 3

diferença = +1 item
```

Estoque:

```text
-1
```

Movimento:

```text
ADJUSTMENT
quantity = -1
```

Outro exemplo:

```text
quantidade antiga = 3
quantidade nova = 1

diferença = -2 itens
```

Estoque:

```text
+2
```

Movimento:

```text
ADJUSTMENT
quantity = +2
```

---

## 16. Cancelamento de Pedido

### Cliente

O cliente pode cancelar um pedido em até 5 minutos após sua criação.

Regra:

```text
agora <= order.created_at + 5 minutos
```

Essa validação deve ficar no backend.

Ao cancelar:

```text
order.status = CANCELLED
```

O histórico deve ser preservado.

O pedido não deve ser apagado.

---

### Funcionário / Administrador

Funcionário e administrador podem cancelar pedidos após os 5 minutos.

O sistema deve registrar:

```text
cancelled_at
cancelled_by
cancellation_source
cancellation_reason
restore_stock
```

Para cancelamento administrativo, o motivo deve ser exigido pela regra de negócio.

---

## 17. Reposição de Estoque em Cancelamentos

Nem todo cancelamento administrativo deve devolver estoque.

Exemplo:

```text
pedido já preparado
      ↓
cancelamento financeiro
      ↓
produto não retorna fisicamente ao estoque
```

Por isso existe:

```text
restore_stock
```

### true

```text
repor estoque
+
registrar CANCELLATION
```

### false

```text
não alterar estoque
```

---

## 18. Segurança Contra Cancelamento Duplicado

Um pedido já cancelado não pode ser cancelado novamente.

Exemplo inválido:

```text
Pedido CANCELLED
      ↓
cancelamento novamente
      ↓
estoque reposto duas vezes
```

O Service deve impedir essa situação.

---

## 19. Preço Histórico

O preço atual do produto fica em:

```text
products.price
```

O preço cobrado no momento da venda fica em:

```text
order_items.unit_price
```

Isso impede que alterações futuras de preço modifiquem o histórico das vendas.

Exemplo:

```text
Produto vendido hoje:
R$ 20,00

Preço alterado amanhã:
R$ 25,00

Venda antiga:
continua R$ 20,00
```

---

## 20. Pagamentos

Pagamentos pertencem ao atendimento.

```text
Attendance
    ↓
Payments
```

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

Um atendimento pode possuir vários pagamentos.

Isso permite pagamento dividido.

Exemplo:

```text
Conta: R$ 100

PIX            R$ 50
CREDIT_CARD    R$ 50
```

---

## 21. Fechamento da Comanda

O cliente solicita o fechamento.

O atendimento muda para:

```text
CLOSING_REQUESTED
```

Depois o funcionário:

```text
registra pagamento
      ↓
valida conta
      ↓
fecha atendimento
```

Resultado:

```text
attendance.status = CLOSED
```

A mesa passa automaticamente a ser considerada livre.

---

## 22. Histórico e Faturamento

Não existe tabela específica de histórico de vendas.

O histórico é obtido através de:

```text
attendances
orders
order_items
payments
```

Também não devem existir tabelas redundantes como:

```text
daily_revenue
monthly_revenue
```

O faturamento deve ser calculado a partir de:

```text
payments.status = PAID
```

e:

```text
payments.paid_at
```

Isso permite gerar:

- faturamento diário;
- faturamento mensal;
- ticket médio;
- produtos mais vendidos;
- quantidade vendida;
- histórico de vendas.

---

## 23. Banco de Dados da V1

As entidades definidas são:

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

Relacionamentos principais:

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

## 24. QR Code

Não existe uma tabela específica de QR Codes na V1.

Cada mesa possui:

```text
restaurant_tables.qr_token
```

O QR Code aponta para uma URL que contém ou referencia esse token.

Exemplo:

```text
https://mesaflow.example/menu/{qr_token}
```

O QR Code identifica a mesa, não o atendimento.

---

## 25. Impressão e ESP32

A impressão utiliza uma fila persistida no banco.

Fluxo:

```text
Pedido criado
      ↓
print_jobs
      ↓
status = PENDING
      ↓
ESP32 / serviço de impressão
      ↓
impressora
      ↓
status = PRINTED
```

Status possíveis:

```text
PENDING
SENT
PRINTED
FAILED
```

Tipos:

```text
ORDER
BILL
```

Esse mecanismo evita perder pedidos quando a impressora ou ESP32 estiver temporariamente indisponível.

---

## 26. Fluxo de Impressão

```text
Fastify
   ↓
cria print_job
   ↓
MariaDB
   ↓
ESP32 consulta/recebe trabalho
   ↓
Impressora
   ↓
ESP32 confirma resultado
   ↓
print_jobs atualizado
```

A API não deve depender exclusivamente de comunicação direta e síncrona com o ESP32.

---

## 27. Transações

Operações críticas devem usar:

```ts
prisma.$transaction(...)
```

Principalmente:

### Criação de pedido

```text
orders
order_items
products
stock_movements
print_jobs
```

### Alteração de pedido

```text
order_items
products
stock_movements
```

### Cancelamento

```text
orders
products
stock_movements
```

---

## 28. Concorrência de Estoque

O backend deve impedir condições de corrida.

Exemplo:

```text
estoque = 2

Cliente A solicita 2
Cliente B solicita 2
```

O sistema nunca pode finalizar as duas operações gerando:

```text
estoque = -2
```

A validação e o débito devem ocorrer de forma atômica.

---

## 29. Exclusão de Dados

Registros históricos importantes não devem ser apagados durante a operação normal.

Preferir:

```text
active = false
```

ou:

```text
status = CANCELLED
```

em vez de remoção física.

Principalmente para:

- produtos que já participaram de vendas;
- pedidos;
- atendimentos;
- pagamentos;
- movimentações de estoque.

---

## 30. Recursos Fora do Escopo da V1

Não adicionar automaticamente:

- cadastro obrigatório de clientes;
- reservas de mesa;
- delivery;
- cupons;
- fidelidade;
- múltiplos estabelecimentos;
- ingredientes estruturados;
- combos;
- adicionais pagos;
- divisão da conta por pessoa;
- gateway de pagamento online;
- fechamento automático;
- exclusão automática de histórico.

Esses recursos poderão ser avaliados em versões futuras.

---

## 31. Documentação Relacionada

Este arquivo deve ser usado junto com:

```text
MESAFLOW_BUSINESS_RULES.md
mesaflow_schema_v1.sql
```

### `ARQUITETURA.md`

Define:

- arquitetura;
- componentes;
- responsabilidades;
- fluxo entre frontend, backend, banco e impressão;
- organização técnica.

### `MESAFLOW_BUSINESS_RULES.md`

Define:

- regras de domínio;
- permissões;
- estoque;
- cancelamentos;
- pagamentos;
- regras de atendimento.

### `mesaflow_schema_v1.sql`

Define:

- estrutura física do banco MariaDB;
- tabelas;
- chaves;
- constraints;
- índices.

---

## 32. Resumo da Arquitetura

```text
Cliente / Funcionário / Administrador
                 │
                 ▼
              React
                 │
                 │ REST
                 ▼
              Fastify
                 │
            Controllers
                 │
              Services
                 │
          Prisma Transaction
                 │
                 ▼
              MariaDB
                 │
                 ├── dados operacionais
                 ├── estoque
                 ├── pagamentos
                 └── print_jobs
                         │
                         ▼
                       ESP32
                         │
                         ▼
                     Impressora
```

---

## 33. Fonte de Verdade

Este documento representa a arquitetura definida para a primeira versão do MesaFlow.

Mudanças estruturais relevantes devem considerar também as regras de negócio e o schema do banco.

Em caso de divergência entre código gerado automaticamente e esta documentação, a implementação deve ser revisada antes de alterar a arquitetura do projeto.