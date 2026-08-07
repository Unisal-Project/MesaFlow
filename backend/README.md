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
