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
  "/Products/components/ProductRowPreview.tsx",
  "/Products/hooks/useProducts.ts",
  "/Categories/hooks/useCategories.ts",
];
let server, run, ProductFormModal, ProductRow, useProducts, useCategories, emptyPromoForm, realModal, PromotionFields, ProductRowPreview;
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
        if (hooked.some((path) => id.endsWith(path)) && !id.includes("?real")) {
          const transformed = code.replace('from "react"', 'from "/tests/helpers/hook-runtime.mjs"');
          if (id.endsWith("/ProductRowPreview.tsx"))
            return transformed.replace("useEffect, ", "") + '\nconst useEffect = fn => globalThis.productPreviewEffects?.push(fn);';
          return transformed;
        }
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
  ({ PromotionFields } = await load("/src/pages/admin/Products/components/PromotionFields.tsx"));
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

test("fotos: salvar remove as que saíram, envia as novas e define a capa", async () => {
  // Servidor simulado com as 3 colunas de foto.
  let server = ["/uploads/a.webp", "/uploads/b.webp"];
  const calls = [];
  const product = () => ({
    id: "8", name: "Suco", price: "12.00", stockQuantity: 1, categoryId: "1", trackStock: true,
    available: true, imageUrl: server[0] ?? null, imageUrls: server,
  });
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(String(url)).pathname.replace(/^\/api\/v1/, "") + new URL(String(url)).search;
    calls.push(`${options.method ?? "GET"} ${path}`);
    const slot = Number(path.match(/image\/(\d)/)?.[1]);
    if (options.method === "DELETE") server = server.filter((_, index) => index !== slot - 1);
    if (path.endsWith("/cover")) [server[0], server[slot - 1]] = [server[slot - 1], server[0]];
    if (options.method === "POST") server = [...server, "/uploads/new.webp"];
    return Response.json(options.method ? product() : [product()]);
  };
  globalThis.URL.createObjectURL = () => "blob:nova";
  const products = run(() => useProducts([{ id: "1", name: "Lanches" }]));
  await products().reload();
  const [record] = products().products;
  products().openEditProduct(record);
  let hook = products();
  assert.equal(hook.newProduct.moreImages.length, 1, "a 2ª foto do servidor entra no formulário");
  hook.removePhoto(hook.newProduct.imageUrl);
  products().handlePhotoChange({ target: { files: [new File(["x"], "nova.png", { type: "image/png" })] } });
  products().setCoverPhoto("blob:nova");
  hook = products();
  assert.equal(hook.newProduct.imageUrl, "blob:nova");
  calls.length = 0;
  await hook.handleSaveProduct({ preventDefault() {} });
  assert.deepEqual(calls, [
    "PATCH /products/8",
    "DELETE /products/8/image/1",
    "POST /products/8/image?slot=2",
    "PATCH /products/8/image/2/cover",
  ]);
  assert.deepEqual(server, ["/uploads/new.webp", "/uploads/b.webp"]);
  assert.equal(products().isProductModalOpen, false);
});

test("fotos: no máximo 3; a 4ª é ignorada e o formulário mostra capa e ações", () => {
  let next = 0;
  globalThis.URL.createObjectURL = () => `blob:${++next}`;
  const products = run(() => useProducts([{ id: "1", name: "Lanches" }]));
  products().openNewProduct();
  for (let index = 0; index < 4; index++)
    products().handlePhotoChange({ target: { files: [new File(["x"], `${index}.png`)] } });
  const { newProduct } = products();
  assert.equal(newProduct.imageUrl, "blob:1");
  assert.deepEqual(newProduct.moreImages, ["blob:2", "blob:3"]);

  const html = renderToStaticMarkup(createElement(realModal, {
    categories: [{ id: "1", name: "Lanches" }], editingProductId: null, newProduct, products: [],
    setNewProduct() {}, onClose() {}, onSave() {}, onPhotoChange() {}, onDelete() {},
    onRemovePhoto() {}, onSetCoverPhoto() {},
  }));
  assert.equal((html.match(/>Capa</g) ?? []).length, 1);
  assert.equal((html.match(/Definir como capa/g) ?? []).length, 2);
  assert.equal((html.match(/Remover foto/g) ?? []).length, 3);
  assert.doesNotMatch(html, /Adicionar imagem do produto/, "sem caixa de envio com 3 fotos");
});


