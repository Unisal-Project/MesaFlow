# Design System MesaFlow

A entrada global é `main.scss`, importada uma vez em `src/main.tsx`, antes de `App`.
Os estilos de páginas e notificações permanecem próximos de seus componentes.
A migração preserva seletores, ordem da cascata, breakpoints, dimensões, animações
e comportamentos. As mudanças visuais se concentram em cores, tipografia, raios e elevação.

## Estrutura

```text
src/styles/
├── abstracts/
│   ├── _variables.scss     # Escalas estáticas internas
│   ├── _functions.scss     # Cálculo de espaçamento
│   └── _mixins.scss        # Regra de foco
├── base/
│   ├── _tokens.scss        # Escalas públicas, fontes e aliases existentes
│   ├── _reset.scss
│   ├── _fonts.scss         # Fontes locais com font-display: swap
│   ├── _typography.scss
│   └── _global.scss
├── components/
│   ├── _actions.scss
│   ├── _forms.scss
│   ├── _controls.scss
│   ├── _cards.scss
│   ├── _navigation.scss
│   ├── _feedback.scss
│   └── _responsive.scss
├── themes/
│   ├── _mesaflow.scss      # Identidade institucional
│   └── _semantic.scss      # Papéis visuais e estados independentes
└── main.scss
```

## Tokens e uso

| Grupo | Tokens principais |
| --- | --- |
| Institucionais | `--brand-primary: #244A3C`, `--brand-accent: #C76D4D`, `--brand-background: #F7F3EA`, `--brand-text: #252927`, `--brand-surface: #FFFEFB` |
| Superfícies | `--background`, `--surface`, `--surface-muted`, `--surface-hover`, `--overlay` |
| Texto e bordas | `--text-primary`, `--text-secondary`, `--text-placeholder`, `--text-inverse`, `--border`, `--border-strong`, `--border-hover` |
| Ações | `--action-primary`, `--action-primary-hover`, `--action-primary-active`, `--on-primary`, `--action-secondary`, `--action-secondary-text`, `--action-secondary-hover`, `--accent`, `--on-accent` |
| Estados | `--success`, `--warning`, `--error`, `--info`, variantes de texto, fundo sutil e borda; `--status-closing` preserva a distinção do fechamento de mesa |
| Interação | `--disabled`, `--disabled-background`, `--disabled-opacity`, `--hover`, `--focus`, `--focus-ring`, `--selected-background`, `--selected-border`, `--control-track` |
| Espaçamento | `--spacing-0` a `--spacing-16`: 0 a 64px em incrementos de 4px |
| Raios | `--radius-small: 6px`, `--radius-medium: 10px`, `--radius-large: 16px`, `--radius-xl: 24px`, `--radius-full: 9999px` |
| Elevação | `--elevation-1` (cards), `--elevation-2` (menus), `--elevation-3` (modais) |
| Tipografia | `--font-display`, `--font-heading`, `--font-body`, `--font-size-xs` a `--font-size-7xl`, pesos de 400 a 800, alturas de linha de título e corpo |

O catálogo completo de cores está em `themes/_semantic.scss`; as escalas estão em
`base/_tokens.scss` e `abstracts/_variables.scss`. Cores fixas ficam apenas nos temas.
Os gradientes decorativos de alimentos usam `--illustration-*`, separados dos estados.

Bricolage Grotesque aparece nos títulos de destaque (`h1`); Manrope nos demais títulos,
navegação e controles; DM Sans no corpo e nos textos de leitura. A escala de fontes
é 12, 14, 16, 18, 20, 24, 28, 32, 36, 40 e 48px. Ajustes locais de tamanho e espaçamentos
fora da escala foram mantidos quando já existentes, para evitar um redesign de páginas.
Novas regras devem preferir a escala. As fontes variáveis incluem o subconjunto latino,
com acentos do português, e são empacotadas como WOFF2 locais.

Aliases existentes continuam disponíveis: `--primary`, `--primary-dark`, `--text`,
`--radius-card`, `--radius-control`, `--shadow-soft`, `--shadow`, `--shadow-large` e
`--space-1` a `--space-6`. Atenção: `--space-5` continua sendo **24px** e `--space-6`,
**32px**. Na nova escala, `--spacing-5` vale **20px** e `--spacing-6`, **24px**.

## Extensão futura por estabelecimento

Use CSS Custom Properties para valores que precisam variar em tempo de execução.
Variáveis e funções Sass ficam restritas às escalas estáticas e recursos internos.
Os aliases semânticos são declarados em `:root, [data-theme]` para serem recalculados
no limite do tema, inclusive quando a marca é sobrescrita em um contêiner.

Um tema futuro pode adicionar, depois da entrada global:

