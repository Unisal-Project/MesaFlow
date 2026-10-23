import { useEffect, useState } from "react";

import {
  fetchCategories,
  fetchProducts,
  type Category,
  type Product,
} from "@/services/menu.service";

import type { MenuCatalog } from "../types/menu.types";

export function useMenu(catalog?: MenuCatalog) {
  const [categories, setCategories] = useState<Category[]>(catalog?.categories ?? []);
  const [products, setProducts] = useState<Product[]>(catalog?.products ?? []);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    if (catalog) return;
    async function loadData() {
      const categoriesData = await fetchCategories();
      const productsData = await fetchProducts();

      setCategories(categoriesData);
      setProducts(productsData);
    }

    loadData();
  }, [catalog]);

  const query = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredProducts = products.filter((product) =>
    (activeCategory === "all" || product.categoryId === activeCategory) &&
    `${product.name} ${product.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(query),
  );

  const tabs = [
    { id: "all", label: "Todos" },
    ...categories.map((category) => ({
      id: category.id,
      label: category.name,
    })),
  ];

  return {
    searchQuery,
    setSearchQuery,
    categories,
    filteredProducts,
    activeCategory,
    setActiveCategory,
    tabs,
  };
}