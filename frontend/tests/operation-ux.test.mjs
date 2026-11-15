import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Componentes com o "react" trocado pelo hook-runtime: chamar o componente
// devolve a árvore de elementos e os onClick/onChange podem ser acionados.
const controlled = [
  "/Table/components/TableFormModal.tsx",
  "/Order/components/PaymentModal.tsx",
  "/Order/components/OrderEditPanel.tsx",
  "/Order/hooks/useOrder.ts",
];

let server, mods, createHookRunner;
const confirms = [];
let confirmAnswer = true;
const previous = {
  window: globalThis.window,
  document: globalThis.document,
  localStorage: globalThis.localStorage,
};

before(async () => {
  globalThis.window = {
    location: {
      protocol: "http:",
      hostname: "localhost",
      origin: "http://localhost:5173",
    },
    confirm: (message) => {
      confirms.push(message);
      return confirmAnswer;
    },
  };
  globalThis.localStorage = { getItem: () => null };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [
      {
        name: "controlled-operation-renders",
        enforce: "pre",
        transform(code, id) {
          if (controlled.some((path) => id.endsWith(path)))
            return code.replace(
              'from "react"',
              'from "/tests/helpers/hook-runtime.mjs"',
            );
        },
      },
    ],
  });
  const load = (path) => server.ssrLoadModule(path);
  mods = {
    table: await load("/src/pages/admin/Table/components/TableFormModal.tsx"),
    payment: await load("/src/pages/admin/Order/components/PaymentModal.tsx"),
    panel: await load("/src/pages/admin/Order/components/OrderEditPanel.tsx"),
    order: await load("/src/pages/admin/Order/hooks/useOrder.ts"),
    qr: await load("/src/pages/admin/Table/utils/table.utils.ts"),
    tableQr: await load("/src/pages/admin/Table/components/TableQr.tsx"),
    details: await load(
      "/src/pages/admin/Table/components/TableDetailsModal.tsx",
    ),
    dashboard: await load("/src/pages/admin/Dashboard/index.tsx"),
  };
  ({ createHookRunner } = await load("/tests/helpers/hook-runtime.mjs"));
});
after(async () => {
  await server?.close();
  Object.assign(globalThis, previous);
});

/** Primeiro elemento da árvore que satisfaz o predicado (sem renderizar filhos-componente). */
function find(node, predicate) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = find(child, predicate);
      if (hit) return hit;
    }
    return null;
  }
  if (!node || typeof node !== "object" || !node.props) return null;
  if (predicate(node)) return node;
  return find(node.props.children, predicate);
}
const byLabel = (label) => (node) => node.props["aria-label"] === label;

/** Cada caso: renderiza, fecha sem mudar (sem confirm), muda e fecha (confirm). */
async function assertDiscard({ render, closeLabel, change }) {
  let closed = 0;
  const run = createHookRunner(() => render(() => closed++));
  confirms.length = 0;
  find(run(), byLabel(closeLabel)).props.onClick();
  assert.equal(closed, 1, "sem alteração fecha direto");
  assert.equal(confirms.length, 0);

  change(run());
  confirmAnswer = false;
  find(run(), byLabel(closeLabel)).props.onClick();
  assert.deepEqual(confirms, ["Descartar alterações?"]);
  assert.equal(closed, 1, "recusar mantém aberto");

  confirmAnswer = true;
  find(run(), byLabel(closeLabel)).props.onClick();
  assert.equal(closed, 2, "confirmar descarta");
}

test("mesa: fechar com alterações pergunta antes de descartar", async () => {
  let form = { name: "Varanda", number: "5", seats: "4", active: true };
  await assertDiscard({
    render: (onClose) =>
      mods.table.TableFormModal({
        editingTableId: null,
        tableForm: form,
        setTableForm: (next) => {
          form = typeof next === "function" ? next(form) : next;
        },
        tables: [],
        error: "",
        busy: false,
        onClose,
        onSave() {},
        onDelete() {},
      }),
    closeLabel: "Fechar",
    change: () => {
      form = { ...form, seats: "6" };
    },
  });
});

test("pagamento: valor aceita vírgula e fechar com alterações pergunta", async () => {
  await assertDiscard({
    render: (onClose) =>
      mods.payment.PaymentModal({
        orderId: 1,
        total: 20,
        onClose,
        onComplete() {},
      }),
    closeLabel: "Fechar pagamento",
    change: (tree) =>
      find(tree, byLabel("Valor do pagamento 1")).props.onChange({
        target: { value: "10,50" },
      }),
  });
  const run = createHookRunner(() =>
    mods.payment.PaymentModal({ orderId: 1, total: 20, onClose() {}, onComplete() {} }),
  );
  const input = find(run(), byLabel("Valor do pagamento 1"));
  assert.equal(input.props.type, "text");
  assert.equal(input.props.inputMode, "decimal");
  // 20 + 10% de serviço, já no formato brasileiro.
  assert.equal(input.props.value, "22,00");
});

