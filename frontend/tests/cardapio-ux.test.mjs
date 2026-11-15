import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// Componentes e hooks rodam com hooks controlados (sem DOM): dá para chamar
// os handlers da árvore retornada e ver o efeito.
const hooked = [
  "/Products/components/ProductFormModal.tsx",
  "/Products/components/ProductRow.tsx",
  "/Products/hooks/useProducts.ts",
  "/Categories/hooks/useCategories.ts",
];
let server, run, ProductFormModal, ProductRow, useProducts, useCategories, emptyPromoForm, realModal;
const previous = { window: globalThis.window, localStorage: globalThis.localStorage, fetch: globalThis.fetch };
const confirms = [];
let confirmAnswer = true;

before(async () => {
  globalThis.window = {
    location: { protocol: "http:", hostname: "localhost", origin: "http://localhost:5173" },
    confirm: (text) => (confirms.push(text), confirmAnswer),
  };
  globalThis.localStorage = { getItem: () => null };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [{
      name: "controlled-cardapio-hooks",
      enforce: "pre",
      transform(code, id) {
        if (hooked.some((path) => id.endsWith(path)) && !id.includes("?real"))
          return code.replace('from "react"', 'from "/tests/helpers/hook-runtime.mjs"');
      },
    }],
  });
  const load = (path) => server.ssrLoadModule(path);
  ({ createHookRunner: run } = await load("/tests/helpers/hook-runtime.mjs"));
  ({ ProductFormModal } = await load("/src/pages/admin/Products/components/ProductFormModal.tsx"));
  ({ ProductRow } = await load("/src/pages/admin/Products/components/ProductRow.tsx"));
  ({ useProducts } = await load("/src/pages/admin/Products/hooks/useProducts.ts"));
  ({ useCategories } = await load("/src/pages/admin/Categories/hooks/useCategories.ts"));
  ({ emptyPromoForm } = await load("/src/utils/promotion.ts"));
  // Versão normal (React de verdade) para renderizar o HTML.
  ({ ProductFormModal: realModal } = await load("/src/pages/admin/Products/components/ProductFormModal.tsx?real"));
});

after(async () => {
  await server?.close();
  Object.assign(globalThis, previous);
});

const find = (node, match) => {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find(child, match);
      if (found) return found;
    }
    return undefined;
  }
  return match(node) ? node : find(node.props?.children, match);
};

const form = (patch = {}) => ({
  name: "Burger", category: "1", additionalCategoryIds: [], price: "20", quantity: "1",
  observation: "", imageUrl: "", trackStock: true, available: true, promo: emptyPromoForm, ...patch,
});

function modal(props) {
  let current = props.newProduct;
  const calls = { closed: 0 };
  const render = run(() =>
    ProductFormModal({
      categories: [{ id: "1", name: "Lanches" }], editingProductId: null, products: [],
      onSave() {}, onPhotoChange() {}, onDelete() {},
      ...props,
      newProduct: current,
      setNewProduct: (update) => { current = typeof update === "function" ? update(current) : update; },
      onClose: () => calls.closed++,
    }),
  );
  return { render, calls, form: () => current };
}

test("fechar com alterações pergunta antes de descartar; sem alterações fecha direto", () => {
  const backdrop = (tree) => tree.props.onMouseDown;
  const event = { target: 1, currentTarget: 1 };

  const clean = modal({ newProduct: form(), hasUnsavedChanges: false });
  backdrop(clean.render())(event);
  assert.equal(clean.calls.closed, 1);
  assert.equal(confirms.length, 0);

  const dirty = modal({ newProduct: form(), hasUnsavedChanges: true });
  confirmAnswer = false;
  backdrop(dirty.render())(event);
  assert.equal(dirty.calls.closed, 0);
  confirmAnswer = true;
  const cancel = find(dirty.render(), (node) => node.props?.children === "Cancelar");
  cancel.props.onClick();
  assert.equal(dirty.calls.closed, 1);
  assert.deepEqual(confirms, ["Descartar alterações?", "Descartar alterações?"]);
});

