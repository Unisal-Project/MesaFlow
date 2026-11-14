import type { Category, Product } from "@/services/menu.service";

export function uniqueActiveProducts(products: Product[]) {
  return [
    ...new Map(
      products
        .filter((product) => product.active)
        .map((product) => [product.id, product]),
    ).values(),
  ];
}

export function buildMenuSections(categories: Category[], products: Product[]) {
  const activeCategories = categories.filter((category) => category.active);
  const categoryIds = new Set(activeCategories.map((category) => category.id));
  const grouped = new Map<string, Product[]>();
  for (const product of uniqueActiveProducts(products)) {
    for (const id of new Set([
      product.categoryId,
      ...(product.additionalCategoryIds ?? []),
    ])) {
      if (!categoryIds.has(id)) continue;
      const group = grouped.get(id) ?? [];
      group.push(product);
      grouped.set(id, group);
    }
  }
  const result = activeCategories.map((category) => ({
    id: category.id,
    name: category.name,
    products: grouped.get(category.id) ?? [],
  }));
  const normalize = (name: string) =>
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  const featured = result.filter((section) =>
    ["destaque", "destaques"].includes(normalize(section.name)),
  );
  const promotions = result.filter((section) =>
    ["promocao", "promocoes"].includes(normalize(section.name)),
  );
  const specialIds = new Set(
    [...featured, ...promotions].map((section) => section.id),
  );
  return [
    {
      id: "menu-featured",
      name: "Destaque",
      products: uniqueActiveProducts(
        featured.flatMap((section) => section.products),
      ),
    },
    {
      id: "menu-promotions",
      name: "Promoções",
      products: uniqueActiveProducts(
        promotions.flatMap((section) => section.products),
      ),
    },
    ...result.filter((section) => !specialIds.has(section.id)),
  ];
}