test("pedido: abre com a mesa escolhida e pede confirmação ao descartar", async () => {
  await assertDiscard({
    render: (onCancel) =>
      mods.panel.OrderEditPanel({
        mode: "create",
        tableId: "5",
        items: [],
        catalog: [],
        tableOptions: [{ id: "5", label: "Mesa 05" }],
        onCancel,
        onSave() {},
      }),
    closeLabel: "Fechar edição do pedido",
    change: (tree) =>
      find(tree, (node) => node.type === "textarea").props.onChange({
        target: { value: "sem pressa" },
      }),
  });
  const run = createHookRunner(() =>
    mods.panel.OrderEditPanel({
      mode: "create",
      tableId: "5",
      items: [],
      catalog: [],
      tableOptions: [{ id: "5", label: "Mesa 05" }],
      onCancel() {},
      onSave() {},
    }),
  );
  assert.equal(find(run(), (node) => node.type === "select").props.value, "5");
});

test("lançar pedido pela mesa pré-seleciona a mesa no novo pedido", () => {
  const run = createHookRunner(() => mods.order.useOrder([], []));
  let state = run();
  assert.equal(state.isCreatingOrder, false);
  state.setIsCreatingOrder(true, "7");
  state = run();
  assert.equal(state.isCreatingOrder, true);
  assert.equal(state.newOrderTableId, "7");
  state.setIsCreatingOrder(true);
  assert.equal(run().newOrderTableId, "");
  run().setIsCreatingOrder(false);
  assert.equal(run().isCreatingOrder, false);
});

test("PNG do QR leva 'Mesa NN' escrito abaixo do código", () => {
  const calls = [];
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) => (...args) => calls.push([key, ...args]),
      set: (_target, key, value) => {
        calls.push([`set ${String(key)}`, value]);
        return true;
      },
    },
  );
  globalThis.document = {
    createElement: () => ({ getContext: () => ctx }),
  };
  const qr = { width: 240, height: 240 };
  const out = mods.qr.withLabel(qr, mods.qr.qrLabel(5));
  assert.equal(out.width, 240);
  assert.equal(out.height, 288);
  assert.deepEqual(
    calls.find(([key]) => key === "fillText"),
    ["fillText", "Mesa 05", 120, 264],
  );
  assert.deepEqual(
    calls.find(([key]) => key === "drawImage"),
    ["drawImage", qr, 0, 0],
  );
});

const html = (component, props) =>
  renderToStaticMarkup(createElement(component, props));
const table = {
  id: "3",
  name: "Mesa 03",
  number: 3,
  seats: 4,
  active: true,
  status: "available",
  menuUrl: "http://localhost/cardapio?mesa=tok",
};

test("dashboard: erro de ação não esconde indicadores; erro sem dados mostra — e Tentar de novo", () => {
  const order = { id: 1, status: "open", items: [], payment: null };
  const render = (props) =>
    html(mods.dashboard.default, {
      tables: [],
      onRetry() {},
      ...props,
    });
  const withData = render({ orders: [order], error: "Falha ao salvar" });
  assert.doesNotMatch(withData, /Tentar de novo/);
  assert.doesNotMatch(withData, /<strong>—<\/strong>/);
  const empty = render({ orders: [], error: "Sem conexão" });
  assert.match(empty, /Tentar de novo/);
  assert.match(empty, /<strong>—<\/strong>/);
});

test("detalhe da mesa: com 'Lançar pedido' só ele é primário", () => {
  const render = (onLaunchOrder) =>
    html(mods.details.TableDetailsModal, {
      table,
      onViewOrder() {},
      onLaunchOrder,
      selectedDetail: null,
      setSelectedDetail() {},
      error: "",
      busy: false,
      onClose() {},
      onEdit() {},
      onAdvanceStatus: async () => {},
    });
  const options = (markup) =>
    markup.slice(markup.indexOf("table-options"), markup.indexOf("table-detail-actions"));
  const launch = options(render(() => {}));
  assert.match(launch, /Lançar pedido/);
  assert.equal((launch.match(/class="btn primary/g) ?? []).length, 1);
  const without = options(render(undefined));
  assert.doesNotMatch(without, /Lançar pedido/);
  assert.equal((without.match(/class="btn primary/g) ?? []).length, 1);
});

test("QR sem menuUrl (token) não é gerado", () => {
  const markup = html(mods.tableQr.TableQr, { table: { ...table, menuUrl: "" } });
  assert.match(markup, /QR indisponível/);
  assert.doesNotMatch(markup, /<canvas/);
  assert.match(html(mods.tableQr.TableQr, { table }), /<canvas/);
});
