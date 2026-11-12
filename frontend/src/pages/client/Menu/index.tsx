import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { useRef } from "react";

import {
  ChevronLeft,
  ShoppingCart
} from "lucide-react";

import {
  ClientHeader,
  CategoryTabs,
  ProductCard
} from "@/components";

import { useCart } from "@/contexts/useCart";

import { useMenu } from "./hooks/useMenu";

import type { Product } from "@/services/menu.service";
import type { MenuProps } from "./types/menu.types";

import { formatPriceMenu } from "@/utils/formatPrice";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

import "./styles.scss";

export function Menu({ onSelectProduct, onOpenCart, onBack, onNavigate, catalog }: MenuProps) {
  const { itemCount } = useCart();
  const { categories, sections, activeCategory, setActiveCategory, tabs, isLoading, error } = useMenu(catalog);
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  function handleCategoryChange(category: string) {
    setActiveCategory(category);
    const target = sectionRefs.current.get(category);
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }
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
        <CategoryTabs categories={tabs} activeId={activeCategory} onChange={handleCategoryChange} />
        <div className="client-menu-sections">
          {isLoading && <p role="status">Carregando cardápio…</p>}
          {error && <p role="alert">{error}</p>}
          {sections.map((section) => <section key={section.id} className="client-menu-section"
            ref={(node) => { if (node) sectionRefs.current.set(section.id, node); else sectionRefs.current.delete(section.id); }}
            aria-label={section.name}>
            <header className="client-menu-heading"><h2>{section.name}</h2><span>{section.products.length} itens</span></header>
            <div className={section.id === "menu-featured" ? "client-menu-products client-menu-products--carousel" : "client-menu-products"}>
          {section.products.map((product) => <ProductCard key={product.id} name={product.name} description={product.description ?? ""}
            variant={section.id === "menu-featured" ? "featured" : "default"}
            price={formatPriceMenu(product.price)} available={product.available}
            image={resolveImageUrl(product.imageUrl) ? <img className="client-menu-photo" src={resolveImageUrl(product.imageUrl)} alt={product.name} loading="lazy" /> : <div className="client-menu-photo" aria-hidden="true" />}
            onSelect={() => handleSelectProduct(product)} />)}
            </div>
            {!isLoading && !error && !section.products.length && <p className="client-menu-empty">Nenhum item disponível nesta categoria.</p>}
          </section>)}
          {!isLoading && !error && !sections.length && <p className="client-menu-empty" role="status">Nenhum item disponível.</p>}
        </div>
      </main>
      <ClientTabBar onMenu={() => onNavigate?.("menu")} onOrder={onOpenCart} onNavigate={onNavigate} />
    </div>
  );
}
