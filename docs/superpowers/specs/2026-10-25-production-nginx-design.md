# MesaFlow: deploy de produção com Nginx

## Objetivo

Publicar o MesaFlow atrás de um único ponto de entrada HTTP, sem expor diretamente o Fastify ou o MariaDB à internet.

## Arquitetura

O Docker Compose de desenvolvimento existente permanece inalterado. Um novo Compose de produção inicia quatro serviços na mesma rede Docker: Nginx, frontend, backend e MariaDB. Apenas o Nginx publica portas no host.

```
Navegador -> Nginx -> arquivos React
                  -> /api/v1/* -> backend:3333
                  -> /uploads/* -> backend:3333
backend -> database:3306
```

O Nginx entrega os arquivos estáticos gerados pelo Vite e age como proxy reverso. Para cada requisição iniciada em `/api/v1/` ou `/uploads/`, ele encaminha a requisição pela rede privada do Docker ao serviço `backend`. Os nomes de serviço do Compose funcionam como DNS interno; `backend:3333` não é um endereço público.

## Componentes

- `nginx/default.conf`: serve a SPA, encaminha API e uploads, repassa cabeçalhos de origem e suporta rotas do React por meio de `try_files`.
- `nginx/Dockerfile`: constrói o frontend em múltiplos estágios e inclui apenas o build estático e a configuração Nginx na imagem final.
- `backend/Dockerfile.production`: instala dependências de produção, gera o Prisma Client, compila TypeScript e inicia o Fastify compilado.
- `docker-compose.production.yml`: conecta os serviços em rede interna e expõe apenas a porta HTTP do Nginx.
- `production.env.example`: documenta variáveis obrigatórias sem armazenar credenciais reais.

## API e CORS

O frontend em produção usará a origem relativa `/api/v1`. Assim, a página e API são vistas pelo navegador como `https://dominio`, evitando CORS no fluxo normal.

O backend continua com CORS estrito para desenvolvimento ou uma instalação com frontend separado. `FRONTEND_URL` será obrigatório e deverá apontar para a origem exata autorizada. Não haverá coringa (`*`) em produção.

As referências fixas a `localhost:3333` serão substituídas pelo módulo compartilhado `services/api.ts`, cujo valor padrão é `/api/v1`. Variáveis `VITE_API_URL` podem sobrescrever essa origem em desenvolvimento quando necessário.

## Segurança e limites

- O Compose de produção não terá mapeamento de portas para backend ou banco.
- Segredos serão fornecidos por `.env` não versionado, com exemplo sem valores reais.
- A configuração inicial expõe HTTP na porta 80. HTTPS será configurado depois que um domínio e certificados estiverem disponíveis; a publicação pública exige essa etapa.
- Nginx não substitui autenticação. Login, JWT e autorização por função devem proteger rotas de funcionários e administradores antes da publicação. Rotas de cardápio público somente serão abertas quando forem explicitamente projetadas como públicas.
- Swagger deve ser protegido ou desabilitado antes da publicação pública.

## Validação

1. Validar a sintaxe e interpolação do Compose de produção.
2. Construir as imagens de produção.
3. Subir a pilha com variáveis de desenvolvimento seguras para verificação local.
4. Confirmar que o frontend responde pelo Nginx e que `/api/v1/health` chega ao Fastify.
5. Confirmar que o host não possui portas publicadas para backend, banco ou frontend de desenvolvimento.

## Fora de escopo

Esta alteração não cria login, emissão de JWT, permissões por função, domínio, certificados TLS ou automação de renovação de certificados. Esses itens devem ser concluídos antes da abertura pública de recursos administrativos.
