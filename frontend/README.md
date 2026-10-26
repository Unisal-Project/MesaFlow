# Frontend — MesaFlow

Aplicação React 19 com TypeScript, React Router 7, Vite 8 e Sass. A raiz da aplicação é `frontend/`.

## Organização

```text
src/
├── api/          # Cliente HTTP, URL da API e tratamento de respostas/erros
├── assets/       # Imagens e arquivos importados pelo código, processados pelo Vite
├── components/   # UI reutilizável, componentes de domínio e elementos de layout
├── contexts/     # Estado global: contexto, provider e hook de acesso ao carrinho
├── data/         # Dados estáticos ou mocks compartilhados entre funcionalidades
├── hooks/        # Hooks compartilhados entre páginas e layouts
├── layouts/      # Estruturas visuais das áreas administrativa e cliente
├── pages/        # Páginas e seus componentes, hooks, tipos, mocks e utilitários locais
├── routers/      # Rotas e composição das páginas
├── services/     # Operações de domínio e integrações, usando o cliente HTTP
├── styles/       # Estilos globais, tokens, temas e estilos base
└── utils/        # Funções puras compartilhadas
```

`public/` contém arquivos servidos diretamente por URL, sem importação. Use `assets/` para imagens que fazem parte dos módulos.

Mantenha os nomes das pastas em minúsculas e preserve `contexts/`, já adotado pelo projeto. Código usado por uma única página fica junto dela; promova para uma pasta compartilhada quando houver reutilização real. Evite que componentes compartilhados, services ou utils importem páginas. Imports entre áreas usam `@/`; imports internos da própria funcionalidade podem ser relativos. Tipos usam `import type`.

O fluxo é: página → hook/context → service → api. Componentes recebem dados e callbacks. Services não navegam nem renderizam mensagens. Utils não acessam rede ou estado React. Os estilos locais continuam próximos dos componentes e páginas.

O Context atende ao estado global atual. Não há dependência de Redux nem motivo para criar uma pasta vazia; avalie sua adoção quando existirem fluxos globais complexos que justifiquem esse custo.

## Configuração e comandos

Copie `.env.example` para `.env` quando precisar configurar a API. `VITE_API_URL` é a URL completa com `/api/v1`, sem barra final. Sem configuração, o cliente usa o protocolo e host da página na porta 3333. Variáveis `VITE_*` são públicas e não devem conter segredos.

Na raiz do repositório:

- `npm ci`: instala as dependências do monorepo pelo lockfile da raiz.
- `npm run dev:frontend`: inicia o servidor Vite.
- `npm run build:frontend`: verifica TypeScript e gera o bundle.
- `npm run lint`: executa Oxlint.
- `npm run test:frontend`: executa os testes do frontend.

O Docker também usa `frontend/` como contexto e origem do bind mount. As dependências declaradas cobrem React/roteamento, ícones, QR Code, fontes, TypeScript, Vite, lint e Sass. Atualizações de versões devem ser avaliadas separadamente; esta revisão preserva as versões existentes.

## Limites atuais da integração

A navegação principal do cliente usa `data/catalog.mock.ts`; confirmação de pedidos, acompanhamento e conta ainda têm dados ou ações demonstrativas. O botão de fechamento em `TableBill` confirma apenas na interface. Várias páginas administrativas também usam mocks locais. A existência de services não significa que todas as telas estejam conectadas ao backend.

O fluxo legado `TableEntry`/`ClientFlow` consulta o cardápio real e desabilita pedidos por QR. O hook legado do carrinho agora exige um atendimento real informado pelo chamador e bloqueia o envio quando não há identificação; o atendimento fixo foi removido. O backend já oferece rotas por token, que exigem integração própria com os dados do cliente. Autenticação e persistência desses fluxos precisam de revisão ao realizar essa integração.

Se `dist/assets` pertencer ao usuário do container, o build local pode falhar com `EACCES`. Ajuste a propriedade dos arquivos no ambiente. Para validar sem alterar esses arquivos, execute em `frontend/`: `npm run build -- --outDir /tmp/mesaflow-frontend-build`.