test("PromotionFields sem recolhimento mostra os campos sem switch; padrão continua recolhido", () => {
  const render = (props = {}) => renderToStaticMarkup(createElement(PromotionFields, {
    idPrefix: "test", value: emptyPromoForm, onChange() {}, ...props,
  }));
  assert.match(render(), /Tem promoção\?/);
  assert.doesNotMatch(render(), /Desconto/);
  const expanded = render({ collapsible: false });
  assert.doesNotMatch(expanded, /Tem promoção\?/);
  assert.match(expanded, /Desconto/);
});

test("fotos: nova capa preserva exatamente a ordem [C nova, A, B]", async () => {
  let photos = ["/uploads/a.webp", "/uploads/b.webp"];
  const product = () => ({ id: "8", name: "Suco", price: "12.00", stockQuantity: 1,
    categoryId: "1", trackStock: true, available: true, imageUrl: photos[0], imageUrls: [...photos] });
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    if (options.method === "POST") photos.push("/uploads/c.webp");
    if (path.endsWith("/cover")) {
      const index = Number(path.match(/image\/(\d)/)[1]) - 1;
      [photos[0], photos[index]] = [photos[index], photos[0]];
    }
    return Response.json(options.method ? product() : [product()]);
  };
  globalThis.URL.createObjectURL = () => "blob:c";
  const products = run(() => useProducts());
  await products().reload();
  products().openEditProduct(products().products[0]);
  products().handlePhotoChange({ target: { files: [new File(["c"], "c.png")] } });
  // Estado solicitado, que também pode resultar de outras escolhas de capa.
  const originalPhotos = [products().newProduct.imageUrl, ...products().newProduct.moreImages].filter(url => url !== "blob:c");
  products().setNewProduct({ ...products().newProduct, imageUrl: "blob:c", moreImages: originalPhotos });
  await products().handleSaveProduct({ preventDefault() {} });
  assert.deepEqual(photos, ["/uploads/c.webp", "/uploads/a.webp", "/uploads/b.webp"]);
});

test("fotos: libera blobs removidos, salvos e descartados; não revoga URLs do servidor", async () => {
  let next = 0;
  const revoked = [];
  const previousRevoke = URL.revokeObjectURL;
  globalThis.URL.createObjectURL = () => `blob:cleanup-${++next}`;
  globalThis.URL.revokeObjectURL = url => revoked.push(url);
  globalThis.fetch = async (url, options = {}) => {
    const photo = String(url).includes("/image") ? "/uploads/saved.webp" : null;
    const product = { id: "8", name: "Suco", price: "12.00", stockQuantity: 1, categoryId: "1",
      trackStock: true, available: true, imageUrl: photo, imageUrls: photo ? [photo] : [] };
    return Response.json(options.method ? product : []);
  };
  const products = run(() => useProducts());
  const add = () => products().handlePhotoChange({ target: { files: [new File(["x"], "x.png")] } });
  try {
    products().openNewProduct();
    add(); products().removePhoto(products().newProduct.imageUrl);
    assert.deepEqual(revoked, ["blob:cleanup-1"]);
    products().removePhoto("/uploads/old.webp");
    assert.equal(revoked.length, 1);
    add(); products().closeProductModal();
    assert.deepEqual(revoked, ["blob:cleanup-1", "blob:cleanup-2"]);
    products().openNewProduct();
    products().setNewProduct(form());
    add();
    await products().handleSaveProduct({ preventDefault() {} });
    assert.equal(products().isProductModalOpen, false);
    assert.deepEqual(revoked, ["blob:cleanup-1", "blob:cleanup-2", "blob:cleanup-3"]);
  } finally { URL.revokeObjectURL = previousRevoke; }
});


