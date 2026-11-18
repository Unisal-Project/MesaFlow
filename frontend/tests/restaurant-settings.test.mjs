import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
let server, run, service, useRestaurantSettings, PaymentForm, PaymentModal, RestaurantInfo;
const old = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage };
const data = { name: "Mesa Flow", address: null, openingHours: "18h–23h", contact: "123", serviceFeeRate: 5 };
const requests = [];
before(async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" }, confirm: () => true };
  globalThis.localStorage = { getItem: () => null };
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), ...options });
    return Response.json(options.method === "PUT" ? JSON.parse(options.body) : data);
  };
  server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, ws: false }, optimizeDeps: { noDiscovery: true },
    plugins: [{ name: "settings-controlled", enforce: "pre", transform(code, id) {
      if (["/Settings/hooks/useRestaurantSettings.ts", "/Order/components/PaymentModal.tsx", "/layout/RestaurantInfo.tsx"].some(path => id.endsWith(path)))
        return code.replace(/useId,\s*/, "").replace('from "react"', 'from "/tests/helpers/hook-runtime.mjs"').replaceAll('useEffect(', 'captureEffect(') + '\nconst captureEffect = fn => globalThis.settingsEffects?.push(fn); const useId = () => "restaurant-info-title";';
    } }] });
  ({ createHookRunner: run } = await server.ssrLoadModule("/tests/helpers/hook-runtime.mjs"));
  service = await server.ssrLoadModule("/src/services/settings.service.ts");
  ({ useRestaurantSettings } = await server.ssrLoadModule("/src/pages/admin/Settings/hooks/useRestaurantSettings.ts"));
  ({ PaymentForm, PaymentModal } = await server.ssrLoadModule("/src/pages/admin/Order/components/PaymentModal.tsx"));
  ({ RestaurantInfo } = await server.ssrLoadModule("/src/components/layout/RestaurantInfo.tsx"));
});
after(async () => { await server?.close(); Object.assign(globalThis, old); });
function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map(node => find(node, predicate)).find(Boolean);
  if (!tree?.props) return undefined;
  return predicate(tree) ? tree : find(tree.props.children, predicate);
}

test("serviço de configurações usa GET autenticado, PUT e GET público separados", async () => {
  requests.length = 0;
  await service.fetchSettings(); await service.saveSettings(data); await service.fetchPublicSettings();
  assert.match(requests[0].url, /\/settings$/);
  assert.equal(requests[1].method, "PUT");
  assert.deepEqual(JSON.parse(requests[1].body), data);
  assert.match(requests[2].url, /\/settings\/public$/);
});

test("formulário salva vírgula, trata erros, descarta e bloqueia escrita do funcionário", async () => {
  const hook = run(() => useRestaurantSettings(true));
  await hook().reload();
  assert.equal(hook().form.rateChoice, "5");
  hook().setForm({ ...hook().form, rateChoice: "other", serviceFeeRate: "12,34" });
  assert.equal(hook().dirty, true);
  await hook().submit({ preventDefault() {} });
  assert.equal(JSON.parse(requests.at(-1).body).serviceFeeRate, 12.34);
  assert.equal(hook().dirty, false);
  hook().setForm({ ...hook().form, serviceFeeRate: "21" });
  const count = requests.length;
  await hook().submit({ preventDefault() {} });
  assert.match(hook().error, /0.*20/);
  assert.equal(requests.length, count);
  window.confirm = () => false;
  assert.equal(hook().confirmDiscard(), false);
  window.confirm = () => true;
  hook().discard();
  assert.equal(hook().dirty, false);
  const employee = run(() => useRestaurantSettings(false));
  await employee().reload();
  const before = requests.length;
  await employee().submit({ preventDefault() {} });
  assert.equal(requests.length, before);
  const fetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ message: "Falha ao salvar" }, { status: 500 });
    hook().setForm({ ...hook().form, name: "Alterado" });
    await hook().submit({ preventDefault() {} });
    assert.match(hook().error, /Falha ao salvar/);
    assert.equal(hook().form.name, "Alterado");
  } finally { globalThis.fetch = fetch; }
});

