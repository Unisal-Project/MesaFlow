import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { fetchCategories, fetchProducts, createProduct, updateProduct, deleteProduct, uploadProductImage, type Category, type Product } from "@/services/menu.service";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import type { MockProduct, NewProductForm } from "../types/product.types";

const emptyProductForm: NewProductForm = { name: "", quantity: "0", price: "", observation: "", category: "", additionalCategoryIds: [], imageUrl: "", available: true };

export function useProducts() {
  const [remoteProducts, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | number | null>(null);
  const [newProduct, setNewProduct] = useState<NewProductForm>(emptyProductForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productToDelete, setProductToDelete] = useState<MockProduct | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchProducts(controller.signal), fetchCategories(controller.signal)])
      .then(([items, groups]) => { setProducts(items); setCategories(groups); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível carregar os produtos"); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, []);

  const products: MockProduct[] = remoteProducts.filter((product) => product.active).map((product) => ({
    id: product.id, categoryId: product.categoryId, additionalCategoryIds: product.additionalCategoryIds ?? [],
    name: product.name, category: categories.find((category) => category.id === product.categoryId)?.name ?? "",
    price: Number(product.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    quantity: product.stockQuantity, available: product.available, observation: product.description ?? "", imageUrl: resolveImageUrl(product.imageUrl),
  }));
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.category}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch) &&
    (categoryFilter === "all" || product.category === categoryFilter) &&
    (availabilityFilter === "all" || product.available === (availabilityFilter === "available"))
  ).sort((a, b) => sortOrder === "name" ? a.name.localeCompare(b.name, "pt-BR") : sortOrder === "stock" ? a.quantity - b.quantity : 0);

  const reportError = (reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível salvar o produto");
  const replaceProduct = (product: Product) => setProducts((current) => current.some((item) => item.id === product.id)
    ? current.map((item) => item.id === product.id ? product : item) : [...current, product]);
  const updateAvailability = async (id: string | number, available: boolean) => {
    try { replaceProduct(await updateProduct(String(id), { available })); } catch (reason) { reportError(reason); }
  };
  const updateQuantity = async (id: string | number, stockQuantity: number) => {
    try { replaceProduct(await updateProduct(String(id), { stockQuantity })); } catch (reason) { reportError(reason); }
  };
  const closeProductModal = () => { setIsProductModalOpen(false); setEditingProductId(null); setNewProduct(emptyProductForm); setPhoto(null); };
  const openNewProduct = () => { setError(null); setEditingProductId(null); setNewProduct(emptyProductForm); setPhoto(null); setIsProductModalOpen(true); };
  const openEditProduct = (product: MockProduct) => {
    setError(null); setEditingProductId(product.id); setPhoto(null);
    const source = remoteProducts.find((item) => item.id === String(product.id));
    setNewProduct({ name: product.name, quantity: String(product.quantity), price: source?.price ?? "", observation: product.observation ?? "",
      category: product.categoryId ?? "", additionalCategoryIds: product.additionalCategoryIds ?? [], imageUrl: product.imageUrl ?? "", available: product.available });
    setIsProductModalOpen(true);
  };
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setNewProduct((current) => ({ ...current, imageUrl: typeof reader.result === "string" ? reader.result : "" }));
    reader.readAsDataURL(file);
  };
  const handleSaveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true); setError(null);
    try {
      const data = { name: newProduct.name.trim(), categoryId: newProduct.category, additionalCategoryIds: newProduct.additionalCategoryIds,
        description: newProduct.observation.trim() || null, price: Number(newProduct.price), stockQuantity: Number(newProduct.quantity), available: newProduct.available };
      let saved = editingProductId === null ? await createProduct(data) : await updateProduct(String(editingProductId), data);
      replaceProduct(saved);
      // Mantém o ID após criar, para uma nova tentativa de upload não duplicar o produto.
      setEditingProductId(saved.id);
      if (photo) { saved = await uploadProductImage(saved.id, photo); replaceProduct(saved); }
      closeProductModal();
    } catch (reason) { reportError(reason); } finally { setIsSaving(false); }
  };
  const requestProductDeletion = (product: MockProduct) => { closeProductModal(); setProductToDelete(product); };
  const confirmProductDeletion = async () => {
    if (!productToDelete) return;
    try { await deleteProduct(String(productToDelete.id)); setProducts((current) => current.filter((item) => item.id !== String(productToDelete.id))); setProductToDelete(null); }
    catch (reason) { reportError(reason); }
  };
  const renameProductCategory = (previousName: string, nextName: string) => {
    setCategories((current) => current.map((category) => category.name === previousName ? { ...category, name: nextName } : category));
    setCategoryFilter((current) => current === previousName ? nextName : current);
  };
  return { categories, error, isLoading, isSaving, renameProductCategory, products, isProductModalOpen, editingProductId, newProduct, setNewProduct,
    searchQuery, setSearchQuery, availabilityFilter, setAvailabilityFilter, sortOrder, setSortOrder, categoryFilter, setCategoryFilter,
    productToDelete, setProductToDelete, normalizedSearch, filteredProducts, updateAvailability, updateQuantity, closeProductModal,
    openNewProduct, openEditProduct, handlePhotoChange, handleSaveProduct, requestProductDeletion, confirmProductDeletion };
}
