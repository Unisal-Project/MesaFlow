# Checklist de JWT e permissões do backend

Este MVP deixa temporariamente rotas operacionais sem autenticação para permitir
o uso do terminal fixo atual. Antes de expor a API fora da rede confiável,
implemente os itens abaixo.

## Rotas que devem continuar públicas

- `GET /api/v1/tables/by-token/:token`
- `POST /api/v1/tables/by-token/:token/orders`
- `POST /api/v1/tables/by-token/:token/request-closing`
- Leituras de cardápio/produtos exigidas pelo frontend público.

Essas rotas devem receber limite de requisições por IP/token e nunca podem
aceitar IDs de atendimento enviados pelo cliente como autoridade de acesso.

## Rotas que precisam de JWT

- CRUD de mesas e `PATCH /tables/:id/status`.
- Gestão de atendimentos e pedidos internos.
- `POST /attendances/:attendanceId/confirm-payment`.
- Endpoints de dashboard, relatórios e fila de impressão.
- Produtos, categorias, estoque e qualquer operação administrativa.

## Sequência recomendada

1. Criar login que emita JWT contendo `sub` (ID do usuário) e `role`.
2. Registrar o hook `authenticate` já existente em `src/shared/authenticate.ts`
   nas rotas internas, sem aplicá-lo ao grupo público de QR.
3. Criar guardas por papel: funcionário para atendimento/pedidos, caixa ou
   administrador para pagamento e dashboard, administrador para cadastros.
4. Ao confirmar pagamento, gravar o usuário do JWT em `payments.created_by`
   e `attendances.closed_by` na mesma transação.
5. Responder `401` para token ausente/inválido e `403` para papel insuficiente.
6. Adicionar testes Fastify para os casos 401, 403 e autorização válida de cada
   rota interna.
7. Adicionar rate limit às rotas públicas de QR e registrar tentativas inválidas
   sem registrar o token completo em logs.

## Regra de segurança

O token do QR identifica a mesa; ele não autoriza operações administrativas,
financeiras ou leitura de informações de outras mesas.
