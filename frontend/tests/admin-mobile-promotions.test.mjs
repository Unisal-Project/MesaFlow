import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

let server, AdminSidebar, Promotions, run;
const previous = {
  window: globalThis.window,
  localStorage: globalThis.localStorage,
};
before(async () => {
  globalThis.window = {
    location: { protocol: "http:", hostname: "localhost" },
  };
  globalThis.localStorage = { getItem: () => null };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [
      {
        name: "controlled-mobile-components",
        enforce: "pre",
        transform(code, id) {
          if (id.endsWith("/layout/AdminSidebar.tsx"))
            return (
              code
                .replace("useId, ", "")
                .replace("useEffect, ", "")
                .replace(
                  'from "react"',
                  'from "/tests/helpers/hook-runtime.mjs"',
                ) +
              '\nconst useId = () => "test-menu"; const useEffect = (fn) => { globalThis.sidebarEffects?.push(fn); };'
            );
          if (id.endsWith("/Promotions/PromotionPanel.tsx"))
            return (
              code
                .replace(
                  'from "react"',
                  'from "/tests/helpers/hook-runtime.mjs"',
                )
                .replace("useEffect(() => {", "captureEffect(() => {") +
              "\nconst captureEffect = fn => globalThis.panelEffects?.push(fn);"
            );
          if (id.endsWith("/Promotions/index.tsx"))
            return code
              .replace('from "react"', 'from "/tests/helpers/hook-runtime.mjs"')
              .replace(
                'import { usePromotions, type ItemKey } from "./hooks/usePromotions";',
                'import type { ItemKey } from "./hooks/usePromotions"; const usePromotions = () => globalThis.promotionState;',
              );
        },
      },
    ],
  });
  ({ AdminSidebar } = await server.ssrLoadModule(
    "/src/components/layout/AdminSidebar.tsx",
  ));
  ({ default: Promotions } = await server.ssrLoadModule(
    "/src/pages/admin/Promotions/index.tsx",
  ));
  ({ createHookRunner: run } = await server.ssrLoadModule(
    "/tests/helpers/hook-runtime.mjs",
  ));
});
after(async () => {
  await server?.close();
  Object.assign(globalThis, previous);
  delete globalThis.promotionState;
});
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
const find = (tree, predicate) => nodes(tree).find(predicate);
const named = (tree, name) =>
  find(tree, (n) => n.props?.["aria-label"] === name);

test("menu mobile abre, fecha pelo X/fundo e seleciona a navegação", () => {
  const changes = [];
  const render = run(() =>
    AdminSidebar({ activeId: "orders", onChange: (id) => changes.push(id) }),
  );
  let tree = render();
  assert.equal(named(tree, "Abrir menu")?.props["aria-expanded"], false);
  named(tree, "Abrir menu").props.onClick();
  tree = render();
  assert.equal(named(tree, "Abrir menu").props["aria-expanded"], true);
  assert.equal(
    named(tree, "Abrir menu").props["aria-controls"],
    find(tree, (n) => n.type === "aside").props.id,
  );
  named(tree, "Fechar menu").props.onClick();
  assert.equal(named(render(), "Abrir menu").props["aria-expanded"], false);
  named(render(), "Abrir menu").props.onClick();
  find(render(), (n) =>
    n.props?.className?.includes("admin-sidebar-backdrop"),
  ).props.onClick();
  assert.equal(named(render(), "Abrir menu").props["aria-expanded"], false);
  named(render(), "Abrir menu").props.onClick();
  find(
    render(),
    (n) =>
      n.type === "button" &&
      n.props.children?.some?.((c) => c?.props?.children === "Pedidos"),
  ).props.onClick();
  assert.deepEqual(changes, ["orders"]);
  assert.equal(named(render(), "Abrir menu").props["aria-expanded"], false);
});