test("nome do produto abre só o cartão de prévia e o X fecha", async () => {
  const product = { id: "9", name: "Suco", category: "Bebidas", price: "R$ 10,00",
    finalPrice: "R$ 8,00", priceValue: 10, finalPriceValue: 8, promotion: { type: "PERCENT", value: "20", source: "PRODUCT" },
    imageUrl: "/uploads/suco.webp", observation: "Suco natural", quantity: 4, trackStock: true, available: true };
  const render = run(() => ProductRow({ product, onUpdateQuantity() {}, onUpdateAvailability() {}, onEdit() {}, onDelete() {} }));
  const button = find(render(), n => n.props?.["aria-label"] === "Ver prévia de Suco");
  assert.ok(button, "nome precisa abrir a prévia no desktop/tablet");
  assert.ok(find(render(), n => n.props?.className === "product-name-mobile" && n.props.children === "Suco"));
  let nameFocused = false;
  button.props.onClick({ currentTarget: { focus() { nameFocused = true; } } });
  assert.ok(nameFocused, "nome recebe foco antes do dialog para ser restaurado também no clique");
  const preview = find(render(), n => n.props?.product === product && n.props?.onClose);
  assert.ok(preview, "clicar no nome monta o pop-up");
  ({ ProductRowPreview } = await server.ssrLoadModule("/src/pages/admin/Products/components/ProductRowPreview.tsx"));
  const dialog = run(() => ProductRowPreview(preview.props))();
  // A prévia é o card do cardápio do cliente (MenuProductCard): mesmas classes e formatação.
  const card = find(dialog, n => n.props?.description === product.observation);
  assert.equal(card.props.finalPrice, 8);
  assert.equal(card.props.price, 10);
  assert.equal(card.props.imageUrl, product.imageUrl);
  const html = renderToStaticMarkup(createElement(card.type, card.props));
  assert.match(html, /class="menu-card-preview client-workspace"/);
  assert.match(html, /client-menu-products/);
  assert.match(html, /<img class="client-menu-photo" src="http:\/\/localhost:3333\/uploads\/suco\.webp"/);
  assert.match(html, /Suco natural/);
  assert.match(html, /product-card-old-price/);
  assert.match(html, /R\$ 10,00/);
  assert.match(html, /R\$ 8,00/);
  assert.match(html, /-20%/);
  assert.ok(!html.includes("product-card-select"), "só cartão, sem abrir detalhe");
  assert.ok(!html.includes("food-photo"), "sem o card vertical antigo");
  const noPhoto = renderToStaticMarkup(createElement(card.type, { ...card.props, imageUrl: undefined }));
  assert.match(noPhoto, /<div class="client-menu-photo" aria-hidden="true">/);
  find(dialog, n => n.props?.["aria-label"] === "Fechar prévia").props.onClick();
  assert.equal(find(render(), n => n.props?.product === product && n.props?.onClose), undefined);
  // A linha repassa estoque e disponibilidade (a matriz completa está no teste do MenuProductCard).
  const soldOut = run(() => ProductRowPreview({ product: { ...product, trackStock: true, quantity: 0 }, onClose() {} }))();
  const soldOutCard = find(soldOut, n => n.props?.description === product.observation);
  assert.match(renderToStaticMarkup(createElement(soldOutCard.type, soldOutCard.props)), /product-card indisponivel[\s\S]*Esgotado/);
});

