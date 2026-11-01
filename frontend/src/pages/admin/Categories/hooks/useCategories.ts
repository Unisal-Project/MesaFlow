import { useState, type FormEvent } from "react";

import { initialCategories } from "../mocks/categories.mock";

import type {
  Category,
  CategoryForm,
} from "../types/category.types";

const emptyCategoryForm: CategoryForm = {
  name: "",
  description: "",
  active: true,
};

export function useCategories(onRename?: (previousName: string, nextName: string) => void) {
  // Estados
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );

  const [categoryForm, setCategoryForm] =
    useState<CategoryForm>(emptyCategoryForm);

  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

  // Pesquisa
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");

  const filteredCategories = categories.filter((category) =>
    `${category.name} ${category.description}`
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedSearch),
  );

  // Fechar formulário
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
  };

  // Abrir formulário para cadastro
  const openNewCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
    setIsModalOpen(true);
  };

  // Abrir formulário para edição
  const openEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);

    setCategoryForm({
      name: category.name,
      description: category.description,
      active: category.active,
    });

    setIsModalOpen(true);
  };

  // Cadastrar ou editar categoria
  const handleSaveCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const previousCategory = categories.find((category) => category.id === editingCategoryId);
    if (previousCategory && previousCategory.name !== categoryForm.name.trim()) {
      onRename?.(previousCategory.name, categoryForm.name.trim());
    }
    setCategories((currentCategories) => {
      if (editingCategoryId !== null) {
        return currentCategories.map((category) =>
          category.id === editingCategoryId
            ? {
                ...category,
                name: categoryForm.name.trim(),
                description: categoryForm.description.trim(),
                active: categoryForm.active,
              }
            : category,
        );
      }

      const nextId =
        Math.max(0, ...currentCategories.map((category) => category.id)) + 1;

      return [
        ...currentCategories,
        {
          id: nextId,
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
          productCount: 0,
          active: categoryForm.active,
        },
      ];
    });

    closeModal();
  };

  // Alterar status
  const updateCategoryStatus = (categoryId: number, active: boolean) => {
    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId ? { ...category, active } : category,
      ),
    );
  };

  // Solicitar exclusão
  const requestCategoryDeletion = (category: Category) => {
    setCategoryToDelete(category);
  };

  // Solicitar exclusão a partir do formulário de edição
  const requestEditingCategoryDeletion = () => {
    const category = categories.find(
      (item) => item.id === editingCategoryId,
    );

    if (category) {
      closeModal();
      setCategoryToDelete(category);
    }
  };

  // Cancelar exclusão
  const cancelCategoryDeletion = () => {
    setCategoryToDelete(null);
  };

  // Confirmar exclusão
  const confirmCategoryDeletion = () => {
    if (!categoryToDelete) return;

    setCategories((currentCategories) =>
      currentCategories.filter(
        (category) => category.id !== categoryToDelete.id,
      ),
    );

    setCategoryToDelete(null);
  };

  return {
    // Dados
    categories,
    filteredCategories,
    normalizedSearch,

    // Pesquisa
    searchQuery,
    setSearchQuery,

    // Formulário
    isModalOpen,
    editingCategoryId,
    categoryForm,
    setCategoryForm,
    closeModal,
    openNewCategory,
    openEditCategory,
    handleSaveCategory,

    // Status
    updateCategoryStatus,

    // Exclusão
    categoryToDelete,
    requestCategoryDeletion,
    requestEditingCategoryDeletion,
    cancelCategoryDeletion,
    confirmCategoryDeletion,
  };
}