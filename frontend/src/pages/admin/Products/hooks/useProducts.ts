import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  fetchProducts,
  removeProduct,
  saveProduct,
  uploadProductImage,
  type Product,
} from "@/services/menu.service";

import type { AdminProduct, NewProductForm } from "../types/product.types";

export const emptyProductForm: NewProductForm = {
  name: "",
  quantity: "0",
  price: "",
  observation: "",
  category: "",
  imageUrl: "",
  available: true,
};

type CategoryRef = { id: string; name: string };

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível acessar o servidor";

const formatPrice = (value: string) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Tempo de espera antes de gravar o estoque digitado.
const STOCK_SAVE_DELAY = 600;

export function useProducts(categories: CategoryRef[] = []) {
  const [records, setRecords] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] =
    useState<NewProductForm>(emptyProductForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(
    null,
  );
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const stockTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const reload = useCallback(
    () =>
      fetchProducts()
        .then((list) => {
          setRecords(list);
          setError("");
        })
        .catch((err: unknown) => setError(message(err)))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void reload();
    const timers = stockTimers.current;
    return () => timers.forEach(clearTimeout);
  }, [reload]);

  // O nome da categoria vem da lista de categorias; renomear reflete na hora.
  const products = useMemo<AdminProduct[]>(() => {
    const names = new Map(categories.map((c) => [c.id, c.name]));
    return records.map((record) => ({
      id: record.id,
      categoryId: record.categoryId,
      name: record.name,
      category: names.get(record.categoryId) ?? "Sem categoria",
      price: formatPrice(record.price),
      quantity: record.stockQuantity,
      available: record.available,
      observation: record.description ?? undefined,
      imageUrl: record.imageUrl ?? undefined,
    }));
  }, [records, categories]);

  const replaceRecord = (product: Product) =>
    setRecords((current) =>
      current.map((entry) => (entry.id === product.id ? product : entry)),
    );

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = `${product.name} ${product.category}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch);
      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;
      return (
        matchesSearch &&
        matchesCategory &&
        (availabilityFilter === "all" ||
          product.available === (availabilityFilter === "available"))
      );
    })
    .sort((a, b) =>
      sortOrder === "name"
        ? a.name.localeCompare(b.name, "pt-BR")
        : sortOrder === "stock"
          ? a.quantity - b.quantity
          : 0,
    );

  // Mudanças rápidas da lista: atualiza na hora e desfaz se o backend recusar.
  const patchProduct = async (
    productId: string,
    data: Partial<Pick<Product, "available" | "stockQuantity">>,
  ) => {
    const previous = records.find((entry) => entry.id === productId);
    if (!previous) return;
    try {
      replaceRecord(await saveProduct(data, productId));
      setError("");
    } catch (err) {
      replaceRecord(previous);
      setError(message(err));
    }
  };

  const updateAvailability = (productId: string, available: boolean) => {
    setRecords((current) =>
      current.map((entry) =>
        entry.id === productId ? { ...entry, available } : entry,
      ),
    );
    void patchProduct(productId, { available });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 0) return;
    setRecords((current) =>
      current.map((entry) =>
        entry.id === productId ? { ...entry, stockQuantity: quantity } : entry,
      ),
    );
    const timers = stockTimers.current;
    clearTimeout(timers.get(productId));
    timers.set(
      productId,
      setTimeout(() => {
        timers.delete(productId);
        void saveProduct({ stockQuantity: quantity }, productId)
          .then((saved) => {
            replaceRecord(saved);
            setError("");
          })
          .catch((err: unknown) => {
            setError(message(err));
            void reload();
          });
      }, STOCK_SAVE_DELAY),
    );
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProductId(null);
    setNewProduct(emptyProductForm);
    setPhoto(null);
    setError("");
  };

  const openNewProduct = () => {
    setEditingProductId(null);
    setNewProduct(emptyProductForm);
    setPhoto(null);
    setError("");
    setIsProductModalOpen(true);
  };

  const openEditProduct = (product: AdminProduct) => {
    const record = records.find((entry) => entry.id === product.id);
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name,
      quantity: String(product.quantity),
      price: record?.price ?? "",
      observation: product.observation ?? "",
      category: product.categoryId,
      imageUrl: product.imageUrl ?? "",
      available: product.available,
    });
    setPhoto(null);
    setError("");
    setIsProductModalOpen(true);
  };

  // A imagem só é enviada ao salvar; até lá fica apenas a prévia local.
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPhoto(file);
    setNewProduct((current) => ({
      ...current,
      imageUrl: file ? URL.createObjectURL(file) : "",
    }));
  };

  const handleSaveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(newProduct.price);
    const stockQuantity = Number(newProduct.quantity);
    if (!(price > 0)) {
      setError("Informe um preço maior que zero.");
      return;
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setError("Informe um estoque válido.");
      return;
    }
    setBusy(true);
    try {
      let saved = await saveProduct(
        {
          name: newProduct.name.trim(),
          description: newProduct.observation.trim() || null,
          price: Math.round(price * 100) / 100,
          stockQuantity,
          available: newProduct.available,
          categoryId: newProduct.category,
        },
        editingProductId ?? undefined,
      );
      if (photo) saved = await uploadProductImage(saved.id, photo);
      setRecords((current) =>
        editingProductId
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [...current, saved],
      );
      closeProductModal();
    } catch (err) {
      setError(message(err));
      // O produto pode ter sido salvo antes de a imagem falhar.
      void reload();
    } finally {
      setBusy(false);
    }
  };

  const requestProductDeletion = (product: AdminProduct) => {
    closeProductModal();
    setProductToDelete(product);
  };

  const confirmProductDeletion = async () => {
    if (!productToDelete) return;
    setBusy(true);
    try {
      await removeProduct(productToDelete.id);
      setRecords((current) =>
        current.filter((product) => product.id !== productToDelete.id),
      );
      setProductToDelete(null);
      setError("");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return {
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
    setProductToDelete: (product: AdminProduct | null) => {
      setError("");
      setProductToDelete(product);
    },
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
    error,
    busy,
    loading,
    reload,
  };
}
