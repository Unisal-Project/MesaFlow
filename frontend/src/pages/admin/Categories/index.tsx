import { useState } from "react";
import { ChevronDown, Eye, List, Search, Tag } from "lucide-react";
import { Button } from "@/components";
import { CategoryRow } from "./components/CategoryRow";
import { CategoryFormModal } from "./components/CategoryFormModal";
import { DeleteCategoryModal } from "./components/DeleteCategoryModal";
import type { useCategories } from "./hooks/useCategories";
import type { MockProduct } from "../Products/types/product.types";
import "./styles.scss";

type CategoriesProps = {
  showAll: boolean;
  onShowAll: () => void;
  state: ReturnType<typeof useCategories>;
  products: MockProduct[];
  onShowProducts: () => void;
};

export default function Categories({ state, products, onShowProducts, showAll, onShowAll }: CategoriesProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");
  const categories = state.filteredCategories
    .map((category) => ({ ...category, productCount: products.filter((product) => product.category === category.name).length }))
    .filter((category) => (categoryFilter === "all" || String(category.id) === categoryFilter) &&
      (availabilityFilter === "all" || category.active === (availabilityFilter === "available")))
    .sort((a, b) => sortOrder === "name" ? a.name.localeCompare(b.name, "pt-BR") : sortOrder === "products" ? b.productCount - a.productCount : 0);

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
            <p>{showAll ? categories.length : Math.min(4, categories.length)} de {state.categories.length} categorias organizam o cardápio</p>
          </div>
          {!showAll && <Button size="small" onClick={openAll}><Eye aria-hidden="true" />Ver todos</Button>}
        </div>
        <div className="categories-list-body">
          {(showAll ? categories : categories.slice(0, 4)).map((category) => (
            <CategoryRow key={category.id} category={category} onStatusChange={state.updateCategoryStatus}
              onEdit={state.openEditCategory} onDelete={state.requestCategoryDeletion} />
          ))}
          {categories.length === 0 && <div className="categories-no-results"><Tag aria-hidden="true" /><p>Nenhuma categoria encontrada com os filtros selecionados.</p></div>}
        </div>
      </section>
      {state.isModalOpen && <CategoryFormModal isOpen editingCategoryId={state.editingCategoryId} form={state.categoryForm}
        onFormChange={state.setCategoryForm} onClose={state.closeModal} onSubmit={state.handleSaveCategory}
        onDelete={state.requestEditingCategoryDeletion} />}
      <DeleteCategoryModal category={state.categoryToDelete} onClose={state.cancelCategoryDeletion} onConfirm={state.confirmCategoryDeletion} />
    </div>
  );
}
