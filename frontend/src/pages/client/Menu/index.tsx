import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { ChevronLeft, Search, ShoppingCart } from "lucide-react";
import { ClientHeader, CategoryTabs, ProductCard } from "@/components";
import { useCart } from "@/contexts/useCart";
import { useContentTransition } from "@/hooks/useContentTransition";
import { useMenu } from "./hooks/useMenu";
import type { Product } from "@/services/menu.service";
import type { MenuProps } from "./types/menu.types";
import { formatPriceMenu } from "@/utils/formatPrice";
import "./styles.scss";

export function Menu({ onSelectProduct, onOpenCart, onBack, onNavigate, catalog }: MenuProps) {
  const { itemCount } = useCart();
  const { categories, filteredProducts, activeCategory, setActiveCategory, tabs, searchQuery, setSearchQuery, isLoading, error } = useMenu(catalog);
  const { contentRef, transitionContent } = useContentTransition();
  const table = new URLSearchParams(window.location.search).get("mesa")?.trim() || "12";
  const tableLabel = /^mesa\s/i.test(table) ? table : `Mesa ${table}`;

  function handleSelectProduct(product: Product) {
    onSelectProduct(product, categories.find((item) => item.id === product.categoryId)?.name ?? "");
  }

  return (
    <div className="client-menu">
      <ClientHeader title="MesaFlow" subtitle={tableLabel}
        backAction={onBack ? <button type="button" className="client-menu-back" aria-label="Voltar ao início" onClick={onBack}><ChevronLeft aria-hidden="true" /></button> : undefined}
        cartAction={<button type="button" className="client-menu-cart" aria-label={`Abrir carrinho, ${itemCount} ${itemCount === 1 ? "item" : "itens"}`} onClick={onOpenCart}>
          <ShoppingCart aria-hidden="true" /><span aria-hidden="true">{itemCount}</span>
        </button>} />
      <main className="client-menu-content">
        <label className="client-menu-search"><Search aria-hidden="true" />
          <input type="search" aria-label="Buscar no cardápio" placeholder="Buscar pratos, bebidas ou sobremesas" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
        </label>
        <CategoryTabs categories={tabs} activeId={activeCategory} onChange={(category) => transitionContent(() => setActiveCategory(category))} />
        <header className="client-menu-heading"><h1>{searchQuery.trim() ? "Resultados da busca" : activeCategory === "all" ? "Mais pedidos" : categories.find((category) => category.id === activeCategory)?.name}</h1>
          <span>{searchQuery.trim() || activeCategory !== "all" ? `${filteredProducts.length} itens` : "Hoje"}</span>
        </header>
        <div className="client-menu-products" ref={contentRef}>
          {isLoading && <p role="status">Carregando cardápio…</p>}
          {error && <p role="alert">{error}</p>}
          {filteredProducts.map((product) => <ProductCard key={product.id} name={product.name} description={product.description ?? ""}
            price={formatPriceMenu(product.price)} available={product.available}
            image={product.imageUrl ? <img className="client-menu-photo" src={product.imageUrl} alt={product.name} /> : <div className="client-menu-photo" aria-hidden="true" />}
            actionLabel="Ver item" onAdd={() => handleSelectProduct(product)} />)}
          {!isLoading && !error && !filteredProducts.length && <p className="client-menu-empty" role="status">Nenhum item encontrado. Tente outro nome ou categoria.</p>}
        </div>
      </main>
      <ClientTabBar onMenu={() => onNavigate?.("menu")} onOrder={onOpenCart} onNavigate={onNavigate} />
    </div>
  );
}