test("prévia gerencia foco/rolagem, fecha por Esc/fundo e ao entrar no celular", async () => {
  ({ ProductRowPreview } = await server.ssrLoadModule("/src/pages/admin/Products/components/ProductRowPreview.tsx"));
  const previousDocument = globalThis.document;
  const previousMatchMedia = globalThis.window.matchMedia;
  const media = { matches: false, addEventListener(_event, fn) { this.changed = fn; }, removeEventListener() { this.changed = null; } };
  let returned = 0, focused = 0, opened = 0, closed = 0, requests = 0;
  globalThis.window.matchMedia = () => media;
  globalThis.document = { activeElement: { focus() { returned++; } }, body: { style: { overflow: "auto" } } };
  globalThis.productPreviewEffects = [];
  try {
    const dialog = run(() => ProductRowPreview({ product: { name: "Suco" }, onClose() { requests++; } }))();
    dialog.props.ref.current = { showModal() { opened++; }, close() { closed++; }, focus() { focused++; } };
    const cleanup = globalThis.productPreviewEffects[0]();
    assert.equal(opened, 1); assert.equal(focused, 1);
    assert.equal(document.body.style.overflow, "hidden");
    let prevented = false;
    dialog.props.onCancel({ preventDefault() { prevented = true; } });
    assert.ok(prevented); assert.equal(requests, 1);
    dialog.props.onClick({ target: 1, currentTarget: 2 });
    assert.equal(requests, 1, "clique no cartão não fecha");
    dialog.props.onClick({ target: 1, currentTarget: 1 });
    assert.equal(requests, 2);
    media.matches = true; media.changed();
    assert.equal(requests, 3);
    cleanup();
    assert.equal(returned, 1); assert.equal(closed, 1);
    assert.equal(document.body.style.overflow, "auto");
    assert.equal(media.changed, null);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window.matchMedia = previousMatchMedia;
    delete globalThis.productPreviewEffects;
  }
});

test("foto admin aceita AVIF e avatar usa thumb com fallback para capa", () => {
  const html = renderToStaticMarkup(createElement(realModal, {
    categories: [], editingProductId: null, newProduct: form(), products: [],
    setNewProduct() {}, onClose() {}, onSave() {}, onPhotoChange() {}, onDelete() {},
  }));
  assert.match(html, /accept="[^"]*image\/avif/);
  const product = { id: "1", name: "Suco", imageUrl: "/uploads/a.webp", thumbUrl: "/uploads/a-thumb.webp" };
  const render = run(() => ProductRow({ product }));
  const image = find(render(), n => n.type === "img");
  assert.equal(image.props.src, product.thumbUrl);
  const element = { src: product.thumbUrl, getAttribute() { return this.src; } };
  image.props.onError({ currentTarget: element });
  assert.equal(element.src, product.imageUrl);
  const fallback = run(() => ProductRow({ product: { ...product, thumbUrl: undefined } }))();
  assert.equal(find(fallback, n => n.type === "img").props.src, product.imageUrl);
});


test("miniaturas do formulário usam thumb, mantendo URL original para envio e fallback", () => {
  const original = "/uploads/a.webp", thumb = "/uploads/a-thumb.webp";
  const state = modal({ newProduct: form({ imageUrl: original, photoThumbs: { [original]: thumb } }) });
  const image = find(state.render(), n => n.type === "img" && n.props.alt === "Foto 1 do produto");
  assert.equal(image.props.src, thumb);
  assert.equal(state.form().imageUrl, original);
  const element = { src: thumb, getAttribute() { return this.src; } };
  image.props.onError({ currentTarget: element });
  assert.equal(element.src, original);
  image.props.onError({ currentTarget: element });
  assert.equal(element.src, original);
});


test("estrela salva PATCH, reflete aria-pressed e permite remover destaque", async () => {
  let record = { id: "30", name: "Suco", price: "10", categoryId: "1", trackStock: false, stockQuantity: 0, available: true, active: true, featured: false };
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    if (!options.method) return Response.json([record]);
    const body = JSON.parse(options.body);
    requests.push([options.method, new URL(url).pathname, body]);
    record = { ...record, ...body };
    return Response.json(record);
  };
  const products = run(() => useProducts());
  await products().reload();
  const row = run(() => ProductRow({ product: products().products[0], onUpdateFeatured: products().updateFeatured }));
  let star = find(row(), n => n.props?.["aria-label"] === "Destacar Suco");
  assert.ok(star);
  assert.equal(star.props["aria-pressed"], false);
  star.props.onClick();
  assert.equal(products().products[0].featured, true, "reflete otimisticamente");
  await new Promise(resolve => setImmediate(resolve));
  star = find(row(), n => n.props?.["aria-label"] === "Remover destaque de Suco");
  assert.equal(star.props["aria-pressed"], true);
  products().openEditProduct(products().products[0]);
  assert.equal(products().newProduct.featured, true);
  star.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(products().products[0].featured, false);
  assert.deepEqual(requests, [["PATCH", "/api/v1/products/30", { featured: true }], ["PATCH", "/api/v1/products/30", { featured: false }]]);
});

