import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
let server, buildMenuSections, uniqueActiveProducts, ProductFormModal;
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  ({ ProductFormModal } = await server.ssrLoadModule(
    "/src/pages/admin/Products/components/ProductFormModal.tsx",
  ));
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
        available: true,
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
