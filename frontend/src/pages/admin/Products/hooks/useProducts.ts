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
  removeProductImage,
  saveProduct,
  setProductCover,
  uploadProductImage,
  type Product,
} from "@/services/menu.service";

import {
  emptyPromoForm,
  toPromoForm,
  toPromoInput,
} from "@/utils/promotion";

import type { AdminProduct, NewProductForm } from "../types/product.types";
import { toDecimal } from "../utils/decimal";

export const emptyProductForm: NewProductForm = {
  name: "",
  quantity: "0",
  price: "",
  observation: "",
  category: "",
  additionalCategoryIds: [],
  imageUrl: "",
  moreImages: [],
  trackStock: true,
  available: true,
  promo: emptyPromoForm,
};

type CategoryRef = { id: string; name: string };

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível acessar o servidor";

const MAX_PHOTOS = 3;
/** Fotos do formulário, capa primeiro. */
const photosOf = (form: NewProductForm) =>
  [form.imageUrl, ...(form.moreImages ?? [])].filter(Boolean);
const withPhotos = (form: NewProductForm, photos: string[]) => ({
  ...form,
  imageUrl: photos[0] ?? "",
  moreImages: photos.slice(1),
});
const serverPhotos = (product: Product) =>
  product.imageUrls ?? (product.imageUrl ? [product.imageUrl] : []);

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
  // Fotos novas ainda não enviadas: URL local (blob) → arquivo.
  const pendingPhotos = useRef(new Map<string, File>());
  const clearPendingPhotos = useCallback(() => {
    for (const url of pendingPhotos.current.keys()) URL.revokeObjectURL(url);
    pendingPhotos.current.clear();
  }, []);
  // Formulário como foi aberto; diferença = alterações não salvas.
  const [savedForm, setSavedForm] = useState<NewProductForm>(emptyProductForm);
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
    return () => {
      timers.forEach(clearTimeout);
      clearPendingPhotos();
    };
  }, [reload, clearPendingPhotos]);

  // O nome da categoria vem da lista de categorias; renomear reflete na hora.
  const products = useMemo<AdminProduct[]>(() => {
    const names = new Map(categories.map((c) => [c.id, c.name]));
    return records.map((record) => ({
      id: record.id,
      categoryId: record.categoryId,
      additionalCategoryIds: record.additionalCategoryIds ?? [],
      name: record.name,
      category: names.get(record.categoryId) ?? "Sem categoria",
      price: formatPrice(record.price),
      priceValue: Number(record.price),
      finalPrice: formatPrice(record.finalPrice ?? record.price),
      finalPriceValue: Number(record.finalPrice ?? record.price),
      promotion: record.promotion ?? null,
      quantity: record.stockQuantity,
      trackStock: record.trackStock,
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
          ? // Sem controle de estoque vai para o fim.
            Number(!a.trackStock) - Number(!b.trackStock) ||
            a.quantity - b.quantity
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
    clearPendingPhotos();
    setError("");
  };

  const openNewProduct = () => {
    setEditingProductId(null);
    setNewProduct(emptyProductForm);
    setSavedForm(emptyProductForm);
    clearPendingPhotos();
    setError("");
    setIsProductModalOpen(true);
  };

  const openEditProduct = (product: AdminProduct) => {
    const record = records.find((entry) => entry.id === product.id);
    setEditingProductId(product.id);
    const form: NewProductForm = {
      name: product.name,
      quantity: String(product.quantity),
      price: (record?.price ?? "").replace(".", ","),
      observation: product.observation ?? "",
      category: product.categoryId,
      additionalCategoryIds: product.additionalCategoryIds,
      imageUrl: product.imageUrl ?? "",
      moreImages: record ? serverPhotos(record).slice(1) : [],
      trackStock: product.trackStock,
      available: product.available,
      promo: toPromoForm(record ?? {}),
    };
    setNewProduct(form);
    setSavedForm(form);
    clearPendingPhotos();
    setError("");
    setIsProductModalOpen(true);
  };

  // As fotos só são enviadas ao salvar; até lá ficam como prévia local.
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || photosOf(newProduct).length >= MAX_PHOTOS) return;
    const url = URL.createObjectURL(file);
    pendingPhotos.current.set(url, file);
    setNewProduct((current) => withPhotos(current, [...photosOf(current), url]));
    // Permite escolher o mesmo arquivo de novo depois de remover.
    if ("value" in event.target) event.target.value = "";
  };

  /** Tira a foto do formulário; sem a capa, a próxima vira capa. */
  const removePhoto = (url: string) => {
    if (pendingPhotos.current.delete(url)) URL.revokeObjectURL(url);
    setNewProduct((current) =>
      withPhotos(current, photosOf(current).filter((item) => item !== url)),
    );
  };

  /** Troca a foto com a capa (mesma regra do backend). */
  const setCoverPhoto = (url: string) =>
    setNewProduct((current) => {
      const photos = photosOf(current);
      const index = photos.indexOf(url);
      if (index > 0) [photos[0], photos[index]] = [photos[index], photos[0]];
      return withPhotos(current, photos);
    });

  /**
   * Deixa as fotos do servidor iguais às do formulário: remove as que saíram
   * (do fim para o começo, para os slots não mudarem), envia as novas e
   * ordena todas as posições usando a troca com a capa.
   */
  const syncPhotos = async (product: Product) => {
    const wanted = photosOf(newProduct);
    let current = product;
    const photos = () => serverPhotos(current);
    for (let index = photos().length - 1; index >= 0; index--) {
      if (!wanted.includes(photos()[index]))
        current = await removeProductImage(product.id, index + 1);
    }
    const uploaded = new Map<string, string>();
    for (const url of wanted) {
      const file = pendingPhotos.current.get(url);
      if (!file) continue;
      current = await uploadProductImage(product.id, file, photos().length + 1);
      uploaded.set(url, photos().at(-1) ?? "");
    }
    const ordered = wanted.map((url) => uploaded.get(url) ?? url);
    // Fixa as extras do fim para o começo; a capa funciona como posição auxiliar.
    for (let index = ordered.length - 1; index > 0; index--) {
      const source = photos().indexOf(ordered[index]);
      if (source === index) continue;
      if (source > 0) current = await setProductCover(product.id, source + 1);
      current = await setProductCover(product.id, index + 1);
    }
    return current;
  };

  const handleSaveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(toDecimal(newProduct.price));
    const stockQuantity = Number(newProduct.quantity);
    if (!(price > 0)) {
      setError("Informe um preço maior que zero.");
      return;
    }
    if (
      newProduct.trackStock &&
      (!Number.isInteger(stockQuantity) || stockQuantity < 0)
    ) {
      setError("Informe um estoque válido.");
      return;
    }
    setBusy(true);
    try {
      const product = await saveProduct(
        {
          name: newProduct.name.trim(),
          description: newProduct.observation.trim() || null,
          price: Math.round(price * 100) / 100,
          // Sem controle a quantidade é ignorada e o saldo salvo fica intacto.
          ...(newProduct.trackStock && { stockQuantity }),
          trackStock: newProduct.trackStock,
          available: newProduct.available,
          ...toPromoInput({
            ...newProduct.promo,
            promoValue: toDecimal(newProduct.promo.promoValue),
          }),
          categoryId: newProduct.category,
          additionalCategoryIds: newProduct.additionalCategoryIds,
        },
        editingProductId ?? undefined,
      );
      setEditingProductId(product.id);
      // Já está salvo: se o upload falhar, só a foto pendente conta como alteração.
      setSavedForm(withPhotos(newProduct, serverPhotos(product)));
      setRecords((current) =>
        current.some((entry) => entry.id === product.id)
          ? current.map((entry) => (entry.id === product.id ? product : entry))
          : [...current, product],
      );
      replaceRecord(await syncPhotos(product));
      closeProductModal();
    } catch (err) {
      // O produto pode ter sido salvo antes de a imagem falhar.
      await reload();
      setError(message(err));
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
    hasUnsavedChanges: JSON.stringify(newProduct) !== JSON.stringify(savedForm),
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
    removePhoto,
    setCoverPhoto,
    handleSaveProduct,
    requestProductDeletion,
    confirmProductDeletion,
    error,
    busy,
    loading,
    reload,
  };
}