test("produto novo e categoria detectam alterações a partir do formulário aberto", () => {
  const products = run(() => useProducts([{ id: "1", name: "Lanches" }]));
  let hook = products();
  hook.openEditProduct({
    id: "8", name: "Suco", quantity: 4, categoryId: "1", additionalCategoryIds: [],
    imageUrl: "", observation: "", trackStock: true, available: true,
  });
  hook = products();
  // Bug antigo: o "novo produto" comparava com o formulário do produto editado antes.
  hook.openNewProduct();
  hook = products();
  assert.equal(hook.hasUnsavedChanges, false);
  hook.setNewProduct({ ...hook.newProduct, name: "Água" });
  assert.equal(products().hasUnsavedChanges, true);

  const categories = run(() => useCategories());
  let state = categories();
  state.openEditCategory({ id: "1", name: "Lanches", description: "", active: true, productCount: 0 });
  state = categories();
  assert.equal(state.hasUnsavedChanges, false);
  state.setCategoryForm({ ...state.categoryForm, name: "Lanches da casa" });
  assert.equal(categories().hasUnsavedChanges, true);
});

test("+ Nova categoria: Enter cria, seleciona e preserva o resto do formulário", async () => {
  const created = [];
  const view = modal({
    categories: [],
    newProduct: form({ category: "", name: "Suco natural", price: "9,90" }),
    onCreateCategory: async (name) => (created.push(name), { id: "9" }),
  });
  // Sem categorias o campo já aparece aberto.
  const field = () => find(view.render(), (node) => node.props?.id === "product-new-category");
  field().props.onChange({ target: { value: " Bebidas " } });
  let prevented = false;
  field().props.onKeyDown({ key: "Enter", preventDefault: () => (prevented = true) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(prevented, "Enter não envia o formulário do produto");
  assert.deepEqual(created, ["Bebidas"]);
  assert.equal(view.form().category, "9");
  assert.equal(view.form().name, "Suco natural");
  assert.equal(view.form().price, "9,90");
  assert.equal(field(), undefined);
});

test("useCategories.createCategory envia só o nome e adiciona à lista", async () => {
  const bodies = [];
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === "POST") {
      bodies.push(JSON.parse(options.body));
      return Response.json({ id: "9", name: "Bebidas", description: null, active: true });
    }
    return Response.json([]);
  };
  const categories = run(() => useCategories());
  const saved = await categories().createCategory(" Bebidas ");
  assert.equal(saved.id, "9");
  assert.deepEqual(bodies, [{ name: "Bebidas", description: null, active: true }]);
  assert.deepEqual(categories().categories.map((category) => category.name), ["Bebidas"]);
});

test("estoque na linha: campo vazio não grava; −/+ ajustam o saldo", () => {
  const updates = [];
  const render = run(() =>
    ProductRow({
      product: { id: "1", name: "Suco", category: "Bebidas", price: "R$ 5,00", finalPrice: "R$ 5,00", quantity: 12, trackStock: true, available: true },
      onUpdateQuantity: (id, quantity) => updates.push(quantity),
      onUpdateAvailability() {}, onEdit() {}, onDelete() {},
    }),
  );
  const input = () => find(render(), (node) => node.props?.id === "product-quantity-1");
  input().props.onChange({ target: { value: "" } });
  assert.deepEqual(updates, []);
  assert.equal(input().props.value, "", "o campo pode ficar vazio enquanto digita");
  input().props.onBlur();
  assert.equal(input().props.value, 12, "ao sair volta ao valor gravado");
  input().props.onChange({ target: { value: "15" } });
  find(render(), (node) => node.props?.["aria-label"] === "Diminuir estoque de Suco").props.onClick();
  find(render(), (node) => node.props?.["aria-label"] === "Aumentar estoque de Suco").props.onClick();
  assert.deepEqual(updates, [15, 11, 13]);
});

