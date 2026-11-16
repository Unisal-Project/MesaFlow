import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
let server, buildMenuSections, uniqueActiveProducts, ProductFormModal, emptyPromoForm, promo;
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  ({ ProductFormModal } = await server.ssrLoadModule(
    "/src/pages/admin/Products/components/ProductFormModal.tsx",
  ));
  promo = await server.ssrLoadModule("/src/utils/promotion.ts");
  ({ emptyPromoForm } = promo);
  ({ buildMenuSections, uniqueActiveProducts } = await server.ssrLoadModule(
    "/src/pages/client/Menu/utils/menuSections.ts",
  ));
});
after(async () => {
  await server?.close();
});
const categories = [
  { id: "1", name: "Lanches", active: true },
  { id: "2", name: "Destaques", active: true },
  { id: "3", name: "Promoções", active: true },
  { id: "4", name: "Oculta", active: false },
];
const product = {
  id: "10",
  name: "Salpi Bacon",
  categoryId: "1",
  additionalCategoryIds: ["2", "3", "4"],
  active: true,
  available: true,
};
test("same product appears in principal, highlights and promotions with original ID", () => {
  const sections = buildMenuSections(categories, [product]);
  assert.deepEqual(
    sections.map((section) => section.id),
    ["menu-featured", "menu-promotions", "1"],
  );
  for (const section of sections)
    assert.deepEqual(
      section.products.map((item) => item.id),
      ["10"],
    );
  assert.deepEqual(
    uniqueActiveProducts([product, product]).map((item) => item.id),
    ["10"],
  );
});
test("legacy products, inactive categories, unavailable products and repeated memberships", () => {
  const legacy = { ...product, id: "11", additionalCategoryIds: undefined };
  const unavailable = {
    ...product,
    id: "12",
    available: false,
    additionalCategoryIds: ["2", "2", "1"],
  };
  const inactive = { ...product, id: "13", active: false };
  const sections = buildMenuSections(categories, [
    legacy,
    unavailable,
    inactive,
  ]);
  assert.deepEqual(
    sections[0].products.map((item) => item.id),
    ["12"],
  );
  assert.equal(sections[0].products[0].available, false);
  assert.deepEqual(
    sections[2].products.map((item) => item.id),
    ["11", "12"],
  );
  assert.deepEqual(
    buildMenuSections(
      categories.map((category) => ({ ...category, active: false })),
      [product],
    ).flatMap((section) => section.products),
    [],
  );
});

test("menu omits Todos and excludes products without active categories", () => {
  const hidden = {
    ...product,
    id: "14",
    categoryId: "4",
    additionalCategoryIds: [],
  };
  const extraOnly = {
    ...product,
    id: "15",
    categoryId: "4",
    additionalCategoryIds: ["2"],
  };
  const sections = buildMenuSections(categories, [
    product,
    product,
    hidden,
    extraOnly,
  ]);
  assert.equal(sections.some((section) => section.id === "menu-all" || section.name === "Todos"), false);
  assert.deepEqual(
    sections[0].products.map((item) => item.id),
    ["10", "15"],
  );
});

test("admin form restores principal and additional selections from API IDs", () => {
  const html = renderToStaticMarkup(
    createElement(ProductFormModal, {
      categories,
      editingProductId: "10",
      newProduct: {
        name: product.name,
        category: "1",
        additionalCategoryIds: ["2", "3"],
        price: "25",
        quantity: "10",
        observation: "",
        imageUrl: "",
        trackStock: true,
        available: true,
        promo: emptyPromoForm,
      },
      products: [],
      setNewProduct() {},
      onClose() {},
      onSave() {},
      onPhotoChange() {},
      onDelete() {},
    }),
  );
  assert.match(html, /value="1" selected="">Lanches/);
  const extras = html.slice(
    html.indexOf("<fieldset"),
    html.indexOf("</fieldset>"),
  );
  assert.doesNotMatch(extras, /Lanches/);
  assert.equal((extras.match(/checked=""/g) ?? []).length, 2);
  assert.match(extras, /Destaques/);
  assert.match(extras, /Promoções/);
});