```scss
[data-theme='restaurante'] {
  --brand-primary: #193f57;
  --brand-accent: #c8a45c;
  --on-primary: #fffefb;
  --on-accent: #171a18;
}
```

O exemplo é apenas um contrato de extensão. A migração não adiciona estado,
seletor de tema, persistência ou API.
Estados operacionais não derivam das cores institucionais. Ao criar um tema, valide
os pares de contraste; mudar uma cor de marca não garante contraste automaticamente.
Para modais em portais, o escopo do tema deverá incluir também o destino do portal.

## Arquivos migrados

Caminhos relativos a `src/`:

| CSS original | Destino |
| --- | --- |
| `index.css` | `styles/main.scss`, `styles/base/*`, `styles/themes/*` e `styles/abstracts/*` |
| `styles/components.css` | `styles/components/_actions.scss`, `_forms.scss`, `_controls.scss`, `_cards.scss`, `_navigation.scss`, `_feedback.scss`, `_responsive.scss` |
| `components/domain/notifications/style.css` | `components/domain/notifications/style.scss` |
| `pages/admin/Categories/styles.css` | `pages/admin/Categories/styles.scss` |
| `pages/admin/Dashboard/styles.css` | `pages/admin/Dashboard/styles.scss` |
| `pages/admin/Order/styles.css` | `pages/admin/Order/styles.scss` |
| `pages/admin/Products/styles.css` | `pages/admin/Products/styles.scss` |
| `pages/admin/Table/styles.css` | `pages/admin/Table/styles.scss` |
| `pages/client/Cart/styles.css` | `pages/client/Cart/styles.scss` |
| `pages/client/ConfirmOrder/styles.css` | `pages/client/ConfirmOrder/styles.scss` |
| `pages/client/Home/styles.css` | `pages/client/Home/styles.scss` |
| `pages/client/Menu/styles.css` | `pages/client/Menu/styles.scss` |
| `pages/client/OrderSuccess/styles.css` | `pages/client/OrderSuccess/styles.scss` |
| `pages/client/OrderTracking/styles.css` | `pages/client/OrderTracking/styles.scss` |
| `pages/client/ProductDetail/styles.css` | `pages/client/ProductDetail/styles.scss` |
| `pages/client/TableBill/styles.css` | `pages/client/TableBill/styles.scss` |

## Dependências

- Desenvolvimento: `sass ^1.106.1`.
- Fontes locais: `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/manrope`
  e `@fontsource-variable/dm-sans`, todas `^5.3.0` (licença OFL-1.1).
- Atualizados os lockfiles npm da raiz e do frontend. O lockfile independente estava
  desatualizado em relação ao manifesto; sua sincronização também resolve as versões
  já declaradas de Vite e Lucide e suas dependências transitivas.
- Nenhuma biblioteca de componentes adicionada.

## Validação da migração — 22/10/2026

- TypeScript do frontend: `npm exec --workspace frontend/app -- tsc -b --pretty false`.
- Lint: `npm run lint`; aprovado com dois avisos anteriores em `useProductDetail.ts`
  (`react/set-state-in-effect` e `react-hooks/exhaustive-deps`).
- Testes: `npm test`; oito arquivos aprovados pelo runner. Não existe suíte própria
  do frontend. A integração com banco requer `RUN_TABLES_DB_TESTS=1` e não foi habilitada.
- Build: `npm run build`, incluindo backend e frontend. O primeiro build encontrou
  um Prisma Client local desatualizado; `npm run prisma:generate` resolveu a falha,
  sem editar schema, contratos ou código do backend e sem executar migrations.
- Compilação independente das 15 entradas SCSS (global, 13 páginas e notificações).
  A auditoria comparou a ordem de 896 seletores locais e 153 seletores compartilhados
  com o CSS anterior e preservou as declarações de layout e comportamento.
- Todas as 15 importações locais de estilo resolvidas; nenhum CSS antigo restante
  em `src/`, nenhuma cor hexadecimal fora dos temas e nenhuma referência a token indefinido.
- Duplicações: oito grupos de regras idênticas entre Cart, ConfirmOrder e ProductDetail
  (`.icon-button`, `.cart-button`, `.cart-button b`, `.bottom-navigation` e quatro regras
  de descendentes/estado). Mantidos para preservar a cascata e os pontos de importação;
  Menu também possui variantes de alguns desses seletores, com dimensões diferentes.
- Limitação visual: o `App.tsx` já renderizava apenas o título MesaFlow, sem montar as
  páginas. Não houve validação em navegador dos fluxos, modais ou responsividade.
  A integração das telas e sua revisão visual continuam necessárias antes de liberar
  a nova identidade. Rotas, estado, serviços e regras de negócio foram preservados.
