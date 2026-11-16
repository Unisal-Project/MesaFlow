import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
let server, run, DeleteCategoryModal, useCategories;
const old = { window: globalThis.window, localStorage: globalThis.localStorage, fetch: globalThis.fetch };
before(async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" }, confirm: () => true };
  globalThis.localStorage = { getItem: () => null };
  server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, ws: false }, optimizeDeps: { noDiscovery: true },
    plugins: [{ name: "category-delete-controlled", enforce: "pre", transform(code, id) {
      if (["/Categories/components/DeleteCategoryModal.tsx", "/Categories/hooks/useCategories.ts"].some(path => id.endsWith(path))) return code.replace('from "react"', 'from "/tests/helpers/hook-runtime.mjs"');
    } }] });
  ({ createHookRunner: run } = await server.ssrLoadModule("/tests/helpers/hook-runtime.mjs"));
  ({ DeleteCategoryModal } = await server.ssrLoadModule("/src/pages/admin/Categories/components/DeleteCategoryModal.tsx"));
  ({ useCategories } = await server.ssrLoadModule("/src/pages/admin/Categories/hooks/useCategories.ts"));
});
after(async () => { await server?.close(); Object.assign(globalThis, old); });
function find(tree, predicate) { if (Array.isArray(tree)) return tree.map(item => find(item, predicate)).find(Boolean); if (!tree?.props) return undefined; return predicate(tree) ? tree : find(tree.props.children, predicate); }
const category = { id: "1", name: "Teste" };

test("sem produtos visíveis exclui direto, sem destino ou exigência de outra categoria", () => {
  const calls = [];
  const render = run(() => DeleteCategoryModal({ category, categories: [category], products: [], onClose() {}, onConfirm: (...args) => calls.push(args) }));
  const button = find(render(), item => item.props?.children === "Excluir");
  assert.equal(button.props.disabled, false);
  button.props.onClick();
  assert.deepEqual(calls, [[]]);
  assert.ok(!renderToStaticMarkup(render()).includes("Crie outra categoria"));
});

test("modo excluir produtos confirma antes de enviar deleteProducts=true e recarrega categorias", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), method: options.method ?? "GET" });
    return options.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(requests.some(call => call.method === "DELETE") ? [] : [category]);
  };
  const hook = run(() => useCategories());
  await hook().reload(); hook().requestCategoryDeletion(hook().categories[0]);
  const calls = [];
  const render = run(() => DeleteCategoryModal({ category, categories: [category], products: [{ id: "10", name: "Suco" }], onClose() {}, onConfirm: (...args) => { calls.push(args); } }));
  find(render(), item => item.props?.label === "Excluir a categoria e os produtos dela").props.onChange();
  assert.ok(renderToStaticMarkup(render()).includes("O histórico de pedidos e os relatórios são mantidos"));
  window.confirm = () => false;
  const button = () => find(render(), item => item.props?.children === "Excluir categoria e produtos");
  button().props.onClick(); assert.equal(calls.length, 0);
  window.confirm = () => true;
  assert.equal(button().props.disabled, false);
  assert.equal(button().props.variant, "danger");
  button().props.onClick(); assert.deepEqual(calls, [[undefined, [], true]]);
  await hook().confirmCategoryDeletion(...calls[0]);
  assert.match(requests.find(call => call.method === "DELETE").url, /\/categories\/1\?deleteProducts=true$/);
  assert.equal(requests.at(-1).method, "GET");
  assert.deepEqual(hook().categories, []);
});
