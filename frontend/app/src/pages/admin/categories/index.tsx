import { useState, type FormEvent } from "react";
import { Plus, Search, Tag } from "lucide-react";
import { Button } from "@/components/buttons/Button";
import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import { Switch } from "@/components/forms/Switch";
import { TextAreaField } from "@/components/inputs/TextAreaField";
import { TextField } from "@/components/inputs/TextField";
import trashIcon from "@/assets/lixeira-icon.png";
import "./styles.css";

type Category = {
  id: number;
  name: string;
  description: string;
  productCount: number;
  active: boolean;
};

type CategoryForm = Pick<Category, "name" | "description" | "active">;

type CategoriesProps = {
  onNavigate?: (id: string) => void;
};

const emptyCategoryForm: CategoryForm = {
  name: "",
  description: "",
  active: true,
};

const initialCategories: Category[] = [
  {
    id: 1,
    name: "Lanches",
    description: "Hambúrgueres, sanduíches e opções rápidas.",
    productCount: 8,
    active: true,
  },
  {
    id: 2,
    name: "Pizzas",
    description: "Pizzas tradicionais e especiais da casa.",
    productCount: 12,
    active: true,
  },
  {
    id: 3,
    name: "Porções",
    description: "Porções para compartilhar e acompanhamentos.",
    productCount: 6,
    active: true,
  },
  {
    id: 4,
    name: "Bebidas",
    description: "Sucos, refrigerantes e outras bebidas.",
    productCount: 10,
    active: true,
  },
  {
    id: 5,
    name: "Sobremesas",
    description: "Doces e sobremesas para finalizar o pedido.",
    productCount: 4,
    active: false,
  },
];

export default function Categories({ onNavigate }: CategoriesProps) {
  const [activeItem, setActiveItem] = useState("categories");
  const [categories, setCategories] = useState(initialCategories);
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
  };

  const openNewCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
    setIsModalOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description,
      active: category.active,
    });
    setIsModalOpen(true);
  };

  const handleSaveCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

  const updateCategoryStatus = (categoryId: number, active: boolean) => {
    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId ? { ...category, active } : category,
      ),
    );
  };

  const confirmCategoryDeletion = () => {
    if (!categoryToDelete) return;

    setCategories((currentCategories) =>
      currentCategories.filter(
        (category) => category.id !== categoryToDelete.id,
      ),
    );
    setCategoryToDelete(null);
  };

  return (
    <div className="categories-page">
      <AdminSidebar
        activeId={activeItem}
        onChange={(id) => {
          setActiveItem(id);
          onNavigate?.(id);
        }}
        userName="Nome do usuário"
        userRole="Administrador"
      />

      <main className="categories-content">
        <div className="categories-topbar">
          <header className="categories-heading">
            <h1>CATEGORIAS</h1>
            <p>Organize os produtos para facilitar a escolha dos clientes.</p>
          </header>

          <div className="categories-topbar-actions">
            <label className="category-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label="Pesquisar categoria"
                placeholder="Pesquisar categoria"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <Button onClick={openNewCategory}>
              <Plus aria-hidden="true" />
              Nova categoria
            </Button>
          </div>
        </div>

        <section
          className="categories-list"
          aria-labelledby="categories-list-title"
        >
          <div className="categories-list-heading">
            <div>
              <h2 id="categories-list-title">Categorias do cardápio</h2>
              <p>
                {normalizedSearch
                  ? `${filteredCategories.length} de ${categories.length} categorias`
                  : `${categories.length} categorias cadastradas`}
              </p>
            </div>
          </div>

          <div className="categories-list-body">
            {filteredCategories.map((category) => (
              <article className="category-row" key={category.id}>
                <div className="category-identity">
                  <span className="category-mark" aria-hidden="true">
                    <Tag />
                    <strong>{category.name.charAt(0)}</strong>
                  </span>
                  <div>
                    <h3>{category.name}</h3>
                    <p>{category.description}</p>
                  </div>
                </div>

                <div className="category-product-count">
                  <strong>{category.productCount}</strong>
                  <span>
                    {category.productCount === 1 ? "produto" : "produtos"}
                  </span>
                </div>

                <div className="category-controls">
                  <Switch
                    className={`category-status ${category.active ? "is-active" : "is-inactive"}`}
                    label={category.active ? "Ativa" : "Inativa"}
                    checked={category.active}
                    onChange={(event) =>
                      updateCategoryStatus(category.id, event.target.checked)
                    }
                  />
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => openEditCategory(category)}
                  >
                    Editar
                  </Button>
                  <button
                    type="button"
                    className="category-delete-button"
                    aria-label={`Excluir ${category.name}`}
                    onClick={() => setCategoryToDelete(category)}
                  >
                    <img src={trashIcon} alt="" />
                  </button>
                </div>
              </article>
            ))}

            {filteredCategories.length === 0 && (
              <div className="categories-no-results">
                <Tag aria-hidden="true" />
                <p>Nenhuma categoria encontrada para esta pesquisa.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {isModalOpen && (
        <div
          className="category-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="category-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-form-title"
          >
            <header className="category-modal-heading">
              <div>
                <h2 id="category-form-title">
                  {editingCategoryId === null
                    ? "Nova categoria"
                    : "Editar categoria"}
                </h2>
                <p>
                  {editingCategoryId === null
                    ? "Crie uma categoria para organizar os produtos do cardápio."
                    : "Atualize as informações da categoria selecionada."}
                </p>
              </div>
              <button
                type="button"
                className="category-modal-close"
                aria-label="Fechar"
                onClick={closeModal}
              >
                ×
              </button>
            </header>

            <form className="category-form" onSubmit={handleSaveCategory}>
              <TextField
                label="Nome da categoria"
                autoFocus
                required
                maxLength={50}
                placeholder="Ex.: Pratos principais"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />

              <TextAreaField
                label="Descrição"
                required
                maxLength={140}
                placeholder="Explique quais produtos fazem parte desta categoria"
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />

              <div className="category-form-status">
                <span>Status</span>
                <Switch
                  className={`category-status ${categoryForm.active ? "is-active" : "is-inactive"}`}
                  label={categoryForm.active ? "Ativa" : "Inativa"}
                  checked={categoryForm.active}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
              </div>

              <footer className="category-modal-actions">
                {editingCategoryId !== null && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="category-delete-action"
                    onClick={() => {
                      const category = categories.find(
                        (item) => item.id === editingCategoryId,
                      );
                      if (category) {
                        closeModal();
                        setCategoryToDelete(category);
                      }
                    }}
                  >
                    <img className="button-trash-icon" src={trashIcon} alt="" />
                    Excluir categoria
                  </Button>
                )}
                <div className="category-modal-save-actions">
                  <Button type="button" variant="ghost" onClick={closeModal}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingCategoryId === null
                      ? "Cadastrar categoria"
                      : "Salvar alterações"}
                  </Button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}

      {categoryToDelete && (
        <div
          className="category-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCategoryToDelete(null);
          }}
        >
          <section
            className="category-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            aria-describedby="delete-category-description"
          >
            <div className="category-delete-dialog-icon" aria-hidden="true">
              <img src={trashIcon} alt="" />
            </div>
            <h2 id="delete-category-title">Excluir categoria?</h2>
            <p id="delete-category-description">
              “{categoryToDelete.name}” será removida da lista. Os produtos
              vinculados não serão excluídos.
            </p>
            <footer>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCategoryToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmCategoryDeletion}
              >
                Excluir
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
