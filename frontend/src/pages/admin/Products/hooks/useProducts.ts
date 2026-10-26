import { useState, type ChangeEvent, type FormEvent } from "react";

import {
  emptyProductForm,
  initialProducts,
} from "../mocks/products.mock";

import type {
  MockProduct,
  NewProductForm,
} from "../types/product.types";

export function useProducts() {
  const [products, setProducts] = useState(initialProducts);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const [newProduct, setNewProduct] =
    useState<NewProductForm>(emptyProductForm);

  const [searchQuery, setSearchQuery] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("all");

  const [productToDelete, setProductToDelete] = useState<MockProduct | null>(
    null,
  );

  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");

  // Filtros
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");

  const filteredProducts = products.filter((product) => {
    const matchesSearch = `${product.name} ${product.category}`
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedSearch);

    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;

    return matchesSearch && matchesCategory &&
      (availabilityFilter === "all" || product.available === (availabilityFilter === "available"));
  }).sort((a, b) => sortOrder === "name" ? a.name.localeCompare(b.name, "pt-BR") : sortOrder === "stock" ? a.quantity - b.quantity : 0);

  // Atualizar disponibilidade
  const updateAvailability = (productId: number, available: boolean) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, available } : product,
      ),
    );
  };

  // Atualizar quantidade
  const updateQuantity = (productId: number, quantity: number) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, quantity } : product,
      ),
    );
  };

  // Fechar modal
  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProductId(null);
    setNewProduct(emptyProductForm);
  };

  // Abrir cadastro
  const openNewProduct = () => {
    setEditingProductId(null);
    setNewProduct(emptyProductForm);
    setIsProductModalOpen(true);
  };

  // Abrir edição
  const openEditProduct = (product: MockProduct) => {
    setEditingProductId(product.id);

    setNewProduct({
      name: product.name,
      quantity: String(product.quantity),
      price: product.price
        .replaceAll(".", "")
        .replace(",", ".")
        .replace(/[^\d.]/g, ""),
      observation: product.observation ?? "",
      category: product.category,
      imageUrl: product.imageUrl ?? "",
      available: product.available,
    });

    setIsProductModalOpen(true);
  };

  // Upload da imagem
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setNewProduct((current) => ({ ...current, imageUrl: "" }));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setNewProduct((current) => ({
        ...current,
        imageUrl: typeof reader.result === "string" ? reader.result : "",
      }));
    };

    reader.readAsDataURL(file);
  };

  // Salvar produto
  const handleSaveProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const quantity = Math.max(0, Number(newProduct.quantity));
    const price = Math.max(0, Number(newProduct.price));

    const formattedPrice = price.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });

    const productData = {
        name: newProduct.name.trim(),
        category: newProduct.category,
        price: formattedPrice,
        quantity,
        available: newProduct.available,
        observation: newProduct.observation.trim() || undefined,
        imageUrl: newProduct.imageUrl || undefined,
    };

    setProducts((currentProducts) => {
        if (editingProductId !== null) {
        return currentProducts.map((product) =>
            product.id === editingProductId
            ? { ...product, ...productData }
            : product,
        );
        }

        const nextId =
        Math.max(0, ...currentProducts.map((product) => product.id)) + 1;

        return [
        ...currentProducts,
        {
            id: nextId,
            ...productData,
        },
        ];
    });

    closeProductModal();
    };

  // Solicitar exclusão
  const requestProductDeletion = (product: MockProduct) => {
    closeProductModal();
    setProductToDelete(product);
  };

  // Confirmar exclusão
  const confirmProductDeletion = () => {
    if (!productToDelete) return;

    setProducts((currentProducts) =>
      currentProducts.filter((product) => product.id !== productToDelete.id),
    );

    setProductToDelete(null);
  };

  const renameProductCategory = (previousName: string, nextName: string) => {
    setProducts((current) => current.map((product) => product.category === previousName ? { ...product, category: nextName } : product));
    setCategoryFilter((current) => current === previousName ? nextName : current);
  };

  return {
    renameProductCategory,
    products,
    isProductModalOpen,
    editingProductId,
    newProduct,
    setNewProduct,
    searchQuery,
    setSearchQuery,
    availabilityFilter,
    setAvailabilityFilter,
    sortOrder,
    setSortOrder,
    categoryFilter,
    setCategoryFilter,
    productToDelete,
    setProductToDelete,
    normalizedSearch,
    filteredProducts,
    updateAvailability,
    updateQuantity,
    closeProductModal,
    openNewProduct,
    openEditProduct,
    handlePhotoChange,
    handleSaveProduct,
    requestProductDeletion,
    confirmProductDeletion,
  };
}