function state() {
  const base = { promoType: "PERCENT", promoValue: "10", promoActive: true };
  return {
    products: [
      {
        ...base,
        id: "1",
        name: "Suco",
        categoryId: "c1",
        price: "10",
        finalPrice: "9",
      },
      {
        ...base,
        id: "2",
        name: "Água",
        categoryId: "c1",
        price: "10",
        finalPrice: "9",
      },
      {
        ...base,
        id: "3",
        name: "Burger",
        categoryId: "c1",
        price: "10",
        promoStartsAt: "2099-01-01T00:00:00Z",
      },
      {
        ...base,
        id: "4",
        name: "Pizza",
        categoryId: "c1",
        price: "10",
        promoActive: false,
      },
    ],
    categories: [{ id: "c1", name: "Bebidas" }],
    selected: [],
    form: {},
    replacedCount: 0,
    toggle(key) {
      const state = globalThis.promotionState;
      state.selected = state.selected.includes(key)
        ? state.selected.filter((k) => k !== key)
        : [...state.selected, key];
    },
    clearSelection() {
      globalThis.promotionState.selected = [];
    },
    selectAll(keys) {
      const state = globalThis.promotionState;
      state.selected = [...new Set([...state.selected, ...keys])];
    },
  };
}
test("lista única separa toda categoria de marcar todos os produtos", () => {
  globalThis.promotionState = state();
  const render = run(() => Promotions({ onNavigate() {} }));
  let tree = render();
  const category = find(tree, (n) => n.props?.label === "Toda a categoria");
  category.props.onChange();
  assert.deepEqual(globalThis.promotionState.selected, ["c:c1"]);
  named(tree, "Marcar todos os produtos: Bebidas").props.onClick();
  assert.deepEqual(globalThis.promotionState.selected, [
    "c:c1",
    "p:1",
    "p:2",
    "p:3",
    "p:4",
  ]);
  tree = render();
  assert.equal(nodes(tree).filter((n) => n.props?.label === "Suco").length, 1);
  find(tree, (n) => n.props?.children === "Limpar").props.onClick();
  assert.deepEqual(globalThis.promotionState.selected, []);
});
test("filtros e busca mantêm seleção e exibem estado sem resultado", () => {
  globalThis.promotionState = state();
  const render = run(() => Promotions({ onNavigate() {} }));
  const tabs = find(
    render(),
    (n) => n.props?.ariaLabel === "Filtrar promoções",
  );
  assert.ok(tabs.props.items.some((item) => item.label === "Vigentes 2"));
  globalThis.promotionState.toggle("p:1");
  tabs.props.onChange("paused");
  let tree = render();
  assert.ok(find(tree, (n) => n.props?.label === "Pizza"));
  assert.ok(!find(tree, (n) => n.props?.label === "Suco"));
  named(tree, "Buscar produto ou categoria").props.onChange({
    target: { value: "não existe" },
  });
  assert.ok(
    find(render(), (n) => n.props?.title === "Nenhum resultado para a busca."),
  );
  assert.deepEqual(globalThis.promotionState.selected, ["p:1"]);
});

