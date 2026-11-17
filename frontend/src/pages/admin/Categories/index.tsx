import { useState } from "react";
import { CheckSquare, ChevronDown, List, Plus, Search, SquareMinus, Tag } from "lucide-react";
import { Button, Checkbox, ConfirmationDialog, ListPager } from "@/components";
import { AnimatedTrash } from "@/components/ui/icons/AnimatedTrash";
import { getSession } from "@/services/auth.service";
import { isRowAreaClick } from "@/utils/selectableRow";
import { usePagedList } from "@/hooks/usePagedList";
import { CategoryRow } from "./components/CategoryRow";
import { CategoryFormModal } from "./components/CategoryFormModal";
import { DeleteCategoryModal } from "./components/DeleteCategoryModal";
import type { useCategories } from "./hooks/useCategories";
import type { AdminProduct } from "../Products/types/product.types";
import "./styles.scss";

type CategoriesProps = {
  hideTabs?: boolean;
  /** Coloca uma ou mais categorias em promoção. */
  onPromote?: (categoryIds: string[]) => void;
  showAll: boolean;
  onShowAll: () => void;
  state: ReturnType<typeof useCategories>;
  products: AdminProduct[];
  onShowProducts: () => void;
  /** Recarrega os produtos depois de movê-los na exclusão da categoria. */
  onProductsChanged?: () => void;
};

