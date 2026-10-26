# Publicação do MesaFlow

O Compose de produção usa Nginx como única entrada HTTP. Ele entrega o React compilado em `/`, encaminha `/api/v1/` e `/uploads/` para o Fastify pelo nome interno `backend:3333`, e mantém MariaDB sem porta publicada.

## Preparação

Copie `production.env.example` para `production.env`, gere senhas e JWT secret próprios e ajuste `FRONTEND_URL` para a origem pública exata, por exemplo `https://mesaflow.exemplo.com`. `DATABASE_URL` deve usar a mesma senha de `MARIADB_PASSWORD`; caracteres reservados na senha precisam estar codificados para URL.

```bash
docker compose --env-file production.env -f docker-compose.production.yml up --build -d
docker compose --env-file production.env -f docker-compose.production.yml ps
```

Para teste local, use `FRONTEND_URL=http://localhost` e acesse `http://localhost`. O endpoint `http://localhost/api/v1/health` verifica o encaminhamento até o backend.

## Como o proxy funciona

O navegador chama a mesma origem para página e API. Nginx escolhe a regra pela parte inicial do caminho. Em `/api/v1/`, `proxy_pass http://backend:3333` preserva a URL original e a encaminha pelo DNS interno do Docker. Em `/`, `try_files` busca o arquivo estático; quando a URL é uma rota do React, devolve `index.html`. O backend permite CORS apenas para a origem definida em `FRONTEND_URL`. Como o navegador usa a mesma origem neste deploy, as chamadas normais não dependem de CORS.

O Compose de desenvolvimento continua disponível com `docker compose up`. Seu Vite encaminha `/api/v1` e `/uploads` ao backend pela configuração de proxy de desenvolvimento.

## Antes de abrir na internet

A configuração atual escuta HTTP na porta 80. Configure domínio, certificado TLS e redirecionamento HTTPS antes de publicar. Implemente login, emissão de JWT e autorização nas rotas internas; o helper JWT existente ainda não está aplicado aos routers. Nginx impede acesso direto à porta `3333`, mas qualquer pessoa pode chamar os caminhos de API publicados pelo proxy. Faça backup regular do volume MariaDB e do volume de uploads.
