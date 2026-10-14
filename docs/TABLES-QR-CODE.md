# QR Code das mesas

Cada mesa recebe um token aleatório persistente ao ser criada. Editar o nome,
número ou ativação preserva o token e o QR impresso. O schema já contém
`restaurant_tables.qr_token` obrigatório e único; esta entrega não exige migration.
Mesas existentes conservam seus tokens.

## Configuração

- Backend: `FRONTEND_URL` deve apontar para a origem pública do frontend,
  por exemplo `https://menu.seurestaurante.com`.
- Frontend: `VITE_API_URL` pode definir a URL completa da API, incluindo
  `/api/v1`. Sem essa variável, usa o hostname da página e a porta 3333.
- No celular, `localhost` aponta para o próprio celular. Para testar na rede
  local, configure `FRONTEND_URL=http://<IP-do-computador>:5173`, acesse o
  frontend por esse endereço e mantenha a API acessível na porta 3333.
- Em produção, o host do frontend precisa servir `index.html` para `/cardapio`.

## Contrato

- `POST /api/v1/tables`: recebe `number`, `name`, `active` e gera o token.
- `GET /api/v1/tables`: retorna mesas reais, `menuUrl` e status derivado do
  atendimento ativo. IDs são strings para preservar a precisão de BigInt.
- `GET /api/v1/tables/:id/qrcode`: retorna PNG da URL
  `<FRONTEND_URL>/cardapio?mesa=<token>`, com margem para impressão.
- `GET /api/v1/tables/by-token/:token`: consulta pública que retorna apenas
  `id`, `number`, `name`. Token desconhecido ou mesa inativa retorna 404.

A interface administrativa permite cadastrar, editar, desativar e excluir
mesas, visualizar e baixar seus QR Codes. Exclusão de mesa com histórico é
recusada pelo backend; use desativação. O token identifica a mesa e não é
comprovação da presença física do cliente.

Ao acessar o QR, o frontend valida o token antes de abrir o cardápio e mantém
a identificação visível na navegação. Recarregar a página valida novamente
o token presente na URL. O QR não abre nem cria atendimentos.

## Limite do escopo

O fluxo de pedidos ainda utiliza um atendimento fixo no código existente.
Por isso, a confirmação está bloqueada no fluxo acessado por QR, com aviso
para solicitar ao atendente. A futura integração com `attendance` deve
resolver o atendimento da mesa e substituir esse valor fixo. Nenhum serviço
de pedidos ou atendimentos foi alterado nesta entrega.

## Verificação

Testes com repositório em memória e requisições Fastify via `inject`:

```sh
node --import tsx backend/tests/tables.test.ts
```

Verificação manual com banco/API rodando:

1. Cadastre duas mesas na tela administrativa.
2. Abra e baixe o QR de cada mesa; escaneie com o celular.
3. Confirme que o cardápio exibe o número correspondente e persiste ao recarregar.
4. Renomeie a mesa e confirme que o QR anterior continua válido.
5. Desative a mesa; um novo acesso pelo QR deve ser recusado.
6. Tente um token inexistente e confirme que não abre o cardápio.