export default function Categories({ hideTabs, onPromote, state, products, onShowProducts, onProductsChanged, showAll }: CategoriesProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const isAdmin = getSession()?.user.role === "ADMIN";
  const categories = state.filteredCategories
    .map((category) => ({ ...category, productCount: products.filter((product) => product.categoryId === category.id).length }))
    .filter((category) => (categoryFilter === "all" || String(category.id) === categoryFilter) &&
      (availabilityFilter === "all" || category.active === (availabilityFilter === "available")))
    .sort((a, b) => sortOrder === "name" ? a.name.localeCompare(b.name, "pt-BR") : sortOrder === "products" ? b.productCount - a.productCount : 0);

  const listKey = [state.searchQuery, categoryFilter, availabilityFilter, sortOrder].join("|");
  const { pageItems: visible, pager } = usePagedList(categories, listKey);
  // Mudou busca/filtro/ordem/página: a seleção recomeça (sem "fantasmas" que voltam depois).
  const viewKey = `${listKey}|${pager.page}|${pager.pageSize}`;
  const [seenView, setSeenView] = useState(viewKey);
  if (seenView !== viewKey) {
    setSeenView(viewKey);
    setSelected([]);
  }
  // Na renderização em que a chave muda a seleção antiga ainda está no estado:
  // só o que está na tela conta.
  const selectedIds = selected.filter((id) => visible.some((category) => category.id === id));
  const toggle = (id: string) =>
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const pageIds = visible.map((category) => category.id);
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const deleteSelected = async () => {
    setConfirmBulkDelete(false);
    // Ficam selecionadas só as que falharam (ex.: categorias com produtos).
    setSelected(await state.deleteCategories(selectedIds));
    onProductsChanged?.();
  };
  const togglePage = () =>
    setSelected((current) => pageAllSelected
      ? current.filter((id) => !pageIds.includes(id))
      : [...new Set([...current, ...pageIds])]);
  const clearFilters = () => {
    state.setSearchQuery("");
    setCategoryFilter("all");
    setAvailabilityFilter("all");
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
      {!hideTabs && !showAll && <nav className="products-tabs" aria-label="Seções do cardápio">
        <button type="button" onClick={onShowProducts}>Produtos</button>
        <button type="button" className="active" aria-current="page">Categorias</button>
      </nav>}
      {onPromote && selectedIds.length > 0 && <div className="products-promotion-actions"><span>{selectedIds.length} {selectedIds.length === 1 ? "selecionada" : "selecionadas"}</span>
        <Button variant="secondary" onClick={() => setSelected([])}>Limpar seleção</Button>
        <Button onClick={() => { onPromote(selectedIds); setSelected([]); }}>Colocar em promoção</Button>
        {isAdmin && <Button variant="danger" disabled={state.busy} onClick={() => setConfirmBulkDelete(true)}><AnimatedTrash />Excluir selecionadas</Button>}</div>}
      <ConfirmationDialog open={confirmBulkDelete && selectedIds.length > 0} variant="danger"
        title={selectedIds.length === 1 ? "Excluir 1 categoria?" : `Excluir ${selectedIds.length} categorias?`}
        description="⚠️ Só categorias sem produtos ativos são excluídas. As que ainda têm produtos continuam selecionadas para você excluir uma por vez e escolher para onde mover os produtos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir" onCancel={() => setConfirmBulkDelete(false)} onConfirm={() => void deleteSelected()} />
      <section className={`products-list categories-list${showAll ? " products-list-full" : ""}`} aria-labelledby="categories-list-title">
        <div className="products-list-heading">
          <div>
            <h2 id="categories-list-title">{showAll ? "Todas as categorias" : "Categorias cadastradas"}</h2>
            <p>{categories.length} de {state.categories.length} categorias organizam o cardápio</p>
          </div>
          <div className="products-list-actions">
            {onPromote && visible.length > 0 && <Button size="small" variant="secondary" onClick={togglePage}>
              {pageAllSelected ? <SquareMinus aria-hidden="true" /> : <CheckSquare aria-hidden="true" />}
              {pageAllSelected ? "Desmarcar todos" : `Selecionar todos (${visible.length})`}
            </Button>}
          </div>
        </div>
        {state.error && !state.isModalOpen && !state.categoryToDelete && (
          <p className="category-form-error" role="alert">{state.error}</p>
        )}
        {state.loading && <p role="status">Carregando categorias...</p>}
        <div className="categories-list-body">
          {visible.map((category) => (
            onPromote ? <div key={category.id} className={`categories-selectable-row selectable-row${selected.includes(category.id) ? " is-selected" : ""}`}
              onClick={(event) => { if (isRowAreaClick(event)) toggle(category.id); }}>
              <Checkbox label="" aria-label={`Selecionar ${category.name}`} checked={selected.includes(category.id)} onChange={() => toggle(category.id)} />
              <CategoryRow category={category} onStatusChange={state.updateCategoryStatus}
                onPromote={(id) => onPromote([id])} onEdit={state.openEditCategory} onDelete={state.requestCategoryDeletion} />
            </div> : <CategoryRow key={category.id} category={category} onStatusChange={state.updateCategoryStatus}
              onEdit={state.openEditCategory} onDelete={state.requestCategoryDeletion} />
          ))}
          {!state.loading && state.categories.length === 0 && <div className="categories-no-results"><Tag aria-hidden="true" /><p>Nenhuma categoria ainda.</p>
            <Button size="small" onClick={state.openNewCategory}><Plus aria-hidden="true" />Cadastrar primeira categoria</Button></div>}
          {state.categories.length > 0 && categories.length === 0 && <div className="categories-no-results"><Tag aria-hidden="true" /><p>Nenhuma categoria encontrada com os filtros selecionados.</p>
            <Button size="small" variant="secondary" onClick={clearFilters}>Limpar filtros</Button></div>}
        </div>
        <ListPager {...pager} label="Categorias" />
      </section>
      {state.isModalOpen && <CategoryFormModal isOpen editingCategoryId={state.editingCategoryId} form={state.categoryForm}
        hasUnsavedChanges={state.hasUnsavedChanges}
        error={state.error} busy={state.busy}
        onFormChange={state.setCategoryForm} onClose={state.closeModal} onSubmit={(event) => void state.handleSaveCategory(event).finally(onProductsChanged)}
        onDelete={state.requestEditingCategoryDeletion} />}
      <DeleteCategoryModal key={state.categoryToDelete?.id} category={state.categoryToDelete} categories={state.categories}
        products={products.filter((product) => product.categoryId === state.categoryToDelete?.id)}
        onClose={state.cancelCategoryDeletion}
        onConfirm={(moveTo, moves, deleteProducts) => void state.confirmCategoryDeletion(moveTo, moves, deleteProducts).finally(onProductsChanged)}
        error={state.error} busy={state.busy} />
    </div>
  );
}