test("imagem do restaurante fica em rascunho até salvar e é enviada como arquivo", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const imageUrl = "/uploads/products/restaurant-banner.webp";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), ...options });
    if (options.method === "POST") return Response.json({ ...data, bannerImageUrl: imageUrl });
    return Response.json(options.method === "PUT" ? JSON.parse(options.body) : data);
  };
  const hook = run(() => useRestaurantSettings(true));
  try {
    await hook().reload();
    hook().selectBanner(new File(["photo"], "banner.png", { type: "image/png" }));
    assert.equal(hook().dirty, true);
    assert.match(hook().bannerPreview, /^blob:/);
    assert.equal(calls.some(call => call.method === "POST"), false);
    await hook().submit({ preventDefault() {} });
    const upload = calls.find(call => call.method === "POST");
    assert.match(upload.url, /\/settings\/banner$/);
    assert.ok(upload.body instanceof FormData);
    assert.equal(upload.body.get("image").name, "banner.png");
    assert.equal(hook().form.bannerImageUrl, imageUrl);
    assert.equal(hook().dirty, false);
    hook().selectBanner(new File(["bad"], "script.svg", { type: "image/svg+xml" }));
    assert.match(hook().error, /JPG.*5 MB/);
    assert.equal(hook().dirty, false);
  } finally { globalThis.fetch = originalFetch; }
});

test("nome e imagem salvos aparecem na tela de boas-vindas; nome vazio usa MesaFlow", async () => {
  const { Home } = await server.ssrLoadModule("/src/pages/client/Home/index.tsx");
  const { RestaurantSettingsContext } = await server.ssrLoadModule("/src/contexts/restaurant-settings.ts");
  const originalWindow = globalThis.window;
  globalThis.window = { ...originalWindow, location: { ...originalWindow.location, origin: "http://localhost:5173" } };
  try {
    const render = (value) => renderToStaticMarkup(createElement(RestaurantSettingsContext.Provider, { value },
      createElement(Home, { guestName: "", onGuestNameChange() {}, onExploreMenu() {}, onOpenCart() {} })));
    const html = render({ ...data, name: "Bistrô da Praça", bannerImageUrl: "/uploads/products/banner.webp" });
    assert.match(html, /<strong>Bistrô da Praça<\/strong>/);
    assert.match(html, /<span>Bistrô da Praça<\/span>/);
    assert.match(html, /src="http:\/\/localhost:3333\/uploads\/products\/banner.webp"/);
    assert.doesNotMatch(html, />MesaFlow</);
    assert.match(render({ ...data, name: null }), /<strong>MesaFlow<\/strong>/);
  } finally { globalThis.window = originalWindow; }
});

test("pagamento usa taxa recebida e omite taxa/isenção com zero", () => {
  for (const rate of [5, 0]) {
    const render = run(() => PaymentForm({ orderId: 1, total: 20, serviceFeeRate: rate, onClose() {}, onComplete() {} }));
    assert.equal(find(render(), n => n.props?.["aria-label"] === "Valor do pagamento 1").props.value, rate ? "21,00" : "20,00");
    const html = renderToStaticMarkup(render());
    assert.equal(html.includes("Taxa de serviço (5%)"), !!rate);
    assert.equal(html.includes("Cliente optou por não pagar"), !!rate);
  }
  const tree = run(() => PaymentModal({ orderId: 1, total: 20, onClose() {}, onComplete() {} }))();
  assert.ok(!find(tree, n => n.props?.children === "Confirmar e fechar"));
});

