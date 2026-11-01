# Backend — OrderFlow API

API REST desenvolvida com **Fastify** e **Prisma ORM**, conectada ao MariaDB via Docker Compose.

## Stack

- [Fastify](https://fastify.dev/) — framework HTTP rápido para Node.js
- [Prisma](https://www.prisma.io/) — ORM e migrations
- [MariaDB](https://mariadb.org/) — banco de dados relacional
- TypeScript

## Estrutura

```text
backend/
├── prisma/          # Schema e migrations do Prisma
├── src/             # Código-fonte da API
│   ├── generated/   # Client gerado pelo Prisma (ignorado pelo git)
│   └── ...
├── .env.example     # Variáveis de ambiente de exemplo
├── tsconfig.json
└── package.json
```

## Configuração

Copie o arquivo de ambiente e ajuste as variáveis:

```bash
cp .env.example .env
```

## Scripts

| Comando               | Descrição                          |
|-----------------------|------------------------------------|
| `npm run dev`         | Inicia o servidor em modo dev      |
| `npm run build`       | Compila o TypeScript               |
| `npm run start`       | Inicia a versão compilada          |

> Para subir o banco e gerar o client do Prisma, use os scripts globais do monorepo na raiz do projeto.

## Autenticação e usuários

- `POST /api/v1/auth/register`: recebe `name`, `email` e `password`; cria uma conta `EMPLOYEE` e retorna `user` e `accessToken`.
- `POST /api/v1/auth/login`: recebe `email` e `password`; retorna `user` e um JWT válido por 8 horas.
- `GET /api/v1/users`, `GET /api/v1/users/:id`, `PATCH /api/v1/users/:id` e `DELETE /api/v1/users/:id`: exigem `Authorization: Bearer <accessToken>` de um `ADMIN` ativo. `DELETE` desativa o usuário e preserva seu histórico. Novos usuários são criados por `POST /api/v1/auth/register`. Login e registro aceitam até 5 tentativas por IP e rota a cada minuto.

O cadastro público não aceita `role` nem `active`. Para criar o primeiro administrador, cadastre uma conta e atribua `ADMIN` ao seu papel diretamente no banco de dados por um operador autorizado. As respostas nunca incluem o hash da senha.
