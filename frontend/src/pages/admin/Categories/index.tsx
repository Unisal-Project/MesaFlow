import { useState } from "react";
import { ChevronDown, Eye, List, Plus, Search, Tag } from "lucide-react";
import { Button } from "@/components";
import { CategoryRow } from "./components/CategoryRow";
import { CategoryFormModal } from "./components/CategoryFormModal";
import { DeleteCategoryModal } from "./components/DeleteCategoryModal";
import type { useCategories } from "./hooks/useCategories";
import type { AdminProduct } from "../Products/types/product.types";
import "./styles.scss";

type CategoriesProps = {
  showAll: boolean;
  onShowAll: () => void;
  state: ReturnType<typeof useCategories>;
  products: AdminProduct[];
  onShowProducts: () => void;
  /** Recarrega os produtos depois de movê-los na exclusão da categoria. */
  onProductsChanged?: () => void;
};

export default function Categories({ state, products, onShowProducts, onProductsChanged, showAll, onShowAll }: CategoriesProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");
  const categories = state.filteredCategories
    .map((category) => ({ ...category, productCount: products.filter((product) => product.categoryId === category.id).length }))
    .filter((category) => (categoryFilter === "all" || String(category.id) === categoryFilter) &&
      (availabilityFilter === "all" || category.active === (availabilityFilter === "available")))
    .sort((a, b) => sortOrder === "name" ? a.name.localeCompare(b.name, "pt-BR") : sortOrder === "products" ? b.productCount - a.productCount : 0);

  // Com busca ou filtro ativo a lista mostra todos os resultados (sem corte).
  const isFiltering = state.normalizedSearch !== "" || categoryFilter !== "all" || availabilityFilter !== "all";
  const visible = showAll || isFiltering ? categories : categories.slice(0, 4);
  const clearFilters = () => {
    state.setSearchQuery("");
    setCategoryFilter("all");
    setAvailabilityFilter("all");
  };

  const openAll = () => {
    state.setSearchQuery("");
    setCategoryFilter("all");
    setAvailabilityFilter("all");
    setSortOrder("default");
    onShowAll();
  };

  return (
    <div className="menu-categories">
      <div className="products-toolbar">
        <label className="product-search">
          <Search aria-hidden="true" />
          <input type="search" aria-label="Pesquisar categoria" placeholder="Buscar categoria pelo nome..."
            value={state.searchQuery} onChange={(event) => state.setSearchQuery(event.target.value)} />
        </label>
        <label className="product-select">
          <select aria-label="Filtrar categoria" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">Todas as categorias</option>
            {state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select><ChevronDown aria-hidden="true" />
        </label>
        <label className="product-select">
          <select aria-label="Disponibilidade das categorias" value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
            <option value="all">Disponibilidade</option><option value="available">Ativas</option><option value="unavailable">Inativas</option>
          </select><ChevronDown aria-hidden="true" />
        </label>
        <label className="product-select product-sort">
          <List aria-hidden="true" />
          <select aria-label="Organizar categorias" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="default">Organizar lista</option><option value="name">Nome: A–Z</option><option value="products">Mais produtos</option>
          </select>
        </label>
      </div>
      {!showAll && <nav className="products-tabs" aria-label="Seções do cardápio">
        <button type="button" onClick={onShowProducts}>Produtos</button>
        <button type="button" className="active" aria-current="page">Categorias</button>
      </nav>}
      <section className={`products-list categories-list${showAll ? " products-list-full" : ""}`} aria-labelledby="categories-list-title">
        <div className="products-list-heading">
          <div>
            <h2 id="categories-list-title">{showAll ? "Todas as categorias" : "Categorias cadastradas"}</h2>
            <p>{visible.length} de {state.categories.length} categorias organizam o cardápio</p>
          </div>
          {!showAll && <Button size="small" onClick={openAll}><Eye aria-hidden="true" />Ver todos</Button>}
        </div>
        {state.error && !state.isModalOpen && !state.categoryToDelete && (
          <p className="category-form-error" role="alert">{state.error}</p>
        )}
        {state.loading && <p role="status">Carregando categorias...</p>}
        <div className="categories-list-body">
          {visible.map((category) => (
            <CategoryRow key={category.id} category={category} onStatusChange={state.updateCategoryStatus}
              onEdit={state.openEditCategory} onDelete={state.requestCategoryDeletion} />
          ))}
          {!state.loading && state.categories.length === 0 && <div className="categories-no-results"><Tag aria-hidden="true" /><p>Nenhuma categoria ainda.</p>
            <Button size="small" onClick={state.openNewCategory}><Plus aria-hidden="true" />Cadastrar primeira categoria</Button></div>}
          {state.categories.length > 0 && categories.length === 0 && <div className="categories-no-results"><Tag aria-hidden="true" /><p>Nenhuma categoria encontrada com os filtros selecionados.</p>
            <Button size="small" variant="secondary" onClick={clearFilters}>Limpar filtros</Button></div>}
        </div>
      </section>
      {state.isModalOpen && <CategoryFormModal isOpen editingCategoryId={state.editingCategoryId} form={state.categoryForm}
        hasUnsavedChanges={state.hasUnsavedChanges}
        error={state.error} busy={state.busy}
        onFormChange={state.setCategoryForm} onClose={state.closeModal} onSubmit={(event) => void state.handleSaveCategory(event).finally(onProductsChanged)}
        onDelete={state.requestEditingCategoryDeletion} />}
      <DeleteCategoryModal key={state.categoryToDelete?.id} category={state.categoryToDelete} categories={state.categories}
        products={products.filter((product) => product.categoryId === state.categoryToDelete?.id)}
        onClose={state.cancelCategoryDeletion}
        onConfirm={(moveTo, moves) => void state.confirmCategoryDeletion(moveTo, moves).finally(onProductsChanged)}
        error={state.error} busy={state.busy} />
    </div>
  );
}
