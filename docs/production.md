# Publicação do MesaFlow

O Compose de produção usa Nginx como única entrada HTTP. Ele entrega o React compilado em `/`, encaminha `/api/v1/` e `/uploads/` para o Fastify pelo nome interno `backend:3333`, e mantém MariaDB sem porta publicada.

## Preparação

Copie `production.env.example` para `production.env`, gere senhas e um `JWT_SECRET` próprio com pelo menos 32 bytes aleatórios (`openssl rand -base64 48`; em produção o backend não inicia com segredo curto ou de exemplo) e ajuste `FRONTEND_URL` para a origem pública exata, por exemplo `https://mesaflow.exemplo.com`. `DATABASE_URL` deve usar a mesma senha de `MARIADB_PASSWORD`; caracteres reservados na senha precisam estar codificados para URL.

```bash
docker compose --env-file production.env -f docker-compose.production.yml up --build -d
docker compose --env-file production.env -f docker-compose.production.yml ps
```

Para teste local, use `FRONTEND_URL=http://localhost` e acesse `http://localhost`. O endpoint `http://localhost/api/v1/health` verifica o encaminhamento até o backend.

## Valkey (limite de tentativas de login)

O backend usa o Valkey do Compose (`VALKEY_URL=redis://valkey:6379`, já definido em `docker-compose.production.yml` e `docker-compose.yml`) para contar as tentativas em `/auth/login`, `/auth/register`, `/auth/password` e `/auth/me`: 5 por minuto por IP e rota, com chaves `mf:v1:ratelimit:<rota>:<ip>`. Assim o limite vale para todas as instâncias e sobrevive a reinícios do backend. `VALKEY_URL` é opcional (se definida, precisa ser `redis://` ou `rediss://`). Sem ela, ou com o Valkey fora do ar, o backend não cai: o limite passa a ser contado em memória, por processo, e um aviso aparece no log no máximo 1 vez por minuto. O Valkey não publica porta: só a rede interna do Compose o acessa.

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
for f in product-categories tables-attendance-status qr-ordering-payment waiter-calls admin-panel-columns product-track-stock promotions product-images product-featured restaurant-settings remove-order-tracking user-token-version product-category-nullable; do
  $DC exec -T database sh -c "$SQL" < backend/prisma/sql/$f.sql || break
done

# 5. Publicar e verificar
$DC up --build -d
curl -fsS http://localhost/api/v1/health   # {"status":"ok"}
```

`admin-panel-columns.sql` só adiciona colunas (`seats`, `service_fee` e detalhes de pagamento), `product-track-stock.sql` só adiciona `products.track_stock` (padrão `TRUE`, produtos existentes continuam com estoque controlado) `promotions.sql` só adiciona as colunas `promo_*` em `products` e `categories` (promoção desligada por padrão) e `product-images.sql` só adiciona `image_url_2`/`image_url_3` em `products` (fotos extras; `image_url` segue como capa); `product-featured.sql` adiciona `products.featured` com padrão `FALSE` (destaque escolhido pelo admin). Aplique esse incremental antes de publicar o backend; a versão anterior ignora as novas colunas. `remove-order-tracking.sql` preserva pedidos e cancelamentos e converte os antigos estados de preparo (`PREPARING`, `READY`, `DELIVERED`) para `PENDING`; essa conversão só é desfeita restaurando o backup.

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


`user-token-version.sql` só adiciona `users.token_version` (padrão 0): tokens emitidos antes, sem a versão, continuam valendo até expirar ou até o primeiro logout/troca de senha do usuário; a versão anterior do backend ignora a coluna.

`product-category-nullable.sql` deve ser executado por último, antes de publicar a versão que exclui categorias com produtos inativos. Apenas permite NULL em `products.category_id`, mantendo a FK RESTRICT. Pode ser reexecutado; não remove produtos nem pedidos. O backend continua exigindo categoria para criar, editar ou reativar produtos. Depois que houver históricos sem categoria, não reverta a coluna para NOT NULL sem primeiro atribuir uma categoria a esses inativos.


## Build da API na mesma origem

O estágio frontend de `nginx/Dockerfile` define `ARG VITE_API_URL=/api/v1` e exporta a variável antes do build. Vite incorpora essa configuração no bundle; mudar só o ambiente do container Nginx depois do build não a altera. `frontend/src/api/client.ts` concatena `/api/v1` com os endpoints; `assetUrl` resolve `/uploads/...` contra `window.location.origin`, sem porta externa 3333. URLs absolutas de imagens são preservadas.

## Ativar HTTPS

Esta configuração está **preparada, mas desligada**: o arquivo ativo continua `nginx/default.conf` HTTP. Não publique sem escolher domínio e obter certificado válido.

1. Aponte os registros DNS A/AAAA do domínio para o servidor (remova AAAA se não houver IPv6 funcional). Libere TCP 80 e 443. Ajuste `FRONTEND_URL` para `https://SEU_DOMINIO` e reconstrua/reinicie o backend para atualizar CORS.
2. Instale Certbot pelo gerenciador oficial do sistema. Crie `/var/www/certbot` no host e exponha esse diretório no Nginx como somente leitura. No servidor HTTP ativo, adicione `location /.well-known/acme-challenge/ { root /var/www/certbot; }` e monte o mesmo caminho no container. Verifique pelo domínio um arquivo de teste nesse diretório antes de solicitar o certificado.
3. No host, emita com Let's Encrypt: `sudo certbot certonly --webroot -w /var/www/certbot -d SEU_DOMINIO`. Não ative o bloco 443 antes de existirem `fullchain.pem` e `privkey.pem`.
4. Copie `nginx/default.ssl.conf.example` para uma configuração própria. Substitua **todas** as ocorrências de `mesaflow.example.com` pelo domínio real. Monte `/etc/letsencrypt` inteiro como somente leitura (os certificados em live são links para archive), monte `/var/www/certbot` e publique a porta 443 no serviço nginx do Compose. Substitua o arquivo ativo pela configuração preparada só nesta etapa. Mantenha os proxies `/api/v1/` e `/uploads/` e o fallback SPA do exemplo.
5. Valide antes de recarregar: `nginx -t` no ambiente que tem os certificados e o DNS interno backend disponíveis. Depois recarregue Nginx. Verifique HTTP→HTTPS, certificado/cadeia, `/api/v1/health`, login e imagens `/uploads/`. O redirect usa domínio fixo, sem confiar no Host recebido.
6. O exemplo envia HSTS (um ano, sem includeSubDomains/preload), CSP mesma origem, nosniff, Referrer-Policy e X-Frame-Options. Só habilite HSTS quando HTTPS estiver funcional; navegadores podem mantê-lo mesmo depois de rollback. A CSP permite estilos inline usados pelo app e imagens locais/data/blob. Se o restaurante usar imagens de CDN externa, autorize explicitamente o domínio em img-src após teste; não abra todos os domínios.
7. Ative o timer de renovação do Certbot no host. Teste `sudo certbot renew --dry-run`; configure um deploy-hook que valide e recarregue o Nginx do serviço após a renovação. O caminho ACME na porta 80 precisa continuar acessível. Monitore a expiração; faça backup protegido das chaves e limite acesso aos certificados. Nunca copie chaves privadas para o repositório ou para a imagem.

Os comandos de emissão/renovação e mudanças de portas/montagens são passos futuros do operador; não foram executados nesta tarefa. Sem domínio, não há certificado nem TLS ativo.