test("preço e desconto aceitam vírgula e a API recebe número", async () => {
  const bodies = [];
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method) {
      bodies.push(JSON.parse(options.body));
      return Response.json({ id: "5", name: "Suco", price: "12.50", stockQuantity: 1, categoryId: "1", trackStock: true, available: true });
    }
    return Response.json([]);
  };
  const products = run(() => useProducts([{ id: "1", name: "Lanches" }]));
  let hook = products();
  hook.openNewProduct();
  hook = products();
  hook.setNewProduct(form({
    name: "Suco", price: "12,50",
    promo: { ...emptyPromoForm, promoType: "AMOUNT", promoValue: "2,50", promoActive: true },
  }));
  await products().handleSaveProduct({ preventDefault() {} });
  assert.equal(bodies[0].price, 12.5);
  assert.equal(bodies[0].promoValue, 2.5);
});

test("formulário: promoção recolhida, mais opções e campo de dinheiro com R$", () => {
  const html = (newProduct) =>
    renderToStaticMarkup(createElement(realModal, {
      categories: [{ id: "1", name: "Lanches" }, { id: "2", name: "Bebidas" }],
      editingProductId: null, newProduct, products: [],
      setNewProduct() {}, onClose() {}, onSave() {}, onPhotoChange() {}, onDelete() {},
      onCreateCategory: async () => ({ id: "3" }),
    }));
  const plain = html(form());
  assert.match(plain, /Tem promoção\?/);
  assert.doesNotMatch(plain, /Desconto/);
  assert.match(plain, /<summary>Mais opções<\/summary>/);
  assert.match(plain, /class="field money-field"[^>]*for="product-price"/);
  assert.match(plain, /id="product-price"[^>]*inputMode="decimal"|inputMode="decimal"[^>]*id="product-price"/i);
  assert.match(plain, />Nova</);
  // Ordem: Nome → Categoria → Preço → Estoque → Foto → Promoção → Mais opções.
  const order = ["Nome do produto", "Categoria principal", "Preço (R$)", "Controlar estoque", "Imagem do produto", "Tem promoção?", "Mais opções"]
    .map((label) => plain.indexOf(label));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  const withPromo = html(form({ promo: { ...emptyPromoForm, promoValue: "10", promoActive: true } }));
  assert.match(withPromo, /Desconto \(%\)/);
});

test("nome digitado no + Nova categoria também pede confirmação ao fechar", () => {
  confirms.length = 0;
  confirmAnswer = false;
  const view = modal({
    categories: [], newProduct: form(), hasUnsavedChanges: false,
    onCreateCategory: async () => ({ id: "9" }),
  });
  const field = () => find(view.render(), (node) => node.props?.id === "product-new-category");
  view.render().props.onMouseDown({ target: 1, currentTarget: 1 });
  assert.equal(view.calls.closed, 1, "campo vazio fecha direto");
  field().props.onChange({ target: { value: "Bebidas" } });
  view.render().props.onMouseDown({ target: 1, currentTarget: 1 });
  assert.equal(view.calls.closed, 1);
  assert.deepEqual(confirms, ["Descartar alterações?"]);
  confirmAnswer = true;
});

test("produto salvo com falha na imagem: só a foto pendente conta como alteração", async () => {
  globalThis.URL.createObjectURL ??= () => "blob:foto";
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/image")) return Response.json({ message: "Falha ao enviar imagem" }, { status: 500 });
    if (options.method)
      return Response.json({ id: "5", name: "Suco", price: "12.50", stockQuantity: 1, categoryId: "1", trackStock: true, available: true, imageUrl: null });
    return Response.json([]);
  };
  const products = run(() => useProducts([{ id: "1", name: "Lanches" }]));
  let hook = products();
  hook.openNewProduct();
  hook = products();
  hook.setNewProduct(form({ name: "Suco", price: "12,50" }));
  products().handlePhotoChange({ target: { files: [new File(["x"], "suco.png", { type: "image/png" })] } });
  await products().handleSaveProduct({ preventDefault() {} });
  hook = products();
  assert.equal(hook.isProductModalOpen, true);
  assert.match(hook.error, /Falha ao enviar imagem/);
  assert.equal(hook.hasUnsavedChanges, true, "a foto ainda não foi enviada");
  hook.setNewProduct({ ...hook.newProduct, imageUrl: "" });
  assert.equal(products().hasUnsavedChanges, false, "o resto já está salvo");
});
