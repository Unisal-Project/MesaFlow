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

O Compose de desenvolvimento continua disponível com `docker compose up`. Nele não há proxy: o Vite (`:5173`) não encaminha `/api/v1`, e o navegador chama a API direto em `http://<host>:3333/api/v1` (padrão de `frontend/src/api/client.ts` quando `VITE_API_URL` está vazio), por isso o CORS com `FRONTEND_URL` é necessário em desenvolvimento.

## Antes de abrir na internet

A configuração atual escuta HTTP na porta 80. Configure domínio, certificado TLS e redirecionamento HTTPS antes de publicar. As rotas de `/api/v1` exigem JWT por padrão (`requireApiAuthentication` em `backend/src/server.ts`); as exceções públicas e as rotas só de ADMIN estão em `backend/src/shared/api-access.ts`. Nginx impede acesso direto à porta `3333`, mas qualquer pessoa pode chamar os caminhos de API publicados pelo proxy. Faça backup regular do volume MariaDB e do volume de uploads.

## Atualização de banco existente

Em instalação nova, `mesaflow_schema_v1.sql` já cria tudo e nada abaixo é necessário. Em banco existente, o Compose de produção não reaplica o schema: rode os SQL incrementais de `backend/prisma/sql/` nesta ordem, antes de publicar a nova versão. Todos podem ser executados novamente sem apagar dados: só criam o que falta, e `remove-order-tracking.sql` só tem o que converter na primeira execução.

```bash
DC="docker compose --env-file production.env -f docker-compose.production.yml"
SQL='exec mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"'

# 1. Backup do banco (copie também o volume de uploads)
$DC exec -T database sh -c 'exec mariadb-dump -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" --single-transaction "$MARIADB_DATABASE"' > backup-$(date +%F-%H%M).sql

# 2. Incrementais antigos (se ainda não aplicados), 3. colunas do painel admin, controle de estoque opcional e promoções, 4. remoção do acompanhamento de preparo
for f in product-categories tables-attendance-status qr-ordering-payment waiter-calls admin-panel-columns product-track-stock promotions product-images restaurant-settings remove-order-tracking; do
  $DC exec -T database sh -c "$SQL" < backend/prisma/sql/$f.sql || break
done

# 5. Publicar e verificar
$DC up --build -d
curl -fsS http://localhost/api/v1/health   # {"status":"ok"}
```

`admin-panel-columns.sql` só adiciona colunas (`seats`, `service_fee` e detalhes de pagamento), `product-track-stock.sql` só adiciona `products.track_stock` (padrão `TRUE`, produtos existentes continuam com estoque controlado) `promotions.sql` só adiciona as colunas `promo_*` em `products` e `categories` (promoção desligada por padrão) e `product-images.sql` só adiciona `image_url_2`/`image_url_3` em `products` (fotos extras; `image_url` segue como capa); a versão anterior do backend as ignora. `remove-order-tracking.sql` preserva pedidos e cancelamentos e converte os antigos estados de preparo (`PREPARING`, `READY`, `DELIVERED`) para `PENDING`; essa conversão só é desfeita restaurando o backup.

Rollback: a versão anterior do backend funciona com o banco já atualizado. Para devolver o enum de pedidos ao formato antigo (sem recuperar os estados convertidos):

```sql
ALTER TABLE orders
    MODIFY COLUMN status ENUM('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';
```

Para voltar exatamente ao estado anterior, restaure o dump: `$DC exec -T database sh -c "$SQL" < backup-<data>.sql`.

A consulta pública de acompanhamento `GET /api/v1/tables/by-token/:token/orders` foi removida. O consumo da conta é consultado em `GET /api/v1/tables/by-token/:token/bill`, sem estados de preparo. O envio de pedidos continua em `POST /api/v1/tables/by-token/:token/orders`. A interface do cliente tem Cardápio, Carrinho e Conta; o chamado ao garçom fica em Conta.

## Fotos e miniaturas após o deploy

O Nginx aceita corpos de até 6 MB (`client_max_body_size 6m`), cobrindo os 5 MB do arquivo multipart no backend. O upload aceita JPG, PNG, WebP e AVIF; HEIC/HEVC não é suportado. A validação de AVIF exige formato HEIF com compressão AV1 no sharp. O servidor grava WebP de até 1200×1200 (quality 82) e uma miniatura de até 400×400 (quality 75), preservando proporção e sem ampliar fotos pequenas.

Depois de publicar esta versão, execute o script **dentro do container do backend**, onde o volume `product_uploads` está montado em `/app/backend/uploads`. Rodar no host não encontra as fotos e imprime `Miniaturas geradas: 0`:

```bash
$DC exec backend sh -c "cd /app && npm run images:thumbs"
```

O script usa Node 22 com suporte a `--experimental-strip-types`, sem depender do tsx (que é dependência de desenvolvimento e não existe na imagem de produção). O `Dockerfile.production` copia `backend/scripts` e mantém o `sharp` em produção. Ele percorre `backend/uploads/products`, cria somente os `*-thumb.webp` ausentes e pode ser repetido: não regrava miniaturas existentes nem processa miniaturas como originais. Faça o backup habitual do volume antes da atualização. A saída informa quantas miniaturas foram geradas; aguarde o término antes de validar as imagens antigas no admin.

A API deriva `thumbUrls` na mesma ordem de `imageUrls`, sem mudança no banco. Exclusão e substituição de uma foto removem as duas variantes. O admin usa miniaturas com fallback para a imagem original se a miniatura ainda não existir. O cardápio do cliente continua usando a imagem original nesta etapa.


`restaurant-settings.sql` cria a tabela de configuração única e insere id=1 com taxa padrão de 10% somente se a linha ainda não existir. Reexecutar não sobrescreve dados do restaurante nem a taxa já configurada. Aplique este SQL antes de publicar a versão que lê a taxa do banco; sem a linha, o fechamento retorna configuração indisponível, sem presumir uma taxa. Os atendimentos anteriores preservam `service_fee` já gravado. Não há rollback destrutivo: a versão anterior ignora esta tabela.
