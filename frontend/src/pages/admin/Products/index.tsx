import { useEffect, useState } from "react";
import { PromotionsContent } from "../Promotions";
import { usePromotions, type ItemKey } from "../Promotions/hooks/usePromotions";
import { useContentTransition } from "@/hooks/useContentTransition";
import { ArrowLeft, CheckSquare, ChevronDown, Eye, List, Plus, Search, SquareMinus } from "lucide-react";
import { Button, AdminSidebar, Notifications, Checkbox, ConfirmationDialog, ListPager } from "@/components";
import { usePagedList } from "@/hooks/usePagedList";
import { getSession } from "@/services/auth.service";
import { AnimatedTrash } from "@/components/ui/icons/AnimatedTrash";

import { DeleteProductModal } from "./components/DeleteProductModal";
import { ProductFormModal } from "./components/ProductFormModal";
import { ProductRow } from "./components/ProductRow";
import { MenuAccessModal } from "./components/MenuAccessModal";

import Categories from "../Categories";

import type { ProductsProps } from "./types/product.types";

import logoAlternativo from "@/assets/logotipo/logo_alternativo-2.png";

import { isRowAreaClick } from "@/utils/selectableRow";
import "./styles.scss";

export default function Products({
  onNavigate,
  productState,
  categoryState,
  activeTab,
  showAllProducts,
  showAllCategories,
  onSwitchTab,
  onShowAllCategories,
  onBackToMenu,
}: ProductsProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [menuAccessOpen, setMenuAccessOpen] = useState(false);
  const isAdmin = getSession()?.user.role === "ADMIN";
  const promotionState = usePromotions(() => Promise.all([productState.reload(), categoryState.reload()]));
  const { contentRef, transitionContent } =
    useContentTransition(".products-list");
  const reloadPromotions = promotionState.reload;
  // A aba Promoções guarda sua própria cópia dos produtos: recarrega ao entrar nela
  // para refletir exclusões, cadastros e edições feitas nas outras abas.
  useEffect(() => {
    if (activeTab === "promotions") void Promise.resolve().then(reloadPromotions);
  }, [activeTab, reloadPromotions]);

  const {
    products,
    isProductModalOpen,
    editingProductId,
    newProduct,
    setNewProduct,
    hasUnsavedChanges,
    searchQuery,
    setSearchQuery,
    availabilityFilter,
    setAvailabilityFilter,
    sortOrder,
    setSortOrder,
    categoryFilter,
    setCategoryFilter,
    productToDelete,
    setProductToDelete,
    normalizedSearch,
    filteredProducts,
    updateAvailability,
    updateFeatured,
    updateQuantity,
    error: productError,
    busy: productBusy,
    loading: productLoading,
    closeProductModal,
    openNewProduct,
    openEditProduct,
    handlePhotoChange,
    removePhoto,
    setCoverPhoto,
    handleSaveProduct,
    requestProductDeletion,
    confirmProductDeletion,
  } = productState;
  // Inclui a promoção da categoria para a prévia do formulário de produto.
  const productCategories = categoryState.categories;
  const isCategories = activeTab === "categories";
  // Com busca ou filtro ativo a lista mostra todos os resultados (sem corte).
  const isFiltering =
    normalizedSearch !== "" ||
    categoryFilter !== "all" ||
    availabilityFilter !== "all";
  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setAvailabilityFilter("all");
  };
  const listKey = [normalizedSearch, categoryFilter, availabilityFilter, sortOrder].join("|");
  const { pageItems: visibleProducts, pager } = usePagedList(filteredProducts, listKey);
  // Mudou busca/filtro/ordem/página: a seleção recomeça (sem "fantasmas" que voltam depois).
  const viewKey = `${listKey}|${pager.page}|${pager.pageSize}`;
  const [seenView, setSeenView] = useState(viewKey);
  if (seenView !== viewKey) {
    setSeenView(viewKey);
    setSelectedProducts([]);
  }
  // Na renderização em que a chave muda a seleção antiga ainda está no estado:
  // só o que está na tela conta para "Excluir selecionados" e "Colocar em promoção".
  const selectedProductIds = selectedProducts.filter(id => visibleProducts.some(product => product.id === id));
  const toggleProduct = (id: string) =>
    setSelectedProducts((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const pageIds = visibleProducts.map((product) => product.id);
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selectedProducts.includes(id));
  const togglePage = () =>
    setSelectedProducts((current) => pageAllSelected
      ? current.filter((id) => !pageIds.includes(id))
      : [...new Set([...current, ...pageIds])]);
  const deleteSelected = async () => {
    setConfirmBulkDelete(false);
    // Ficam selecionados só os que falharam (se nenhum falhar, a seleção limpa).
    setSelectedProducts(await productState.deleteProducts(selectedProductIds));
  };
  const switchTab = (tab: "products" | "categories" | "promotions") => {
    transitionContent(() => onSwitchTab(tab));
  };

  const promote = (keys: ItemKey[]) => {
    promotionState.defineFor(keys);
    onSwitchTab("promotions");
    setSelectedProducts([]);
  };
  return (
    <div className="products-page">
      <AdminSidebar
        activeId="menu"
        brandSubtitle="GESTÃO DO RESTAURANTE"
        navigationLabel="MENU PRINCIPAL"
        showAvatar
        brandImage={<img src={logoAlternativo} alt="" />}
        onChange={onNavigate ?? (() => undefined)}
      />
      <main className="products-content">
        <div className="products-topbar">
          <div className="products-breadcrumb" aria-label="Página atual">
            <span>Visão geral</span>
            <strong>/ &nbsp;Cardápio</strong>
          </div>
          <div className="products-topbar-actions">
            {/* A busca fica só na barra de filtros de cada aba. */}
            <Notifications />
          </div>
        </div>
        <div className="products-body" ref={contentRef}>
          <header className="products-heading">
            <div>
              {(showAllProducts || showAllCategories) && (
                <button
                  className="products-back"
                  type="button"
                  onClick={onBackToMenu}
                >
                  <ArrowLeft aria-hidden="true" />
                  Voltar ao cardápio
                </button>
              )}
              <h1>
                {showAllCategories
                  ? "Todas as categorias"
                  : showAllProducts
                    ? "Todos os produtos"
                    : "Itens do cardápio"}
              </h1>
              <p>
                {showAllCategories
                  ? "Visualize e gerencie a lista completa de categorias do cardápio."
                  : showAllProducts
                    ? "Visualize e gerencie a lista completa de produtos do cardápio."
                    : "Gerencie produtos e categorias do seu cardápio."}
              </p>
            </div>
            <div className="products-heading-actions"><Button variant="secondary" onClick={() => setMenuAccessOpen(true)}><Eye aria-hidden="true" />Ver cardápio</Button>
            {activeTab !== "promotions" && <Button
              onClick={
                isCategories ? categoryState.openNewCategory : openNewProduct
              }
            >
              <Plus aria-hidden="true" />
              {isCategories ? "Nova categoria" : "Novo produto"}
            </Button>}</div>
          </header>
          {!showAllProducts && !showAllCategories && (
            <section
              className="products-indicators"
              aria-label="Indicadores do cardápio"
            >
              {[
                {
                  label: "Produtos cadastrados",
                  value: products.length,
                  detail: "No cardápio",
                },
                {
                  label: "Disponíveis",
                  value: products.filter((product) => product.available).length,
                  detail: "Ativos para pedidos",
                },
                {
                  label: "Indisponíveis",
                  value: products.filter((product) => !product.available)
                    .length,
                  detail: "Temporariamente",
                  attention: true,
                },
                {
                  label: "Categorias",
                  value: productCategories.length,
                  detail: "Grupos do menu",
                },
              ].map((indicator) => (
                <article
                  className={`products-indicator${indicator.attention ? " is-attention" : ""}`}
                  key={indicator.label}
                >
                  <span>{indicator.label}</span>
                  <strong>{String(indicator.value).padStart(2, "0")}</strong>
                  <p>{indicator.detail}</p>
                </article>
              ))}
            </section>
          )}
          <nav className="products-tabs" aria-label="Seções do cardápio">
            {[["products", "Produtos"], ["categories", "Categorias"], ["promotions", "Promoções"]].map(([id, label]) => <button key={id} type="button" className={activeTab === id ? "active" : ""} aria-current={activeTab === id ? "page" : undefined} onClick={() => switchTab(id as ProductsProps["activeTab"])}>{label}</button>)}
          </nav>
          {activeTab === "promotions" ? <PromotionsContent embedded state={promotionState} onNavigate={onNavigate ?? (() => undefined)} /> : isCategories ? (
            <Categories
              hideTabs
              onPromote={(ids) => promote(ids.map((id) => `c:${id}` as ItemKey))}
              showAll={showAllCategories}
              onShowAll={onShowAllCategories}
              state={categoryState}
              products={products}
              onShowProducts={() => switchTab("products")}
              onProductsChanged={() => void productState.reload()}
            />
          ) : (
            <>
              <div className="products-toolbar">
                <label className="product-search">
                  <Search aria-hidden="true" />
                  <input
                    type="search"
                    aria-label="Pesquisar produto"
                    placeholder="Buscar produto pelo nome..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>
                <label className="product-select">
                  <select
                    aria-label="Filtrar por categoria"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="all">Todas as categorias</option>
                    {productCategories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden="true" />
                </label>
                <label className="product-select">
                  <select
                    aria-label="Filtrar por disponibilidade"
                    value={availabilityFilter}
                    onChange={(event) =>
                      setAvailabilityFilter(event.target.value)
                    }
                  >
                    <option value="all">Todos</option>
                    <option value="available">Disponíveis</option>
                    <option value="unavailable">Indisponíveis</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </label>
                <label className="product-select product-sort">
                  <List aria-hidden="true" />
                  <select
                    aria-label="Organizar lista"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                  >
                    <option value="default">Organizar lista</option>
                    <option value="name">Nome: A–Z</option>
                    <option value="stock">Menor estoque</option>
                  </select>
                </label>
              </div>
              {selectedProductIds.length > 0 && <div className="products-promotion-actions"><span>{selectedProductIds.length} selecionados</span><Button variant="secondary" onClick={() => setSelectedProducts([])}>Limpar seleção</Button><Button onClick={() => promote(selectedProductIds.map(id => `p:${id}` as ItemKey))}>Colocar em promoção</Button>{isAdmin && <Button variant="danger" disabled={productBusy} onClick={() => setConfirmBulkDelete(true)}><AnimatedTrash />Excluir selecionados</Button>}</div>}
              <ConfirmationDialog open={confirmBulkDelete && selectedProductIds.length > 0} variant="danger"
                title={selectedProductIds.length === 1 ? "Excluir 1 produto?" : `Excluir ${selectedProductIds.length} produtos?`}
                description={`⚠️ Atenção: ${selectedProductIds.length === 1 ? "1 produto será excluído" : `${selectedProductIds.length} produtos serão excluídos`} do cardápio. O histórico de pedidos e os relatórios são mantidos. Esta ação não pode ser desfeita.`}
                confirmLabel="Excluir" onCancel={() => setConfirmBulkDelete(false)} onConfirm={() => void deleteSelected()} />
              <section
                className={`products-list${showAllProducts ? " products-list-full" : ""}`}
                aria-labelledby="products-list-title"
              >
                <div className="products-list-heading">
                  <div>
                    <h2 id="products-list-title">Produtos cadastrados</h2>
                    <p>
                      {isFiltering
                        ? `${filteredProducts.length} de ${products.length} produtos`
                        : `${products.length} produtos cadastrados`}
                    </p>
                  </div>
                  <div className="products-list-actions">
                  {visibleProducts.length > 0 && (
                    <Button size="small" variant="secondary" disabled={promotionState.busy} onClick={togglePage}>
                      {pageAllSelected ? <SquareMinus aria-hidden="true" /> : <CheckSquare aria-hidden="true" />}
                      {pageAllSelected ? "Desmarcar todos" : `Selecionar todos (${visibleProducts.length})`}
                    </Button>
                  )}
                  </div>
                </div>
                {productError && !isProductModalOpen && !productToDelete && (
                  <p className="product-form-error" role="alert">{productError}</p>
                )}
                {productLoading && <p role="status">Carregando produtos...</p>}
                <div className="products-list-body">
                  {visibleProducts.map((product) => (
                    <div key={product.id} className={`products-selectable-row selectable-row${selectedProducts.includes(product.id) ? " is-selected" : ""}`}
                      onClick={(event) => { if (!promotionState.busy && isRowAreaClick(event)) toggleProduct(product.id); }}><Checkbox label="" aria-label={`Selecionar ${product.name}`} disabled={promotionState.busy} checked={selectedProducts.includes(product.id)} onChange={() => toggleProduct(product.id)} /><ProductRow
                      key={product.id}
                      product={product}
                      onUpdateQuantity={updateQuantity}
                      onUpdateAvailability={updateAvailability}
                      onUpdateFeatured={updateFeatured}
                      onEdit={openEditProduct}
                    /></div>
                  ))}
                  {!productLoading && products.length === 0 && (
                    <div className="products-no-results">
                      <p>Nenhum produto ainda.</p>
                      <Button size="small" onClick={openNewProduct}>
                        <Plus aria-hidden="true" />
                        Cadastrar primeiro produto
                      </Button>
                    </div>
                  )}
                  {products.length > 0 && filteredProducts.length === 0 && (
                    <div className="products-no-results">
                      <p>Nenhum produto encontrado com os filtros selecionados.</p>
                      <Button size="small" variant="secondary" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    </div>
                  )}
                </div>
                <ListPager {...pager} label="Produtos" />
              </section>
            </>
          )}
        </div>
      </main>

      {menuAccessOpen && <MenuAccessModal onClose={() => setMenuAccessOpen(false)} />}

      {isProductModalOpen && (
        <ProductFormModal
          categories={productCategories}
          editingProductId={editingProductId}
          hasUnsavedChanges={hasUnsavedChanges}
          newProduct={newProduct}
          setNewProduct={setNewProduct}
          products={products}
          onClose={closeProductModal}
          onSave={handleSaveProduct}
          onPhotoChange={handlePhotoChange}
          onRemovePhoto={removePhoto}
          onSetCoverPhoto={setCoverPhoto}
          onDelete={requestProductDeletion}
          onCreateCategory={categoryState.createCategory}
          error={productError}
          busy={productBusy}
        />
      )}

      {productToDelete && (
        <DeleteProductModal
          product={productToDelete}
          onClose={() => setProductToDelete(null)}
          onConfirm={confirmProductDeletion}
          error={productError}
          busy={productBusy}
        />
      )}
    </div>
  );
}