test("informações do restaurante carregam ao abrir, respeitam prop e falha mantém fallback", async () => {
  requests.length = 0;
  const render = run(() => RestaurantInfo({}));
  const dialog = find(render(), n => n.type === "dialog");
  let opened = 0;
  dialog.props.ref.current = { showModal() { opened++; } };
  await find(render(), n => n.props?.["aria-label"] === "Informações do restaurante").props.onClick();
  assert.equal(opened, 1);
  assert.match(requests[0].url, /\/settings\/public$/);
  assert.ok(renderToStaticMarkup(render()).includes("Mesa Flow"));
  const prop = run(() => RestaurantInfo({ details: { name: "Via prop" } }));
  find(prop(), n => n.type === "dialog").props.ref.current = { showModal() {} };
  const before = requests.length;
  await find(prop(), n => n.props?.["aria-label"] === "Informações do restaurante").props.onClick();
  assert.equal(requests.length, before);
  assert.ok(renderToStaticMarkup(prop()).includes("Via prop"));
  const fetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error("Offline"); };
    const failed = run(() => RestaurantInfo({}));
    find(failed(), n => n.type === "dialog").props.ref.current = { showModal() {} };
    await find(failed(), n => n.props?.["aria-label"] === "Informações do restaurante").props.onClick();
    assert.ok(renderToStaticMarkup(failed()).includes("Não informado"));
  } finally { globalThis.fetch = fetch; }
});


test("formulário é somente leitura para EMPLOYEE e mostra salvar para ADMIN", async () => {
  const { RestaurantSettingsForm } = await server.ssrLoadModule("/src/pages/admin/Settings/components/RestaurantSettingsForm.tsx");
  const hook = run(() => useRestaurantSettings(false));
  await hook().reload();
  const employee = renderToStaticMarkup(createElement(RestaurantSettingsForm, { state: hook(), editable: false }));
  assert.ok(employee.includes("readOnly"));
  assert.ok(!employee.includes("Salvar configurações"));
  assert.ok(employee.includes("Somente o administrador"));
  const admin = renderToStaticMarkup(createElement(RestaurantSettingsForm, { state: hook(), editable: true }));
  assert.ok(admin.includes("Salvar configurações"));
});

test("pagamento aguarda GET settings e permite tentar novamente após falha", async () => {
  const fetch = globalThis.fetch;
  globalThis.settingsEffects = [];
  try {
    globalThis.fetch = async () => Response.json({ message: "Configuração indisponível" }, { status: 503 });
    const render = run(() => PaymentModal({ orderId: 1, total: 20, onClose() {}, onComplete() {} }));
    render();
    globalThis.settingsEffects[0]();
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(renderToStaticMarkup(render()).includes("Configuração indisponível"));
    assert.ok(!find(render(), n => n.type === PaymentForm));
    globalThis.fetch = fetch;
    find(render(), n => n.props?.children === "Tentar de novo").props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    const form = render();
    assert.equal(form.type, PaymentForm);
    assert.equal(form.props.serviceFeeRate, 5);
  } finally { globalThis.fetch = fetch; delete globalThis.settingsEffects; }
});

test("fechamento mostra a mesa e a aba com todos os pedidos e horários da conta", () => {
  const accountOrders = [
    { id: 40, total: 37.4, time: "08:20", items: [{ name: "Suco", quantity: 2, unitPrice: 18.7 }] },
    { id: 41, total: 325.28, time: "08:32", items: [{ name: "Pizza", quantity: 1, unitPrice: 325.28 }] },
  ];
  const render = run(() => PaymentForm({ orderId: 41, total: 362.68, table: "Mesa 5", accountOrders, serviceFeeRate: 0, onClose() {}, onComplete() {} }));
  let html = renderToStaticMarkup(render());
  assert.ok(html.includes("Fechar conta · Mesa 5"));
  assert.ok(html.includes("Pedido #40") && html.includes("Pedido #41"));
  assert.ok(html.includes("Valor do pagamento 1"));
  find(render(), n => n.props?.role === "tab" && String(n.props.children).startsWith("Pedidos da mesa")).props.onClick();
  html = renderToStaticMarkup(render());
  assert.ok(html.includes("Enviado às 08:20") && html.includes("Enviado às 08:32"));
  assert.ok(html.includes("2× Suco"));
  assert.ok(!html.includes("Valor do pagamento 1"));
});
