import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  fetchCategories,
  removeCategory,
  saveCategory,
  saveProduct,
  type Category as ApiCategory,
} from "@/services/menu.service";

import {
  emptyPromoForm,
  toPromoForm,
  toPromoInput,
} from "@/utils/promotion";

import type {
  Category,
  CategoryForm,
  CategoryProductMove,
} from "../types/category.types";
import { toDecimal } from "../../Products/utils/decimal";

const emptyCategoryForm: CategoryForm = {
  name: "",
  description: "",
  active: true,
  promo: emptyPromoForm,
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível acessar o servidor";

// productCount é calculado pela tela a partir da lista de produtos.
const toCategory = (record: ApiCategory): Category => ({
  id: record.id,
  name: record.name,
  description: record.description ?? "",
  active: record.active,
  productCount: 0,
  promoType: record.promoType ?? null,
  promoValue: record.promoValue ?? null,
  promoActive: record.promoActive ?? false,
  promoStartsAt: record.promoStartsAt ?? null,
  promoEndsAt: record.promoEndsAt ?? null,
});

export function useCategories(
  onRename?: (previousName: string, nextName: string) => void,
) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [categoryForm, setCategoryForm] =
    useState<CategoryForm>(emptyCategoryForm);
  // Formulário como foi aberto; diferença = alterações não salvas.
  const [savedForm, setSavedForm] = useState<CategoryForm>(emptyCategoryForm);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(
    () =>
      fetchCategories()
        .then((records) => {
          setCategories(records.map(toCategory));
          setError("");
        })
        .catch((err: unknown) => setError(message(err)))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const replaceCategory = (category: Category) =>
    setCategories((current) =>
      current.map((entry) => (entry.id === category.id ? category : entry)),
    );

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredCategories = categories.filter((category) =>
    `${category.name} ${category.description}`
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedSearch),
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
    setError("");
  };

  const openNewCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
    setSavedForm(emptyCategoryForm);
    setError("");
    setIsModalOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    const form: CategoryForm = {
      name: category.name,
      description: category.description,
      active: category.active,
      promo: toPromoForm(category),
    };
    setCategoryForm(form);
    setSavedForm(form);
    setError("");
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const previous = categories.find(
      (category) => category.id === editingCategoryId,
    );
    const description = categoryForm.description.trim();
    setBusy(true);
    try {
      const saved = toCategory(
        await saveCategory(
          {
            name: categoryForm.name.trim(),
            description: description || null,
            active: categoryForm.active,
            ...toPromoInput({
              ...categoryForm.promo,
              promoValue: toDecimal(categoryForm.promo.promoValue),
            }),
          },
          previous?.id,
        ),
      );
      if (previous && previous.name !== saved.name) {
        onRename?.(previous.name, saved.name);
      }
      if (previous) replaceCategory(saved);
      else setCategories((current) => [...current, saved]);
      closeModal();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  /** "+ Nova" do formulário de produto: só o nome; o resto na tela própria. */
  const createCategory = async (name: string) => {
    const saved = toCategory(
      await saveCategory({ name: name.trim(), description: null, active: true }),
    );
    setCategories((current) => [...current, saved]);
    return saved;
  };

  const updateCategoryStatus = async (categoryId: string, active: boolean) => {
    const category = categories.find((entry) => entry.id === categoryId);
    if (!category) return;
    // Atualiza na hora e desfaz se o backend recusar.
    replaceCategory({ ...category, active });
    try {
      await saveCategory(
        {
          name: category.name,
          description: category.description || null,
          active,
        },
        category.id,
      );
      setError("");
    } catch (err) {
      replaceCategory(category);
      setError(message(err));
    }
  };

  const requestCategoryDeletion = (category: Category) => {
    setError("");
    setCategoryToDelete(category);
  };

  const requestEditingCategoryDeletion = () => {
    const category = categories.find((item) => item.id === editingCategoryId);
    if (category) {
      closeModal();
      setCategoryToDelete(category);
    }
  };

  const cancelCategoryDeletion = () => {
    setCategoryToDelete(null);
    setError("");
  };

  /**
   * Produtos com destino diferente de moveTo são movidos um a um; o DELETE com
   * moveTo leva o restante (inclusive inativos, que a tela não mostra).
   */
  const confirmCategoryDeletion = async (
    moveTo?: string,
    moves: CategoryProductMove[] = [],
  ) => {
    if (!categoryToDelete) return;
    setBusy(true);
    try {
      for (const { product, categoryId } of moves) {
        if (categoryId === moveTo) continue;
        await saveProduct(
          {
            categoryId,
            additionalCategoryIds: product.additionalCategoryIds.filter(
              (id) => id !== categoryId && id !== categoryToDelete.id,
            ),
          },
          product.id,
        );
      }
      await removeCategory(categoryToDelete.id, moveTo);
      setCategories((current) =>
        current.filter((category) => category.id !== categoryToDelete.id),
      );
      setCategoryToDelete(null);
      setError("");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return {
    categories,
    filteredCategories,
    normalizedSearch,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    editingCategoryId,
    categoryForm,
    setCategoryForm,
    hasUnsavedChanges:
      JSON.stringify(categoryForm) !== JSON.stringify(savedForm),
    createCategory,
    closeModal,
    openNewCategory,
    openEditCategory,
    handleSaveCategory,
    updateCategoryStatus,
    categoryToDelete,
    requestCategoryDeletion,
    requestEditingCategoryDeletion,
    cancelCategoryDeletion,
    confirmCategoryDeletion,
    error,
    busy,
    loading,
    reload,
  };
}