test("falha ao destacar desfaz estrela e expõe erro", async () => {
  globalThis.fetch = async (_url, options = {}) => options.method
    ? Response.json({ message: "Não foi possível destacar" }, { status: 400 })
    : Response.json([{ id: "30", name: "Suco", price: "10", featured: false }]);
  const products = run(() => useProducts());
  await products().reload();
  products().updateFeatured("30", true);
  assert.equal(products().products[0].featured, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(products().products[0].featured, false);
  assert.match(products().error, /Não foi possível destacar/);
});

test("formulário começa sem destaque, switch altera e envia featured ao criar/editar", async () => {
  const requests = [];
  globalThis.fetch = async (_url, options = {}) => {
    if (!options.method) return Response.json([]);
    const body = JSON.parse(options.body);
    requests.push([options.method, body.featured]);
    return Response.json({ id: "31", ...body, price: "10", imageUrl: null });
  };
  const products = run(() => useProducts());
  products().openNewProduct();
  assert.equal(products().newProduct.featured, false);
  products().setNewProduct({ ...products().newProduct, name: "Suco", category: "1", price: "10" });
  const render = run(() => ProductFormModal({ newProduct: products().newProduct, setNewProduct: products().setNewProduct, categories: [], products: [] }));
  const field = find(render(), n => n.props?.label === "Destaque no cardápio");
  assert.ok(field);
  field.props.onChange({ target: { checked: true } });
  await products().handleSaveProduct({ preventDefault() {} });
  products().openEditProduct(products().products[0]);
  assert.equal(products().newProduct.featured, true);
  products().setNewProduct({ ...products().newProduct, featured: false });
  await products().handleSaveProduct({ preventDefault() {} });
  assert.deepEqual(requests, [["POST", true], ["PATCH", false]]);
});

test("MenuProductCard segue a regra do cliente: esgotado × indisponível × sem controle de estoque", async () => {
  const { MenuProductCard } = await server.ssrLoadModule("/src/pages/admin/Products/components/MenuProductCard.tsx");
  const html = (overrides) => renderToStaticMarkup(createElement(MenuProductCard, {
    name: "Suco", finalPrice: 8, price: 10, promotion: null, available: true, trackStock: true, quantity: 3, ...overrides,
  }));
  assert.ok(!html({}).includes("indisponivel"));
  assert.ok(!html({ trackStock: false, quantity: 0 }).includes("indisponivel"), "sem controle de estoque nunca esgota");
  for (const [overrides, label] of [
    [{ quantity: 0 }, "Esgotado"],
    [{ quantity: -1 }, "Esgotado"],
    [{ available: false, quantity: 5 }, "Indisponível"],
    [{ available: false, quantity: 0 }, "Indisponível"],
  ]) {
    const markup = html(overrides);
    assert.match(markup, /class="product-card indisponivel"/);
    assert.ok(markup.includes(label) && !markup.includes(label === "Esgotado" ? "Indisponível" : "Esgotado"), label);
  }
  // Foto: URL relativa é resolvida como no cliente; sem foto vem o degradê do cliente.
  assert.match(html({ imageUrl: "/uploads/suco.webp" }), /<img class="client-menu-photo" src="http:\/\/localhost:3333\/uploads\/suco\.webp"/);
  assert.match(html({ imageUrl: "blob:http://localhost/abc" }), /src="blob:http:\/\/localhost\/abc"/);
  assert.match(html({}), /<div class="client-menu-photo" aria-hidden="true">/);
});
