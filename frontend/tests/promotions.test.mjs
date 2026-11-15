import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { createServer } from "vite";

let server,
  usePromotions,
  promotionStatus,
  run,
  AdminRoutes,
  RequireAuth,
  paths;
const previous = {
  window: globalThis.window,
  localStorage: globalThis.localStorage,
  fetch: globalThis.fetch,
};
const requests = [];
let patchResponse = () => Response.json({ products: 2, categories: 1 });

const products = [
  {
    id: "1",
    name: "Suco",
    price: "8.00",
    categoryId: "3",
    promoType: "PERCENT",
    promoValue: "10.00",
    promoActive: true,
    promoStartsAt: null,
    promoEndsAt: null,
  },
  {
    id: "2",
    name: "Burger",
    price: "30.00",
    categoryId: "3",
    promoType: null,
    promoValue: null,
    promoActive: false,
  },
];
const categories = [
  {
    id: "3",
    name: "Lanches",
    active: true,
    promoType: null,
    promoValue: null,
    promoActive: false,
  },
];

before(async () => {
  globalThis.window = {
    location: {
      protocol: "http:",
      hostname: "localhost",
      search: "",
      origin: "http://localhost:5173",
    },
  };
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
  };
  globalThis.fetch = async (url, options = {}) => {
    requests.push({
      url: String(url),
      method: options.method ?? "GET",
      body: options.body && JSON.parse(options.body),
    });
    if (options.method === "PATCH") return patchResponse();
    return Response.json(
      String(url).includes("/categories") ? categories : products,
    );
  };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [
      {
        name: "controlled-promotions-hook",
        enforce: "pre",
        transform(code, id) {
          if (id.endsWith("/Promotions/hooks/usePromotions.ts"))
            return (
              code
                .replace(/useEffect,\s*/, "")
                .replace(
                  'from "react"',
                  'from "/tests/helpers/hook-runtime.mjs"',
                ) +
              "\nconst useEffect = fn => globalThis.promotionEffects?.push(fn);"
            );
        },
      },
    ],
  });
  ({ usePromotions } = await server.ssrLoadModule(
    "/src/pages/admin/Promotions/hooks/usePromotions.ts",
  ));
  ({ promotionStatus } = await server.ssrLoadModule(
    "/src/pages/admin/Promotions/promotionStatus.ts",
  ));
  ({ createHookRunner: run } = await server.ssrLoadModule(
    "/tests/helpers/hook-runtime.mjs",
  ));
  ({ AdminRoutes } = await server.ssrLoadModule(
    "/src/routers/AdminRoutes.tsx",
  ));
  ({ RequireAuth } = await server.ssrLoadModule("/src/routers/AppRouter.tsx"));
  paths = await server.ssrLoadModule("/src/routers/paths.ts");
});

after(async () => {
  await server?.close();
  Object.assign(globalThis, previous);
});

test("status da promoção própria: vigente, agendada, pausada/encerrada ou nenhuma", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  const base = { promoType: "PERCENT", promoValue: "10", promoActive: true };
  assert.equal(
    promotionStatus({ promoType: null, promoValue: null }, now),
    null,
  );
  assert.equal(promotionStatus(base, now), "active");
  assert.equal(promotionStatus({ ...base, promoActive: false }, now), "paused");
  assert.equal(
    promotionStatus({ ...base, promoStartsAt: "2026-11-20T00:00:00Z" }, now),
    "scheduled",
  );
  assert.equal(
    promotionStatus({ ...base, promoEndsAt: "2026-11-10T00:00:00Z" }, now),
    "paused",
  );
});

