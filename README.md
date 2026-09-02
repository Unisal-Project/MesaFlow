MesaFlow

Sistema de gerenciamento de pedidos e comandas para estabelecimentos, com atendimento por mesa via QR Code, controle de produtos e estoque, pedidos, pagamentos, histórico de vendas e integração com impressão.

Os requisitos de sistema, ambiente e validação estão documentados em
[`REQUIREMENTS.md`](REQUIREMENTS.md).

Para baixar todas as bibliotecas do backend e frontend e gerar o Prisma Client:

```bash
npm run setup
```

Visão Geral

Cada mesa do estabelecimento possui um QR Code próprio. Ao escanear o código, o cliente acessa um cardápio digital já identificado com a mesa correspondente.

O fluxo principal da aplicação é:

QR Code da mesa
      ↓
Cliente acessa o cardápio
      ↓
Realiza um pedido
      ↓
Pedido entra no atendimento/comanda
      ↓
Estoque é debitado
      ↓
Pedido é exibido ou impresso
      ↓
Funcionário prepara e entrega
      ↓
Cliente pode realizar novos pedidos
      ↓
Cliente solicita fechamento
      ↓
Funcionário registra o pagamento
      ↓
Atendimento é finalizado
      ↓
Mesa fica livre

Perfis de Acesso

Cliente

O cliente acessa o sistema através do QR Code da mesa, sem necessidade de cadastro na V1.

Pode:

visualizar o cardápio;

consultar preços e informações dos produtos;

adicionar produtos ao pedido;

realizar novos pedidos durante o atendimento;

acompanhar a comanda;

cancelar pedidos dentro do prazo permitido;

solicitar fechamento da conta.

Funcionário

Responsável pela operação do estabelecimento.

Pode:

visualizar pedidos recebidos;

identificar a mesa de origem;

acompanhar atendimentos abertos;

atualizar status dos pedidos;

alterar e personalizar pedidos;

cancelar pedidos;

controlar disponibilidade dos produtos;

registrar pagamentos;

finalizar atendimentos;

receber ou imprimir pedidos.

Administrador

Possui as permissões operacionais e também funções administrativas.

Pode:

cadastrar e editar produtos;

cadastrar categorias;

cadastrar mesas;

gerenciar funcionários;

controlar estoque;

acompanhar pedidos e comandas;

visualizar vendas;

consultar faturamento diário e mensal;

acessar histórico e relatórios.

Arquitetura

A aplicação utiliza uma arquitetura centralizada:

Cliente / Funcionário / Administrador
                 │
                 ▼
               React
                 │
              REST API
                 │
                 ▼
              Fastify
                 │
          Route / Controller
                 │
              Service
                 │
           Prisma ORM
                 │
                 ▼
              MariaDB
                 │
                 └── print_jobs
                        │
                        ▼
                      ESP32
                        │
                        ▼
                    Impressora

No backend, a separação de responsabilidades segue:

Route
  ↓
Controller
  ↓
Service
  ↓
Prisma
  ↓
MariaDB

As regras de negócio devem permanecer principalmente na camada Service.

Stack

TypeScript

React

Fastify

Zod

Prisma ORM

MariaDB

ESP32

Executando com Docker

O ambiente completo, incluindo a criação das tabelas, é iniciado com:

```bash
docker compose up --build
```

O arquivo `mesaflow_schema_v1.sql` é aplicado automaticamente no banco
`orderflow`. Em um volume novo, o próprio MariaDB importa o schema; em volumes
já existentes, o serviço `database-init` reaplica as instruções idempotentes
antes de liberar a inicialização do backend.

Para conferir a inicialização e listar as tabelas:

```bash
docker compose logs database-init
docker compose exec database mariadb -uorderflow -porderflow orderflow -e "SHOW TABLES;"
```

Módulos Planejados

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
├── database/
├── plugins/
├── shared/
└── server.ts

Banco de Dados

Entidades definidas para a V1:

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

Relacionamentos principais:

CATEGORY 1 ─── N PRODUCT

PRODUCT 1 ─── N ORDER_ITEM

PRODUCT 1 ─── N STOCK_MOVEMENT

RESTAURANT_TABLE 1 ─── N ATTENDANCE

ATTENDANCE 1 ─── N ORDER

ORDER 1 ─── N ORDER_ITEM

ATTENDANCE 1 ─── N PAYMENT

ORDER / ATTENDANCE ─── PRINT_JOB

Regras Importantes da V1

uma mesa pode ter no máximo um atendimento ativo por vez;

um atendimento pode possuir vários pedidos;

o QR Code identifica a mesa, não o atendimento;

o estoque é debitado no momento da criação do pedido;

o sistema nunca deve permitir estoque negativo;

alterações de quantidade devem movimentar apenas a diferença no estoque;

o cliente pode cancelar um pedido em até 5 minutos;

funcionários e administradores podem cancelar pedidos posteriormente;

cancelamentos administrativos devem registrar responsável e motivo;

pedidos cancelados não devem ser excluídos;

order_items.unit_price preserva o preço no momento da venda;

atendimento fechado não aceita novos pedidos;

faturamento é calculado a partir de pagamentos com status PAID;

operações críticas devem usar transações;

a impressão utiliza print_jobs para evitar perda de pedidos.

Status de Atendimento

OPEN
CLOSING_REQUESTED
CLOSED
CANCELLED

Status de Pedido

PENDING
PREPARING
READY
DELIVERED
CANCELLED

Fluxo normal:

PENDING
   ↓
PREPARING
   ↓
READY
   ↓
DELIVERED

Controle de Estoque

O estoque atual fica em:

products.stock_quantity

O histórico de movimentações fica em:

stock_movements

Tipos previstos:

ENTRY
EXIT
ADJUSTMENT
SALE
CANCELLATION

Impressão

A impressão utiliza uma fila persistida:

Pedido
  ↓
print_jobs
  ↓
ESP32 / serviço de impressão
  ↓
Impressora

Status:

PENDING
SENT
PRINTED
FAILED

Tipos:

ORDER
BILL

Documentação

Antes de implementar ou alterar regras importantes do projeto, consulte:

ARQUITETURA.md

MESAFLOW_BUSINESS_RULES.md

mesaflow_schema_v1.sql

Esses arquivos representam a arquitetura, as regras de negócio e o banco definido para a primeira versão.

Escopo da V1

A V1 não inclui automaticamente:

cadastro obrigatório de clientes;

reservas de mesa;

delivery;

cupons;

programa de fidelidade;

múltiplos estabelecimentos;

ingredientes estruturados;

combos;

adicionais pagos;

divisão de conta por pessoa;

gateway de pagamento online.

Esses recursos poderão ser avaliados em versões futuras.

Status do Projeto

Projeto em fase inicial de implementação.

A arquitetura, as principais regras de negócio e a estrutura inicial do banco já foram definidas.
