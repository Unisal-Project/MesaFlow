import { useEffect, useState } from "react";

import {
  fetchCategories,
  fetchProducts,
  type Category,
  type Product,
} from "@/services/menu.service";

import type { MenuCatalog } from "../types/menu.types";

export function useMenu(catalog?: MenuCatalog) {
  const [remoteCategories, setCategories] = useState<Category[]>([]);
  const [remoteProducts, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [remoteLoading, setIsLoading] = useState(true);
  const [remoteError, setError] = useState<string | null>(null);

  useEffect(() => {
    if (catalog) return;
    const controller = new AbortController();
    async function loadData() {
      try {
        const [categoriesData, productsData] = await Promise.all([
          fetchCategories(controller.signal), fetchProducts(controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setCategories(categoriesData);
        setProducts(productsData);
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Não foi possível carregar o cardápio");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [catalog]);

  const categories = catalog?.categories ?? remoteCategories;
  const products = catalog?.products ?? remoteProducts;
  const isLoading = !catalog && remoteLoading;
  const error = catalog ? null : remoteError;
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
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    categories,
    filteredProducts,
    activeCategory,
    setActiveCategory,
    tabs,
  };
}
