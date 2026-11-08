import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  fetchCategories,
  removeCategory,
  saveCategory,
  type Category as ApiCategory,
} from "@/services/menu.service";

import type { Category, CategoryForm } from "../types/category.types";

const emptyCategoryForm: CategoryForm = {
  name: "",
  description: "",
  active: true,
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
    setError("");
    setIsModalOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description,
      active: category.active,
    });
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

  const confirmCategoryDeletion = async () => {
    if (!categoryToDelete) return;
    setBusy(true);
    try {
      await removeCategory(categoryToDelete.id);
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