test("gaveta gerencia foco, Tab, Escape e restaura rolagem", () => {
  const previousDocument = globalThis.document;
  const listeners = new Map();
  const first = {
    focus() {
      document.activeElement = first;
    },
    getClientRects: () => [1],
  };
  const last = {
    focus() {
      document.activeElement = last;
    },
    getClientRects: () => [1],
  };
  const drawer = {
    focus() {
      document.activeElement = drawer;
    },
    querySelectorAll: () => [first, last],
  };
  let returnedFocus = 0;
  const trigger = {
    focus() {
      returnedFocus++;
    },
  };
  const media = {
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.window.matchMedia = () => media;
  globalThis.document = {
    body: { style: { overflow: "auto" } },
    addEventListener: (key, fn) => listeners.set(key, fn),
    removeEventListener: (key) => listeners.delete(key),
  };
  globalThis.sidebarEffects = [];
  try {
    const render = run(() =>
      AdminSidebar({ activeId: "orders", onChange() {} }),
    );
    named(render(), "Abrir menu").props.onClick();
    globalThis.sidebarEffects = [];
    const tree = render();
    find(tree, (n) => n.type === "aside").props.ref.current = drawer;
    named(tree, "Abrir menu").props.ref.current = trigger;
    const cleanup = globalThis.sidebarEffects[0]();
    assert.equal(document.activeElement, drawer);
    assert.equal(document.body.style.overflow, "hidden");
    const key = (value, shiftKey = false) =>
      listeners.get("keydown")({ key: value, shiftKey, preventDefault() {} });
    key("Tab");
    assert.equal(document.activeElement, first);
    key("Tab", true);
    assert.equal(document.activeElement, last);
    key("Tab");
    assert.equal(document.activeElement, first);
    key("Escape");
    assert.equal(named(render(), "Abrir menu").props["aria-expanded"], false);
    assert.equal(returnedFocus, 1);
    cleanup();
    assert.equal(document.body.style.overflow, "auto");
    assert.equal(listeners.size, 0);
  } finally {
    globalThis.document = previousDocument;
    delete globalThis.sidebarEffects;
  }
});

test("Definir promoção abre o painel; carregamento e erro não exibem lista", () => {
  globalThis.promotionState = state();
  let opened = false;
  globalThis.promotionState.selected = ["p:1"];
  globalThis.promotionState.openPanel = () => {
    opened = true;
  };
  const render = run(() => Promotions({ onNavigate() {} }));
  find(
    render(),
    (n) => n.props?.children === "Definir promoção",
  ).props.onClick();
  assert.equal(opened, true);
  globalThis.promotionState.panelOpen = true;
  assert.ok(find(render(), (n) => n.props?.state?.panelOpen));
  globalThis.promotionState.loading = true;
  assert.ok(!find(render(), (n) => n.props?.className === "promotions-group"));
  globalThis.promotionState.loading = false;
  globalThis.promotionState.loadError = "Falhou";
  assert.ok(find(render(), (n) => n.props?.children === "Tentar de novo"));
  assert.ok(!find(render(), (n) => n.props?.className === "promotions-group"));
});

test("gaveta fechada permanece montada para animar e fica inert apenas no celular", () => {
  const previousDocument = globalThis.document;
  const previousMatchMedia = globalThis.window.matchMedia;
  const media = {
    matches: true,
    addEventListener(_key, fn) {
      this.changed = fn;
    },
    removeEventListener() {},
  };
  const drawer = { inert: false };
  globalThis.window.matchMedia = () => media;
  globalThis.sidebarEffects = [];
  try {
    const render = run(() =>
      AdminSidebar({ activeId: "dashboard", onChange() {} }),
    );
    const tree = render();
    const backdrop = find(tree, (n) =>
      n.props?.className?.includes("admin-sidebar-backdrop"),
    );
    assert.ok(
      backdrop,
      "fundo precisa continuar montado para animar ao fechar",
    );
    assert.ok(!backdrop.props.className.includes("is-open"));
    find(tree, (n) => n.type === "aside").props.ref.current = drawer;
    const cleanup = globalThis.sidebarEffects[0]();
    assert.equal(drawer.inert, true, "fechada não recebe foco nem é lida");
    media.matches = false;
    media.changed();
    assert.equal(drawer.inert, false, "desktop continua navegável");
    cleanup();
  } finally {
    globalThis.document = previousDocument;
    globalThis.window.matchMedia = previousMatchMedia;
    delete globalThis.sidebarEffects;
  }
});

test("painel mostra erro, prévia e substituição, sem switches de promoção", async () => {
  const { PromotionPanel } = await server.ssrLoadModule(
    "/src/pages/admin/Promotions/PromotionPanel.tsx",
  );
  const state = {
    products: [{ id: "1", name: "Suco", price: "10.00", categoryId: "c1" }],
    selected: ["p:1", "c:c1"],
    replacedCount: 1,
    error: "Desconto inválido do backend",
    form: {
      promoType: "PERCENT",
      promoValue: "20",
      promoActive: true,
      promoStartsAt: "",
      promoEndsAt: "",
    },
  };
  const html = renderToString(
    createElement(PromotionPanel, { state, feedbackRef: { current: null } }),
  );
  assert.match(html, /<dialog/);
  assert.match(html, /Desconto inválido do backend/);
  assert.match(html, /item já tem promoção e será substituído/);
  assert.match(html, /Produtos com promoção própria mantêm a deles/);
  assert.match(html, /Prévia de preços/);
  assert.match(html, /8,00/);
  assert.ok(!html.includes("Tem promoção?"));
  assert.ok(!html.includes("Promoção ativa"));
  assert.match(html, /Aplicar a/);
  const { PromotionFields } = await server.ssrLoadModule(
    "/src/pages/admin/Products/components/PromotionFields.tsx",
  );
  const original = renderToString(
    createElement(PromotionFields, {
      idPrefix: "product",
      value: state.form,
      onChange() {},
    }),
  );
  assert.match(original, /Tem promoção\?/);
  assert.match(original, /Promoção ativa/);
});

test("painel foca desconto, restaura foco e descarta somente após confirmação", async () => {
  const { PromotionPanel } = await server.ssrLoadModule(
    "/src/pages/admin/Promotions/PromotionPanel.tsx",
  );
  const oldDocument = globalThis.document;
  const oldConfirm = window.confirm;
  let closed = 0,
    shown = 0,
    focused = 0,
    returned = 0;
  const initial = {
    promoType: "PERCENT",
    promoValue: "",
    promoActive: true,
    promoStartsAt: "",
    promoEndsAt: "",
  };
  const state = {
    products: [],
    selected: ["p:1"],
    form: initial,
    replacedCount: 0,
    setForm(value) {
      state.form = value;
    },
    closePanel() {
      closed++;
    },
  };
  globalThis.document = {
    body: { style: { overflow: "auto" } },
    activeElement: {
      focus() {
        returned++;
      },
    },
  };
  globalThis.panelEffects = [];
  try {
    const render = run(() =>
      PromotionPanel({ state, feedbackRef: { current: null } }),
    );
    const dialog = render();
    dialog.props.ref.current = {
      showModal() {
        shown++;
      },
      close() {},
      querySelector() {
        return {
          focus() {
            focused++;
          },
        };
      },
    };
    const cleanup = globalThis.panelEffects[0]();
    assert.equal(shown, 1);
    assert.equal(focused, 1);
    assert.equal(document.body.style.overflow, "hidden");
    state.form = { ...initial, promoValue: "20" };
    window.confirm = () => false;
    render().props.onCancel({ preventDefault() {} });
    assert.equal(closed, 0);
    assert.equal(state.form.promoValue, "20");
    window.confirm = () => true;
    render().props.onCancel({ preventDefault() {} });
    assert.equal(closed, 1);
    assert.equal(state.form.promoValue, "");
    cleanup();
    assert.equal(returned, 1);
    assert.equal(document.body.style.overflow, "auto");
  } finally {
    globalThis.document = oldDocument;
    window.confirm = oldConfirm;
    delete globalThis.panelEffects;
  }
});

test("barra e sua reserva só existem com seleção, erro ou aviso", () => {
  globalThis.promotionState = state();
  const render = run(() => Promotions({ onNavigate() {} }));
  const bar = (tree) => named(tree, "Ações da seleção");
  assert.ok(!bar(render()));
  assert.ok(!render().props.className.includes("has-actions"));
  globalThis.promotionState.selected = ["p:1"];
  assert.ok(bar(render()));
  assert.ok(render().props.className.includes("has-actions"));
  globalThis.promotionState.selected = [];
  for (const field of ["error", "notice"]) {
    globalThis.promotionState[field] = "Mensagem visível";
    assert.ok(bar(render()));
    assert.ok(render().props.className.includes("has-actions"));
    globalThis.promotionState[field] = "";
  }
  assert.ok(!bar(render()));
});

test("marcar todos respeita filtro e busca e preserva seleções anteriores", () => {
  globalThis.promotionState = state();
  globalThis.promotionState.selected = ["c:c1"];
  const render = run(() => Promotions({ onNavigate() {} }));
  find(
    render(),
    (n) => n.props?.ariaLabel === "Filtrar promoções",
  ).props.onChange("active");
  named(render(), "Buscar produto ou categoria").props.onChange({
    target: { value: "Suco" },
  });
  named(render(), "Marcar todos os produtos: Bebidas").props.onClick();
  assert.deepEqual(globalThis.promotionState.selected, ["c:c1", "p:1"]);
  globalThis.promotionState.selected = [];
  named(render(), "Buscar produto ou categoria").props.onChange({
    target: { value: "" },
  });
  find(
    render(),
    (n) => n.props?.ariaLabel === "Filtrar promoções",
  ).props.onChange("paused");
  named(render(), "Marcar todos os produtos: Bebidas").props.onClick();
  assert.deepEqual(globalThis.promotionState.selected, ["p:4"]);
});

test("barra mostra só a orientação de retomada fornecida pelo estado", () => {
  globalThis.promotionState = state();
  globalThis.promotionState.selected = ["p:1"];
  globalThis.promotionState.canResume = false;
  const render = run(() => Promotions({ onNavigate() {} }));
  assert.ok(!find(render(), (n) => n.props?.id === "promotions-resume-hint"));
  for (const hint of [
    "Promoção encerrada: defina novas datas",
    "Retome um item por vez",
  ]) {
    globalThis.promotionState.resumeHint = hint;
    assert.equal(
      find(render(), (n) => n.props?.id === "promotions-resume-hint").props
        .children,
      hint,
    );
  }
});

test("prévia de categoria ignora valor maior/igual ao preço e mantém promoção própria", async () => {
  const { PromotionPanel } = await server.ssrLoadModule(
    "/src/pages/admin/Promotions/PromotionPanel.tsx",
  );
  const state = {
    products: [{ id: "1", name: "Suco", categoryId: "c1", price: "10.00" }],
    selected: ["c:c1"],
    form: {
      promoType: "AMOUNT",
      promoValue: "10",
      promoActive: true,
      promoStartsAt: "",
      promoEndsAt: "",
    },
  };
  const text = () => {
    const tree = run(() =>
      PromotionPanel({ state, feedbackRef: { current: null } }),
    )();
    return renderToString(tree)
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ");
  };
  for (const value of ["10", "11"]) {
    state.form.promoValue = value;
    assert.match(text(), /SucoR\$ 10,00 → R\$ 10,00/);
  }
  state.form.promoValue = "2,50";
  assert.match(text(), /SucoR\$ 10,00 → R\$ 7,50/);
  state.products[0].promotion = {
    source: "PRODUCT",
    type: "PERCENT",
    value: "20",
  };
  state.products[0].finalPrice = "8.00";
  assert.match(text(), /SucoR\$ 10,00 → R\$ 8,00/);
  state.selected.push("p:1");
  assert.match(text(), /SucoR\$ 10,00 → R\$ 7,50/);
});

test("grupo e painel usam item no singular e itens no plural", async () => {
  globalThis.promotionState = state();
  globalThis.promotionState.products = globalThis.promotionState.products.slice(
    0,
    1,
  );
  const tree = run(() => Promotions({ onNavigate() {} }))();
  const group = find(tree, (n) => n.props?.className === "promotions-group");
  assert.equal(
    renderToString(find(group, (n) => n.type === "small")).replace(
      /<[^>]*>/g,
      "",
    ),
    "1 item",
  );
  const { PromotionPanel } = await server.ssrLoadModule(
    "/src/pages/admin/Promotions/PromotionPanel.tsx",
  );
  const current = {
    products: [],
    selected: ["p:1"],
    form: {
      promoType: "PERCENT",
      promoValue: "20",
      promoActive: true,
      promoStartsAt: "",
      promoEndsAt: "",
    },
  };
  const text = () =>
    renderToString(
      run(() =>
        PromotionPanel({ state: current, feedbackRef: { current: null } }),
      )(),
    ).replace(/<[^>]*>/g, "");
  assert.match(text(), /Promoção para 1 item/);
  assert.match(text(), /Aplicar a 1 item/);
  current.selected.push("p:2");
  assert.match(text(), /Promoção para 2 itens/);
  assert.match(text(), /Aplicar a 2 itens/);
});
