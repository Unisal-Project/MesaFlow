# Componentes MesaFlow

Componentes React em TypeScript organizados por domínio do design system:

- `buttons`: quadro 04 — ações, ícones e quantidade.
- `inputs`: quadro 05 — input, textarea e select.
- `forms`: quadro 06 — controles, menu, abas, breadcrumb, paginação e dica.
- `cards`: quadro 07 — produto, pedido, mesa e estatística.
- `status`: quadro 08 — etiquetas de status.
- `navigation`: quadro 09 — navegação de cliente e administrativo.
- `restaurant`: quadro 10 — carrinho, andamento do pedido e mesas.
- `feedback`: quadro 11 — modal, toast, alerta e estados de carregamento.

Use o ponto único de importação:

```tsx
import { Button, ProductCard, Badge } from "./components";
```

Os componentes utilizam os tokens de `global.css` e seus estilos portáveis estão em `src/styles/components.css`. Em uma aplicação React, importe os dois arquivos na entrada antes de renderizá-los:

```tsx
import "./global.css";
import "./styles/components.css";
```
