# Briefing MF-38 — Integração da tela de admin (para coordenação no Maestri)

Branch: `feature/MF-38-tela-admin` · Base: `develop` · Data: 2026-11-11

## 1. Estado atual

- **Merge feito** (`0a25841`): `origin/develop` (PR #67, "camada de comunicação do
  frontend com a API") entrou na branch. Agora **toda chamada ao backend passa por
  `frontend/src/api/client.ts`**:
  - `apiRequest<T>(path, options)`: JSON. `apiRequestBlob(path)`: arquivos (QR Code).
  - Os dois usam `sendRequest`, que injeta o `Bearer` token, troca falha de rede por
    mensagem amigável e faz logout + redireciona para `/login` quando a API responde 401
    (exceto em `/auth/*`).
  - Erros HTTP viram `ApiError` com `status` e `data`.
  - `assetUrl()` monta a URL de `/uploads/...` servido pelo backend.
- Correção feita no merge: o PR #67 tinha movido o `.env.example` para a raiz com
  `VITE_BACKEND_URL`, variável que ninguém lê. Voltou para `frontend/.env.example` com
  `VITE_API_URL`.
- Telas de admin integradas, sem mocks: Login, Dashboard, Mesas (QR real), Categorias,
  Produtos (com upload de imagem), Pedidos (com débito de estoque), **Relatórios**.
- Relatórios (commit `dfeec86`): `GET /api/v1/reports/sales` +
  `useReports` consumindo a API. Ajustes feitos agora: limpa o erro antigo ao iniciar
  um novo carregamento e o BOM do CSV voltou a ser `﻿`.
- Verificação: `tsc` do frontend e do backend sem erros. Testes: backend 49/51 e
  frontend 57/57. O único teste que falha (`products.domain.test.ts`) já falhava antes do
  merge, por falta de variáveis de ambiente (`JWT_SECRET`, `FRONTEND_URL`).

## 2. Code review — achados (do mais grave ao menos grave)

| # | Gravidade | Onde | Problema | Correção sugerida |
|---|---|---|---|---|
| 1 | **Alta (segurança)** | `backend/src/shared/api-access.ts` (`POST /auth/register` é pública) + nenhuma rota checa `role` | Qualquer pessoa cria uma conta (EMPLOYEE), recebe token e acessa **todas** as rotas do admin: CRUD de produtos e categorias, cancelar pedidos, fechar contas, relatórios. No front, `RequireAuth` só verifica se existe sessão. | Tirar `/auth/register` das rotas públicas (ou exigir ADMIN). Definir quais rotas exigem ADMIN e checar `request.user.role`. |
| 2 | Média | `report.service.ts` (`payment.method ?? "CASH"`) | Pagamentos de `confirmFullPayment` (fluxo do QR) são gravados **sem `method`**, e o relatório os conta como "Dinheiro". Isso distorce "Forma de pagamento mais usada". | Agrupar como "Não informado", ou gravar a forma no fluxo do QR. |
| 3 | Média | `report.service.ts` (receita = soma de `payments.amount`) | A receita **inclui a taxa de serviço**, então o ticket médio fica inflado em ~10%. A taxa também aparece separada, em "Taxa de serviço arrecadada". | Decidir a regra: receita bruta ou líquida da taxa. Documentar em `MESAFLOW_BUSINESS_RULES.md`. |
| 4 | Média | `prisma-admin-order.repository.ts` `replaceItems`/`createForTable` | `moveStock` atualiza os produtos na ordem em que aparecem. Dois pedidos simultâneos com os mesmos produtos em ordem inversa podem dar **deadlock** no Postgres, e um deles volta como erro 500. | Ordenar os `productId` (crescente) antes de mexer no estoque. |
| 5 | Baixa | `useOrder.ts` `reload` | `selectedOrderId` mantém o id de um pedido que foi cancelado e sumiu da lista. | No `reload`, se o id atual não estiver na lista, cair para `list[0]`. |
| 6 | Baixa | `useOrder.ts` / `useTables.ts` | A lista só é carregada uma vez. Pedidos novos feitos pelo QR não aparecem sem recarregar a página. | Polling leve (ex.: 15 s com `AbortController`) ou um botão "Atualizar". |
| 7 | Baixa | `useReports.ts` `methodLabels[...]` | Uma forma de pagamento desconhecida aparece como `"undefined (x%)"`. | Usar o código bruto como fallback: `?? topMethod[0]`. |
| 8 | Baixa | `report.service.ts` `localMidnight` | Usa um `tzOffset` fixo para o período todo e não trata horário de verão. Hoje não afeta o Brasil, mas vale anotar. | Aceitar por enquanto e documentar. |
| 9 | Higiene | `develop-packages-backup.tar.gz` (commit `004a7d6`) | Um arquivo binário de backup foi commitado no repositório. | Remover do git e colocar no `.gitignore` antes do PR. |
| 10 | Higiene | `backend/tests/products.domain.test.ts` | A suíte quebra sem `.env`. | Definir variáveis padrão de teste (ex.: no script `test:backend`). |

## 3. Tarefas para os agentes

Cada tarefa mexe em um conjunto de arquivos separado. Duas tarefas nunca editam o mesmo
arquivo ao mesmo tempo.

| Tarefa | Arquivos | Pronto quando |
|---|---|---|
| ~~**A — Commit dos Relatórios**~~ ✅ **feito** (`dfeec86`) | `backend/src/modules/reports/*`, `backend/src/server.ts`, `backend/tests/reports.test.ts`, `frontend/src/pages/admin/Reports/*`, `frontend/src/services/orders.service.ts`, `frontend/tests/reports.test.mjs`, `Table/components/TableQr.tsx` | Commit criado e os testes de reports passando |
| **B — Segurança (achado 1)** | `backend/src/shared/api-access.ts`, módulos de rotas do backend, `frontend/src/routers/AppRouter.tsx` | Teste mostra que `register` não é público e que um EMPLOYEE leva 403 nas rotas de ADMIN |
| **C — Relatórios (achados 2, 3, 7)** | `backend/src/modules/reports/*`, `frontend/src/pages/admin/Reports/hooks/useReports.ts` | Testes cobrindo método nulo e a regra de receita escolhida |
| **D — Estoque (achado 4)** | `backend/src/modules/orders/*` | Ids ordenados e um teste novo em `admin-orders.test.ts` |
| **E — Pedidos no front (achados 5, 6)** | `frontend/src/pages/admin/Order/hooks/useOrder.ts`, `Table/hooks/useTables.ts` | Testes em `orders-admin.test.mjs` |
| **F — Higiene (achados 9, 10)** | `.gitignore`, `package.json` (scripts de teste) | `.tar.gz` fora do repositório e `npm run test:backend` passando sem `.env` |

Ordem: **A** já está feita. Rodar **B**, **C**, **D**, **E** e **F**, **no máximo 2 ao mesmo
tempo**. Por fim, um revisor roda a suíte completa e abre o PR para `develop`.

## 4. Regras de RAM para o coordenador (obrigatórias)

A máquina tem 22 GB. O objetivo é **nunca passar de ~8 GB somando todos os agentes**.

1. **No máximo 2 agentes trabalhando ao mesmo tempo.** O coordenador cria os agentes
   em sequência, nunca em lote.
2. **Agentes não criam subagentes** (proibido usar a ferramenta Agent/Task dentro de um
   agente). Cada agente faz a própria leitura e escrita.
3. **Todo comando pesado roda com teto de memória via cgroup**:
   ```bash
   systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 <comando>
   ```
   Não usar `ulimit -v`: ele quebra o bundler nativo do Vite (erro "Panic in async
   function").
4. **Testes sempre em série e focados**: `node --test-concurrency=1 --test-force-exit
   --test <arquivo>`. Cada agente roda só os testes que tocou. A suíte completa roda
   uma vez, no final, por um único agente.
5. **Nada de servidores em segundo plano esquecidos**: não deixar `vite`, `tsx watch` ou
   `npm run dev` rodando depois de terminar. Tudo com `timeout`.
6. Antes de criar um novo agente, o coordenador checa `free -h`. Se a memória
   "disponível" estiver abaixo de 8 GB, **espera** um agente terminar.
7. Cada agente faz **commits apenas na própria tarefa**, sem push. O push e o PR ficam
   com o coordenador no final.

## 5. Prompt pronto para o coordenador (copiar no Maestri)

> Você coordena a finalização da branch `feature/MF-38-tela-admin` em
> `/home/luis-filippe/VscodeProjects/MesaFlow`. Leia
> `docs/maestri-briefing-MF-38.md`. Execute as tarefas da seção 3 na ordem indicada,
> criando um agente por tarefa, **no máximo 2 ao mesmo tempo**, e obedecendo todas as
> regras de RAM da seção 4: nenhum agente cria subagentes; testes em série com
> `systemd-run ... MemoryMax=3G`; checar `free -h` antes de cada novo agente. Cada agente
> recebe só os arquivos da sua tarefa e o critério de pronto. Quando todos terminarem,
> rode a suíte completa uma vez e me apresente o resumo antes de qualquer push ou PR.