test("aplicar envia ids e o formulário (vírgula vira ponto); avisa quem será substituído", async () => {
  requests.length = 0;
  const hook = run(() => usePromotions());
  await hook().reload();
  for (const key of ["p:1", "p:2", "c:3"]) hook().toggle(key);
  assert.equal(hook().replacedCount, 1, "só o Suco já tem promoção própria");
  hook().setForm({ ...hook().form, promoType: "AMOUNT", promoValue: "2,50" });
  hook().apply({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  const patch = requests.find((request) => request.method === "PATCH");
  assert.match(patch.url, /\/promotions$/);
  assert.deepEqual(patch.body, {
    productIds: ["1", "2"],
    categoryIds: ["3"],
    promoType: "AMOUNT",
    promoValue: 2.5,
    promoActive: true,
    promoStartsAt: null,
    promoEndsAt: null,
  });
  assert.match(hook().notice, /Promoção aplicada a 3 itens\./);
  assert.deepEqual(hook().selected, []);
});

test("pausar envia só promoActive:false; erro do backend aparece e a seleção fica", async () => {
  requests.length = 0;
  const hook = run(() => usePromotions());
  await hook().reload();
  hook().toggle("p:1");
  hook().pause();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    requests.find((request) => request.method === "PATCH").body,
    {
      productIds: ["1"],
      categoryIds: [],
      promoActive: false,
    },
  );

  patchResponse = () =>
    Response.json(
      { message: "O desconto em R$ deve ser menor que o preço de: Suco" },
      { status: 400 },
    );
  hook().toggle("p:1");
  hook().setForm({ ...hook().form, promoType: "AMOUNT", promoValue: "50" });
  hook().apply({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(hook().error, /menor que o preço de: Suco/);
  assert.deepEqual(hook().selected, ["p:1"]);
  patchResponse = () => Response.json({ products: 2, categories: 1 });

  const empty = run(() => usePromotions());
  empty().pause();
  assert.match(empty().error, /Selecione ao menos um/);
});

test("aplicar sem desconto não envia nada (não apaga as promoções selecionadas)", async () => {
  requests.length = 0;
  const hook = run(() => usePromotions());
  await hook().reload();
  hook().toggle("p:1");
  for (const form of [
    { ...hook().form, promoValue: "" },
    { ...hook().form, promoType: null, promoValue: "" },
    { ...hook().form, promoValue: "   ", promoActive: false },
  ]) {
    hook().setForm(form);
    hook().apply({ preventDefault() {} });
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(hook().error, /Informe o desconto/);
  }
  assert.equal(
    requests.filter((request) => request.method === "PATCH").length,
    0,
  );
  assert.deepEqual(hook().selected, ["p:1"]);
});

test("rota /admin/promocoes exige login e aparece no menu lateral", () => {
  const render = (element) =>
    renderToString(
      createElement(
        MemoryRouter,
        { initialEntries: ["/admin/promocoes"] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: "/admin/*", element }),
        ),
      ),
    );
  assert.equal(
    render(createElement(RequireAuth, null, createElement(AdminRoutes))),
    "",
  );
  const html = render(createElement(AdminRoutes));
  assert.match(html, /<h1>Promoções<\/h1>/);
  assert.match(html, /aria-current="page"[^>]*>.*?<span>Promoções<\/span>/);
  assert.ok(!html.includes("promotions-selection-bar"));
  assert.equal(paths.adminPaths.promotions, "/admin/promocoes");
});

test("selecionar todos une as chaves sem duplicar nem perder seleção anterior", async () => {
  const hook = run(() => usePromotions());
  await hook().reload();
  hook().toggle("c:3");
  hook().toggle("p:1");
  hook().selectAll(["p:1", "p:2"]);
  hook().selectAll(["p:1", "p:2"]);
  assert.deepEqual(hook().selected, ["c:3", "p:1", "p:2"]);
  hook().clearSelection();
  assert.deepEqual(hook().selected, []);
});

test("mensagens de erro e sucesso entram na área visível, mesmo após limpar seleção", async () => {
  const hook = run(() => usePromotions());
  await hook().reload();
  hook().toggle("p:1");
  const scrolled = [];
  assert.ok(hook().feedbackRef, "mensagem precisa de referência para rolagem");
  hook().feedbackRef.current = {
    scrollIntoView: (options) => scrolled.push(options),
  };
  try {
    hook().apply({ preventDefault() {} });
    globalThis.promotionEffects = [];
    hook();
    globalThis.promotionEffects[0]();
    assert.equal(scrolled.length, 1, "erro visível mesmo vindo da barra fixa");
    hook().apply({ preventDefault() {} });
    assert.equal(
      scrolled.length,
      2,
      "repetir o mesmo erro também rola, sem depender do efeito",
    );
    hook().pause();
    const beforeSuccess = scrolled.length;
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(hook().selected, []);
    assert.match(hook().notice, /Promoção pausada/);
    globalThis.promotionEffects = [];
    hook();
    globalThis.promotionEffects[0]();
    assert.equal(
      scrolled.length,
      beforeSuccess + 1,
      "sucesso visível mesmo sem barra",
    );
  } finally {
    delete globalThis.promotionEffects;
  }
});

test("retomar exige pausados com configuração idêntica e preserva datas", async () => {
  const original = products.map((p) => ({ ...p }));
  try {
    const saved = {
      promoType: "AMOUNT",
      promoValue: "2.50",
      promoActive: false,
      promoStartsAt: "2026-01-01T10:00:00Z",
      promoEndsAt: null,
    };
    Object.assign(products[0], saved);
    Object.assign(products[1], saved);
    const hook = run(() => usePromotions());
    await hook().reload();
    hook().selectAll(["p:1", "p:2"]);
    assert.equal(hook().canResume, true);
    requests.length = 0;
    hook().resume();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(requests.find((r) => r.method === "PATCH").body, {
      productIds: ["1", "2"],
      categoryIds: [],
      ...saved,
      promoActive: true,
      promoValue: 2.5,
    });
    products[1].promoEndsAt = "2099-01-01T10:00:00Z";
    await hook().reload();
    hook().selectAll(["p:1", "p:2"]);
    assert.equal(hook().canResume, false);
    requests.length = 0;
    hook().resume();
    assert.equal(requests.length, 0);
    hook().clearSelection();
    products[0].promoActive = true;
    await hook().reload();
    hook().toggle("p:1");
    assert.equal(hook().canResume, false);
  } finally {
    products.splice(0, products.length, ...original);
  }
});

test("erro ao carregar fica separado do formulário e nova tentativa limpa o erro", async () => {
  const fetch = globalThis.fetch;
  const hook = run(() => usePromotions());
  try {
    globalThis.fetch = async () => {
      throw new Error("Sem conexão");
    };
    await hook().reload();
    assert.match(hook().loadError, /conectar ao servidor/);
    assert.equal(hook().loading, false);
  } finally {
    globalThis.fetch = fetch;
  }
  await hook().reload();
  assert.equal(hook().loadError, "");
  assert.equal(hook().products.length, 2);
});

test("recarga após aplicar, pausar ou retomar mantém conteúdo e não religa skeleton", async () => {
  const original = products.map((product) => ({ ...product }));
  const fetch = globalThis.fetch;
  try {
    for (const operation of ["apply", "pause", "resume"]) {
      Object.assign(products[0], { promoActive: false, promoEndsAt: null });
      const hook = run(() => usePromotions());
      assert.equal(hook().loading, true);
      await hook().reload();
      const renderedProducts = hook().products;
      hook().toggle("p:1");
      hook().setForm({ ...hook().form, promoValue: "20" });
      const pending = [];
      globalThis.fetch = (url, options = {}) =>
        options.method === "PATCH"
          ? fetch(url, options)
          : new Promise((resolve) =>
              pending.push(() => fetch(url, options).then(resolve)),
            );
      hook()[operation]({ preventDefault() {} });
      await new Promise((resolve) => setImmediate(resolve));
      try {
        assert.equal(pending.length, 2);
        assert.equal(
          hook().loading,
          false,
          operation + " não deve desmontar lista",
        );
        assert.equal(hook().products, renderedProducts);
      } finally {
        pending.forEach((resolve) => resolve());
        await new Promise((resolve) => setImmediate(resolve));
        globalThis.fetch = fetch;
      }
    }
  } finally {
    globalThis.fetch = fetch;
    products.splice(0, products.length, ...original);
  }
});

test("retomar distingue encerrada de pausadas diferentes e não orienta vigentes/sem promoção", async () => {
  const original = products.map((product) => ({ ...product }));
  try {
    const hook = run(() => usePromotions());
    Object.assign(products[0], {
      promoActive: false,
      promoEndsAt: "2000-01-01T00:00:00Z",
    });
    await hook().reload();
    hook().toggle("p:1");
    assert.equal(hook().canResume, false);
    assert.equal(hook().resumeHint, "Promoção encerrada: defina novas datas");
    requests.length = 0;
    hook().resume();
    assert.equal(requests.length, 0);
    products[0].promoEndsAt = "2099-01-01T00:00:00Z";
    await hook().reload();
    assert.equal(hook().canResume, true);
    assert.equal(hook().resumeHint, "");
    Object.assign(products[1], { ...products[0], id: "2", promoValue: "25" });
    hook().toggle("p:2");
    await hook().reload();
    assert.equal(hook().canResume, false);
    assert.equal(hook().resumeHint, "Retome um item por vez");
    products[0].promoActive = true;
    await hook().reload();
    assert.equal(hook().resumeHint, "");
    products[0].promoType = null;
    await hook().reload();
    assert.equal(hook().resumeHint, "");
    hook().clearSelection();
    assert.equal(hook().resumeHint, "");
  } finally {
    products.splice(0, products.length, ...original);
  }
});

test("mensagens de aplicação, pausa e retomada usam singular para um item", async () => {
  const original = { ...products[0] };
  try {
    patchResponse = () => Response.json({ products: 1, categories: 0 });
    products[0].promoActive = false;
    for (const [operation, verb] of [
      ["apply", "aplicada"],
      ["pause", "pausada"],
      ["resume", "retomada"],
    ]) {
      const hook = run(() => usePromotions());
      await hook().reload();
      hook().toggle("p:1");
      hook().setForm({ ...hook().form, promoValue: "20" });
      hook()[operation]({ preventDefault() {} });
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(hook().notice, `Promoção ${verb} a 1 item.`);
    }
  } finally {
    Object.assign(products[0], original);
    patchResponse = () => Response.json({ products: 2, categories: 1 });
  }
});

test("remover confirma apenas promoções próprias e envia todos os campos nulos", async () => {
  const originalCategories = categories.map((category) => ({ ...category }));
  const confirm = window.confirm;
  const confirmed = [];
  try {
    Object.assign(categories[0], {
      promoType: "AMOUNT",
      promoValue: "2",
      promoActive: false,
      promoStartsAt: null,
      promoEndsAt: "2000-01-01T00:00:00Z",
    });
    window.confirm = (message) => {
      confirmed.push(message);
      return true;
    };
    const hook = run(() => usePromotions());
    await hook().reload();
    hook().selectAll(["p:1", "p:2", "c:3"]);
    requests.length = 0;
    patchResponse = () => Response.json({ products: 1, categories: 1 });
    hook().removePromotion();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(confirmed, [
      "Remover a promoção de 2 itens? Esta ação não pode ser desfeita.",
    ]);
    assert.deepEqual(
      requests.find((request) => request.method === "PATCH").body,
      {
        productIds: ["1"],
        categoryIds: ["3"],
        promoActive: false,
        promoType: null,
        promoValue: null,
        promoStartsAt: null,
        promoEndsAt: null,
      },
    );
    assert.equal(hook().notice, "Promoção removida de 2 itens.");
    assert.deepEqual(hook().selected, []);
    patchResponse = () => Response.json({ products: 1, categories: 0 });
    hook().toggle("p:1");
    hook().removePromotion();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
      confirmed[1],
      "Remover a promoção de 1 item? Esta ação não pode ser desfeita.",
    );
    assert.equal(hook().notice, "Promoção removida de 1 item.");
  } finally {
    categories.splice(0, categories.length, ...originalCategories);
    window.confirm = confirm;
    patchResponse = () => Response.json({ products: 2, categories: 1 });
  }
});

test("remoção recusada mantém seleção e não envia PATCH", async () => {
  const confirm = window.confirm;
  try {
    window.confirm = () => false;
    const hook = run(() => usePromotions());
    await hook().reload();
    hook().toggle("p:1");
    requests.length = 0;
    hook().removePromotion();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(requests.length, 0);
    assert.deepEqual(hook().selected, ["p:1"]);
    assert.equal(hook().notice, "");
  } finally {
    window.confirm = confirm;
  }
});

test("seleção sem promoção própria, mesmo herdada, não confirma nem remove", async () => {
  const original = { ...products[1] };
  const confirm = window.confirm;
  let confirmations = 0;
  try {
    products[1].promotion = {
      type: "PERCENT",
      value: "10",
      source: "CATEGORY",
    };
    window.confirm = () => {
      confirmations++;
      return true;
    };
    const hook = run(() => usePromotions());
    await hook().reload();
    hook().toggle("p:2");
    assert.equal(hook().replacedCount, 0);
    requests.length = 0;
    hook().removePromotion();
    hook().clearSelection();
    hook().removePromotion();
    assert.equal(confirmations, 0);
    assert.equal(requests.length, 0);
  } finally {
    products[1] = original;
    window.confirm = confirm;
  }
});
