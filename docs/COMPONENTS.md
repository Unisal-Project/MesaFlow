# Componentes MesaFlow

Componentes React em TypeScript organizados por domínio do design system:

- `components/ui/buttons`: ações, ícones e quantidade.
- `components/ui/inputs`: campos de texto, textarea e select.
- `components/ui/forms`: checkbox, radio, switch e dropdown.
- `components/ui/navigation`: abas, categorias, breadcrumb e paginação.
- `components/ui/cards`: indicadores estatísticos.
- `components/ui/status`: etiquetas de status.
- `components/ui/feedback`: modal, toast, alerta, tooltip e carregamento.
- `components/ui/icons`: ícones com comportamento próprio.
- `components/layout`: navegação, cabeçalhos e barras compartilhadas.
- `components/domain/cards`: cartões de produto, pedido e mesa.
- `components/domain/restaurant`: carrinho, andamento do pedido e status de mesas.
- `components/domain/notifications`: notificações do atendimento.

Use o ponto único de importação:

```tsx
import { Button, ProductCard, Badge } from "./components";
```

Os componentes utilizam os tokens e estilos de `src/styles/main.scss`. Importe essa entrada uma única vez, antes de renderizá-los. As regras compartilhadas ficam em `src/styles/components/`; os estilos específicos permanecem junto às páginas e componentes.

```tsx
import "./styles/main.scss";
```


## Onde alterar cada parte

Os caminhos abaixo são relativos a `frontend/app/src`.

| Alteração desejada | Ponto de partida |
| --- | --- |
| Entrada, login e divisão entre admin e cliente | `routers/AppRouter.tsx` |
| Login, cadastro demonstrativo e validação das senhas | `pages/admin/Login/index.tsx` |
| Aparência do login e cadastro | `pages/admin/Login/styles.scss` |
| Rotas administrativas e estados compartilhados | `routers/AdminRoutes.tsx` |
| Endereços de navegação | `routers/paths.ts` |
| Contexto CSS de login, administrativo e cliente | `layouts/hooks/useDocumentClass.ts` e estilos de cada tela/layout |
| Rotas e pedidos demonstrativos do cliente | `routers/ClientRoutes.tsx` |
| Itens e ações da barra inferior do cliente | `components/layout/ClientTabBar.tsx` |
| Marcação compartilhada da navegação inferior | `components/layout/BottomNavigation.tsx` |
| Estado e ações de uma página | Diretório `hooks` próximo da página, quando existente |
| Comunicação com o backend | `services/` |
| Cores, fontes, espaçamentos e demais tokens | `styles/themes/`, `styles/base/_tokens.scss`, `styles/abstracts/` |

O login e o cadastro atuais são demonstrativos; não criam contas nem autenticam no backend. `App.tsx` renderiza `AppRouter`. A entrada `/` abre o login, e os links `/cardapio?mesa=...` abrem diretamente o cliente. Os layouts renderizam `Outlet` e aplicam somente o contexto visual.

`useDocumentClass` adiciona uma classe ao elemento `html` enquanto a tela está montada e a remove ao sair. Os estilos usam essa classe para controlar o contexto visual e a rolagem elástica. Cada contexto deve ser controlado por uma única instância montada.

O router administrativo mantém os hooks de mesas, pedidos, produtos e categorias acima das páginas roteadas, preservando esses dados durante a navegação. As páginas são montadas por rota, sem telas ocultas. `useAdminNavigation` foi removido; o histórico do navegador é controlado pelo React Router. O estado demonstrativo administrativo é reiniciado ao recarregar ou sair da área administrativa.

Ao editar estilos, preserve as classes e a ordem da cascata. Consulte `SCSS-REFACTOR.md` para detalhes sobre tokens, mixins e regras compartilhadas.

## Admin no celular

Até 820px, a própria `AdminSidebar` vira uma barra inferior com as cinco seções. As regras ficam em `layouts/adminWorkspace.scss`; o espaço inferior reservado evita que ela cubra o fim das páginas. Acima desse limite, permanece a navegação lateral.

Na tela de Mesas, a busca principal acompanha o cabeçalho fixo. A segunda busca é ocultada no celular e os filtros de status permitem rolagem horizontal. Os ajustes específicos ficam em `pages/admin/Table/styles.scss`.

Ao selecionar uma mesa, os detalhes exibem o pedido ativo mais recente associado ao atendimento, seus itens e o total. “Ver pedido” abre o fluxo completo de Pedidos. As etapas existentes continuam sendo solicitar a conta, aguardar pagamento e liberar a mesa. Na última etapa, enquanto existir pedido ativo, a ação leva ao pedido para receber o pagamento; depois do pagamento, volte a Mesas para liberar o atendimento. Se houver outros pedidos ativos, eles também precisam ser finalizados antes de liberar a mesa.

Esse fluxo continua demonstrativo, com estado em memória. A mudança de responsividade não conecta as operações às APIs nem persiste dados após recarregar a página.


O mapa completo das URLs, o formato do QR Code e a configuração de hospedagem estão em [ROUTING.md](ROUTING.md).