test("seção Promoções une produtos com promoção e a categoria por nome, sem duplicar", () => {
  const discounted = {
    id: "11",
    name: "Suco",
    categoryId: "1",
    active: true,
    available: true,
    promotion: { type: "PERCENT", value: "20", source: "PRODUCT" },
  };
  const sections = buildMenuSections(categories, [
    product,
    discounted,
    { ...discounted, id: "12", categoryId: "4", additionalCategoryIds: [] },
  ]);
  const promotions = sections.find((s) => s.id === "menu-promotions");
  // 12 está só em categoria inativa: fica fora do cardápio.
  assert.deepEqual(
    promotions.products.map((p) => p.id),
    ["11", "10"],
  );
});

test("prévia admin herda a promoção da categoria e mostra selo e preço riscado", () => {
  const html = renderToStaticMarkup(
    createElement(ProductFormModal, {
      categories: [
        {
          id: "1",
          name: "Lanches",
          active: true,
          promoType: "PERCENT",
          promoValue: "50.00",
          promoActive: true,
          promoStartsAt: null,
          promoEndsAt: null,
        },
      ],
      editingProductId: null,
      newProduct: {
        name: "Burger",
        category: "1",
        additionalCategoryIds: [],
        price: "20",
        quantity: "1",
        observation: "",
        imageUrl: "",
        trackStock: true,
        available: true,
        promo: emptyPromoForm,
      },
      products: [],
      setNewProduct() {},
      onClose() {},
      onSave() {},
      onPhotoChange() {},
      onDelete() {},
    }),
  );
  assert.match(html, /Herdando promoção da categoria/);
  assert.match(html, /-50%/);
  assert.match(html, /<s class="product-card-old-price">.*R\$ 20,00/);
  assert.match(html, /R\$ 10,00/);
});

test("util de promoção: selo, envio e prévia com produto vencendo categoria", () => {
  assert.equal(promo.promotionLabel({ type: "PERCENT", value: "20" }), "-20%");
  assert.match(promo.promotionLabel({ type: "AMOUNT", value: "5" }), /^-R\$\s5,00$/);
  assert.deepEqual(promo.toPromoInput({ ...emptyPromoForm, promoActive: true }), {
    promoType: null,
    promoValue: null,
    promoActive: false,
    promoStartsAt: null,
    promoEndsAt: null,
  });
  const own = { ...emptyPromoForm, promoType: "AMOUNT", promoValue: "2", promoActive: true };
  const category = {
    promoType: "PERCENT",
    promoValue: "50",
    promoActive: true,
    promoStartsAt: null,
    promoEndsAt: null,
  };
  assert.equal(promo.previewPrice("10", own, category).finalPrice, "8.00");
  assert.equal(
    promo.previewPrice("10", { ...own, promoEndsAt: "2000-01-01T00:00" }, category)
      .promotion.source,
    "CATEGORY",
  );
});


test("Destaque une featured e categoria legada, filtra ativos e não duplica", () => {
  const marked = { ...product, id: "20", featured: true, additionalCategoryIds: [] };
  const both = { ...product, featured: true };
  const extraActive = { ...marked, id: "21", categoryId: "4", additionalCategoryIds: ["1"] };
  const hidden = { ...marked, id: "22", categoryId: "4" };
  const sections = buildMenuSections(categories, [marked, both, both, extraActive, hidden, { ...marked, id: "23", active: false }, { ...product, id: "24" }]);
  assert.deepEqual(sections.find(s => s.id === "menu-featured").products.map(p => p.id), ["20", "10", "21", "24"]);
  assert.deepEqual(buildMenuSections(categories, [hidden]).find(s => s.id === "menu-featured").products, []);
  assert.deepEqual(buildMenuSections([], [marked]).find(s => s.id === "menu-featured").products, []);
});


test("sem destaque, saída preserva exatamente o contrato do commit 9be5811", () => {
  const plain = { ...product, additionalCategoryIds: [] };
  // Saída original conferida no commit 9be5811, inclusive seções especiais vazias.
  for (const products of [[], [plain], [{ ...plain, featured: false }]]) {
    assert.deepEqual(buildMenuSections(categories, products), [
      { id: "menu-featured", name: "Destaque", products: [] },
      { id: "menu-promotions", name: "Promoções", products: [] },
      { id: "1", name: "Lanches", products },
    ]);
  }
});
