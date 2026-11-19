MesaFlow

Sistema de gerenciamento de pedidos e comandas para estabelecimentos, com atendimento por mesa via QR Code, controle de produtos e estoque, pedidos, pagamentos, histórico de vendas e integração com impressão.

Os requisitos de sistema, ambiente e validação estão documentados em
[`REQUIREMENTS.md`](REQUIREMENTS.md).

Para construir a pilha com Nginx e proxy reverso, veja
[`docs/production.md`](docs/production.md).

As dependências do backend e frontend ficam no único `package.json` da raiz,
com um único `package-lock.json`. Execute os comandos npm na raiz.

## Configuração de ambiente

Na raiz, copie `.env.example` para `.env` na primeira instalação e instale as dependências:

```bash
cp -n .env.example .env
chmod 600 .env
npm run setup
```

O `.env` local é compartilhado pelo backend, Prisma, Vite e Docker Compose. As
variáveis `DEV_*` configuram o Compose de desenvolvimento. `DATABASE_URL` e
`VALKEY_URL` são para o backend executado diretamente no host. Staging e
produção usam as seções `STAGING_*` e `PRODUCTION_*`, respectivamente.
O banco de integração usa apenas `TEST_MARIADB_*` e fica em
`127.0.0.1:3308/mesaflow_test`. Veja [testes de integração](docs/integration-tests.md).

Ao migrar um checkout existente, mantenha as credenciais do seu volume MariaDB.
Transfira os antigos valores de staging para as chaves `STAGING_*` e os de
produção para `PRODUCTION_*`. Se configurava URLs públicas em um arquivo do
frontend, mova `VITE_API_URL` e `VITE_PRINT_URL` para a raiz. Apague os
arquivos antigos após conferir os valores no `.env`.

O Vite só inclui essas duas URLs no bundle. Mantenha credenciais e as variáveis
opcionais `VAPID_*` no `.env` privado. Após mudar o arquivo, reinicie os
processos locais ou recrie os containers que recebem essas variáveis.

Comandos de desenvolvimento:

- `npm run dev`: inicia backend e frontend.
- `npm run build`: compila os dois projetos.
- `npm test`: executa os testes dos dois projetos.
- `npm run lint` e `npm run lint:backend`: verificam frontend e backend.

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

consultar pedidos e comandas;

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

Durante o desenvolvimento, o diretório do frontend é montado no container e o
Vite atualiza a página automaticamente quando os arquivos locais são salvos.
Depois da primeira construção, basta executar `docker compose up`.

O arquivo `mesaflow_schema_v1.sql` é aplicado automaticamente no banco
`orderflow`. Em um volume novo, o próprio MariaDB importa o schema; em volumes
já existentes, o serviço `database-init` reaplica as instruções idempotentes
antes de liberar a inicialização do backend.

Para conferir a inicialização e listar as tabelas:

```bash
docker compose logs database-init
docker compose exec database sh -c 'exec mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE" -e "SHOW TABLES;"'
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

PENDING — pedido registrado.
CANCELLED — pedido cancelado administrativamente.

Não há acompanhamento de preparo ou entrega. O cliente consulta os itens em Conta.

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

## Homologação (staging)

Após preencher a seção `STAGING_*` do `.env`, execute `npm run staging:build` e `npm run staging:up`. Acesse `http://127.0.0.1:8080` ou execute `npm run staging:tunnel` para compartilhar o ambiente temporariamente.

Use `npm run staging:ps` para consultar os serviços, `npm run staging:logs` para acompanhar os logs e `npm run staging:down` para encerrar os containers e preservar os dados.

Consulte o [guia de homologação](docs/staging.md) para configurar as credenciais e atualizar a origem pública ao abrir o túnel.

## Testes automatizados

O MesaFlow possui testes automatizados para validar as regras de negócio, os endpoints da API e a persistência dos dados.

### Testes do backend

```bash
npm run test:backend
```

### Testes do frontend

```bash
npm run test:frontend
```

### Testes de integração

```bash
npm run db:test:up
npm run test:integration
npm run db:test:down
```

Os testes de integração utilizam um ambiente Docker isolado e são executados automaticamente pelo pipeline de integração contínua do GitHub Actions.

Para mais informações, consulte a [Documentação dos testes de integração](docs/integration-tests.md).