# Rotas do MesaFlow

A navegação usa React Router em modo declarativo com `BrowserRouter` e URLs reais, conforme a [documentação de rotas](https://reactrouter.com/start/declarative/routing). `App.tsx` renderiza apenas `AppRouter`.

## Organização

- `src/routers/AppRouter.tsx`: entrada, login, divisão admin/cliente e reposicionamento da rolagem entre páginas.
- `src/routers/AdminRoutes.tsx`: páginas administrativas, navegação para pedido por ID e hooks de estado compartilhados.
- `src/routers/ClientRoutes.tsx`: páginas do cliente, parâmetros de produto, contexto da mesa e callbacks de navegação.
- `src/routers/paths.ts`: endereços usados pelos controles de navegação e função que preserva a query string do cliente.
- `src/layouts/AdminWorkspace.tsx` e `ClientWorkspace.tsx`: `Outlet`, classes de contexto e estrutura visual. Não selecionam páginas nem mantêm estado de navegação.

## Endereços

| URL | Tela |
| --- | --- |
| `/` | Redireciona para login; com `?mesa=...`, para o cardápio do cliente |
| `/login` | Login e formulário de cadastro demonstrativo |
| `/admin` | Redireciona para dashboard |
| `/admin/dashboard` | Dashboard |
| `/admin/pedidos` | Lista de pedidos |
| `/admin/pedidos/:orderId` | Pedido selecionado; ID desconhecido volta para a lista |
| `/admin/mesas` | Mesas |
| `/admin/cardapio` | Produtos, prévia |
| `/admin/cardapio/produtos` | Todos os produtos |
| `/admin/cardapio/categorias` | Categorias, prévia |
| `/admin/cardapio/categorias/todas` | Todas as categorias |
| `/admin/relatorios` | Relatórios |
| `/cliente` | Boas-vindas do cliente |
| `/cardapio` | Cardápio do cliente e destino do QR Code |
| `/produto/:productId` | Detalhes de produto; ID desconhecido volta para o cardápio |
| `/carrinho` | Carrinho |
| `/confirmar-pedido` | Revisão e confirmação demonstrativa |
| `/acompanhar` | Acompanhamento demonstrativo |
| `/conta` | Conta da mesa |

Use `?mesa=<token>` em todas as URLs do cliente. Os callbacks do router preservam essa query string, incluindo a codificação do token. O produto é resolvido pelo ID no catálogo atual, permitindo abrir seus detalhes diretamente sem depender de um objeto selecionado na tela anterior.

## QR Code

O backend já gera `/cardapio?mesa=<qrToken>` em `table.service.ts`; esse contrato foi mantido, sem modificar o backend.

A prévia de QR no admin utiliza `table.menuUrl` quando fornecida. Para as mesas demonstrativas sem URL, gera um link `/cardapio?mesa=<numero>` na origem atual. A prévia abre o cliente, mas não cria atendimento real.

O parâmetro `mesa` é transportado na navegação. Esta alteração não resolve tokens em nomes/números de mesa por API, nem implementa envio real de pedidos, autenticação ou pagamentos. O catálogo e os atendimentos continuam demonstrativos.

O carrinho agora é armazenado por mesa (`mesaflow:cart:<token>`); abrir outro QR cria outro contexto de carrinho. Sem parâmetro de mesa, a chave anterior `mesaflow:cart` continua sendo usada. Dados administrativos permanecem em memória durante a visita ao admin. Nome do cliente e último pedido demonstrativo permanecem em memória durante a visita ao cliente.

## Histórico, rolagem e publicação

Os botões navegam pela History API; voltar/avançar do navegador acompanham as URLs. Trocas de tela voltam ao topo. A seleção de card em Pedidos preserva a rolagem realizada pelo próprio card até os detalhes.

Em produção, o servidor precisa devolver `index.html` para caminhos do frontend que não sejam arquivos existentes. Vite dev/preview já oferecem o fallback de SPA. Em Nginx, a regra equivalente é:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Mantenha as rotas da API separadas desse fallback. Configure a URL pública do frontend no backend para que o QR Code use um endereço acessível pelo celular; `localhost` aponta para o próprio aparelho.

## Validação

- `npm --prefix frontend test`: renderiza as definições reais de rotas com `MemoryRouter` e verifica os destinos diretos, produto por ID, categorias e preservação do token.
- `npm --prefix frontend run build`: TypeScript e bundle de produção.
- `npm --prefix frontend run lint` e `npm test`: lint do frontend e testes existentes do backend.

Os testes de renderização não executam os efeitos nem simulam gestos, foco ou histórico de um navegador real. Validar visualmente o fluxo completo no celular continua necessário.
