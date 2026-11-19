# Testes de integração — MesaFlow

## 1. Objetivo

Os testes de integração do MesaFlow têm como objetivo validar a comunicação entre as diferentes camadas do backend, garantindo o funcionamento das rotas HTTP, regras de negócio e persistência dos dados.

Os testes utilizam a aplicação real e um banco de dados isolado, permitindo identificar inconsistências e prevenir regressões durante o desenvolvimento.

## 2. Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| Node Test Runner | Execução dos testes automatizados |
| Node Assert | Validação dos resultados |
| Fastify Inject | Simulação de requisições HTTP |
| Prisma ORM | Acesso e persistência dos dados |
| MariaDB | Banco de dados de integração |
| Docker Compose | Isolamento do ambiente de testes |
| GitHub Actions | Execução automatizada no CI |

## 3. Isolamento de ambientes

O MesaFlow possui configurações Docker, destinadas a diferentes ambientes:

| Arquivo | Ambiente |
|---|---|
| `docker-compose.yml` | Desenvolvimento |
| `docker-compose.production.yml` | Produção |
| `docker-compose.production.yml` + `docker-compose.staging.yml` | Staging |
| `docker-compose.test.yml` | Testes |

O ambiente de testes possui um banco de dados exclusivo, evitando alterações nos dados de desenvolvimento e produção.

### Configuração do banco de testes

- Imagem: MariaDB 11.4
- Host: 127.0.0.1
- Porta: 3308
- Banco de dados: mesaflow_test
- Armazenamento: temporário (tmpfs)

Os dados armazenados no ambiente de testes são descartados ao encerrar o container.
O Compose lê `TEST_MARIADB_ROOT_PASSWORD` e `TEST_MARIADB_PASSWORD` do
`.env` da raiz. O executor monta a URL com o usuário, host, porta e banco
fixos e usa somente a senha de testes. Os testes unitários recebem uma URL
inoperante e deixam os casos de MariaDB para `npm run test:integration`.

## 4. Estrutura dos testes

```text
backend/
├── src/
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── helpers/
│   │   ├── integration-env.mjs
│   │   └── unit-env.mjs
│   ├── integration/
│   │   ├── helpers/
│   │   │   ├── app.ts
│   │   │   ├── auth.ts
│   │   │   ├── database.ts
│   │   │   └── fixtures.ts
│   │   ├── health.integration.test.ts
│   │   ├── attendance.integration.test.ts
│   │   ├── orders.integration.test.ts
│   │   ├── closing-request.integration.test.ts
│   │   └── payments.integration.test.ts
    └── ...
```

## 5. Arquitetura dos testes

A configuração da aplicação foi separada da inicialização do servidor para permitir a execução dos testes sem a necessidade de abrir uma porta HTTP.

O arquivo `app.ts` disponibiliza a função `buildApp()`, utilizada tanto pelo servidor quanto pelos testes de integração.

As requisições são realizadas por meio do `app.inject()` do Fastify.

```text
Integration Test
       |
  Fastify Inject
       |
     Routes
       |
   Controllers
       |
    Services
       |
  Repositories
       |
     Prisma
       |
    MariaDB
```

## 6. Helpers e fixtures

Os helpers centralizam operações reutilizáveis durante a execução dos testes.

| Arquivo | Responsabilidade |
|---|---|
| `app.ts` | Inicialização da aplicação de testes |
| `auth.ts` | Criação de usuários autenticados |
| `database.ts` | Gerenciamento da conexão e limpeza dos registros |
| `fixtures.ts` | Criação dos dados necessários aos cenários |
| `integration-env.mjs` | Carregamento e validação do ambiente |

Os testes seguem o padrão AAA (Arrange, Act, Assert).

- **Arrange:** preparação dos dados necessários.
- **Act:** execução da operação ou requisição HTTP.
- **Assert:** validação da resposta e dos dados persistidos.

Após a execução, os registros criados pelos testes são removidos.

## 7. Cobertura dos testes

### Health Check

- Disponibilidade da aplicação.
- Inicialização dos plugins e rotas.

### Atendimento

- Abertura de atendimento.
- Consulta de atendimento.
- Prevenção de atendimentos duplicados.
- Validação de mesas.
- Validação de dados.
- Autenticação.

### Pedidos

- Criação, consulta e edição de pedidos.
- Cancelamento com e sem reposição de estoque.
- Controle e movimentação de estoque.
- Validação de disponibilidade dos produtos.
- Integridade das transações.
- Pedidos realizados via QR Code.
- Geração de registros de impressão.

### Solicitação de conta

- Solicitação pelo cliente e pelo painel administrativo.
- Atualização do status do atendimento.
- Geração de impressão da conta.
- Prevenção de solicitações duplicadas.
- Bloqueio de novos pedidos.
- Requisições simultâneas.

### Pagamentos e fechamento

- Fechamento do atendimento.
- Cálculo e isenção da taxa de serviço.
- Múltiplas formas de pagamento.
- Cálculo de troco.
- Validação dos valores pagos.
- Prevenção de pagamentos duplicados.
- Liberação da mesa.
- Reabertura de atendimento.
- Concorrência de operações.

## 8. Executando os testes

### Pré-requisitos

- Node.js 22.
- npm.
- Docker.
- Docker Compose.

Todos os comandos devem ser executados na raiz do projeto. Se o `.env` ainda não existir, crie-o com `cp -n .env.example .env`.

### Instalar as dependências

```bash
npm ci
```

### Gerar o Prisma Client

```bash
npm run prisma:generate
```

### Inicializar o banco de testes

```bash
npm run db:test:up
```

### Executar os testes de integração

```bash
npm run test:integration
```

### Visualizar os logs do banco

```bash
npm run db:test:logs
```

### Encerrar o ambiente de testes

```bash
npm run db:test:down
```

## 9. Comandos de validação

| Comando | Finalidade |
|---|---|
| `npm run build:backend` | Compilar o backend |
| `npm run lint:backend` | Validar tipagem e formatação |
| `npm run test:backend` | Executar a suíte convencional do backend |
| `npm run test:integration` | Executar os testes de integração |
| `npm run db:test:up` | Inicializar o banco de testes |
| `npm run db:test:down` | Encerrar o banco de testes |
| `npm run db:test:logs` | Visualizar os logs do banco |

## 10. Integração contínua (CI)

Os testes de integração fazem parte do pipeline do GitHub Actions.

O job de integração é responsável por:

1. Configurar o Node.js.
2. Instalar as dependências.
3. Gerar o Prisma Client.
4. Inicializar o banco de testes.
5. Executar os testes de integração.
6. Exibir os logs do banco em caso de falha.
7. Encerrar o ambiente de testes.

O pipeline é acionado conforme as configurações de push e pull request das branches `develop` e `main`.

## 11. Boas práticas

- Utilizar exclusivamente o banco de testes.
- Manter os testes independentes.
- Evitar dependências entre cenários.
- Reutilizar helpers e fixtures.
- Remover os registros criados durante os testes.
- Validar respostas HTTP e persistência.
- Testar cenários de sucesso e de erro.
- Verificar a integridade das transações.
- Executar as validações antes de abrir um Pull Request.

## 12. Considerações finais

Os testes de integração fazem parte da estratégia de qualidade e estabilização do MesaFlow, contribuindo para a confiabilidade, manutenção e evolução segura do sistema.