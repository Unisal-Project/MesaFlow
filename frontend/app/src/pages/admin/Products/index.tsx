import { useContentTransition } from "@/layouts/hooks/useContentTransition";
import { ArrowLeft, ChevronDown, Eye, List, Plus, Search } from "lucide-react";
import { Button, AdminSidebar, Notifications } from "@/components";

import { DeleteProductModal } from "./components/DeleteProductModal";
import { ProductFormModal } from "./components/ProductFormModal";
import { ProductRow } from "./components/ProductRow";

import Categories from "../Categories";

import type { ProductsProps } from "./types/product.types";

import logoAlternativo from "@/assets/logotipo/logo_alternativo-2.png";

import "./styles.scss";

export default function Products({
  onNavigate,
  productState,
  categoryState,
  activeTab,
  showAllProducts,
  showAllCategories,
  onSwitchTab,
  onShowAllProducts,
  onShowAllCategories,
  onBackToMenu,
}: ProductsProps) {
  const { contentRef, transitionContent } =
    useContentTransition(".products-list");

  const openAllProducts = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setAvailabilityFilter("all");
    setSortOrder("default");
    onShowAllProducts();
  };

  const {
    products,
    isProductModalOpen,
    editingProductId,
    newProduct,
    setNewProduct,
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
    updateQuantity,
    closeProductModal,
    openNewProduct,
    openEditProduct,
    handlePhotoChange,
    handleSaveProduct,
    requestProductDeletion,
    confirmProductDeletion,
  } = productState;
  const productCategories = categoryState.categories.map(
    (category) => category.name,
  );
  const isCategories = activeTab === "categories";
  const switchTab = (tab: "products" | "categories") => {
    transitionContent(() => onSwitchTab(tab));
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
        userName="Nome do usuário"
        userRole="Administrador"
      />
      <main className="products-content">
        <div className="products-topbar">
          <div className="products-breadcrumb" aria-label="Página atual">
            <span>Visão geral</span>
            <strong>/ &nbsp;Cardápio</strong>
          </div>
          <div className="products-topbar-actions">
            <label className="product-search product-header-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label="Pesquisar no cardápio"
                placeholder={
                  isCategories ? "Buscar categorias..." : "Buscar produtos..."
                }
                value={isCategories ? categoryState.searchQuery : searchQuery}
                onChange={(event) =>
                  isCategories
                    ? categoryState.setSearchQuery(event.target.value)
                    : setSearchQuery(event.target.value)
                }
              />
            </label>
            <Notifications items={[]} />
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
            <Button
              onClick={
                isCategories ? categoryState.openNewCategory : openNewProduct
              }
            >
              <Plus aria-hidden="true" />
              {isCategories ? "Nova categoria" : "Novo produto"}
            </Button>
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
          {isCategories ? (
            <Categories
              showAll={showAllCategories}
              onShowAll={onShowAllCategories}
              state={categoryState}
              products={products}
              onShowProducts={() => switchTab("products")}
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
                      <option key={category} value={category}>
                        {category}
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
                    <option value="all">Disponibilidade</option>
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
              {!showAllProducts && (
                <nav className="products-tabs" aria-label="Seções do cardápio">
                  <button
                    type="button"
                    className="active"
                    aria-current="page"
                    onClick={() => switchTab("products")}
                  >
                    Produtos
                  </button>
                  <button type="button" onClick={() => switchTab("categories")}>
                    Categorias
                  </button>
                </nav>
              )}
              <section
                className={`products-list${showAllProducts ? " products-list-full" : ""}`}
                aria-labelledby="products-list-title"
              >
                <div className="products-list-heading">
                  <div>
                    <h2 id="products-list-title">Produtos cadastrados</h2>
                    <p>
                      {normalizedSearch ||
                      categoryFilter !== "all" ||
                      availabilityFilter !== "all"
                        ? `${filteredProducts.length} de ${products.length} produtos`
                        : showAllProducts
                          ? `${products.length} produtos cadastrados`
                          : `${Math.min(4, filteredProducts.length)} de ${products.length} produtos cadastrados`}
                    </p>
                  </div>
                  {!showAllProducts && (
                    <Button size="small" onClick={openAllProducts}>
                      <Eye aria-hidden="true" />
                      Ver todos
                    </Button>
                  )}
                </div>
                <div className="products-list-body">
                  {(showAllProducts
                    ? filteredProducts
                    : filteredProducts.slice(0, 4)
                  ).map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onUpdateQuantity={updateQuantity}
                      onUpdateAvailability={updateAvailability}
                      onEdit={openEditProduct}
                      onDelete={setProductToDelete}
                    />
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="products-no-results">
                      Nenhum produto encontrado com os filtros selecionados.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {isProductModalOpen && (
        <ProductFormModal
          categories={productCategories}
          editingProductId={editingProductId}
          newProduct={newProduct}
          setNewProduct={setNewProduct}
          products={products}
          onClose={closeProductModal}
          onSave={handleSaveProduct}
          onPhotoChange={handlePhotoChange}
          onDelete={requestProductDeletion}
        />
      )}

      {productToDelete && (
        <DeleteProductModal
          product={productToDelete}
          onClose={() => setProductToDelete(null)}
          onConfirm={confirmProductDeletion}
        />
      )}
    </div>
  );
}
