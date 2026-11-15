import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft } from "lucide-react";

import { CategoryTabs, ProductCard } from "@/components";
import { ClientTableHeader } from "@/components/layout/ClientTableHeader";
import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { useMenu } from "@/pages/client/Menu/hooks/useMenu";
import { isSoldOut, type MenuCatalog } from "@/services/menu.service";
import { formatPriceMenu } from "@/utils/formatPrice";
import { promotionLabel } from "@/utils/promotion";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { adminPaths } from "@/routers/paths";
import { previewBack, previewTarget } from "./preview";

import "@/pages/client/Menu/styles.scss";

// Seções especiais do cardápio (Destaque/Promoções) usam ids com este prefixo.
const isSpecialSection = (id: string) => id.startsWith("menu-");

/** Cardápio como o cliente vê (com a barra de abas); o card abre o detalhe da prévia. */
export default function MenuPreview({ catalog }: { catalog?: MenuCatalog }) {
  const { sections, activeCategory, setActiveCategory, tabs, isLoading, error } = useMenu(catalog);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const back = previewBack(searchParams);
  // A origem segue para o detalhe e volta com ele.
  const origin = searchParams.get("origem") ? `?origem=${encodeURIComponent(searchParams.get("origem") ?? "")}` : "";

  const productId = searchParams.get("produto");

  // ?produto=<id>: rola até o card na seção da categoria do produto.
  useEffect(() => {
    if (!productId || isLoading) return;
    const regular = sections.filter((section) => !isSpecialSection(section.id));
    const has = (section: (typeof sections)[number]) =>
      section.products.some((product) => product.id === productId);
    const product = sections.flatMap((section) => section.products).find((item) => item.id === productId);
    const section =
      regular.find((item) => item.id === product?.categoryId && has(item)) ?? regular.find(has);
    if (!section) return;
    const index = section.products.findIndex((item) => item.id === productId);
    sectionRefs.current
      .get(section.id)
      ?.querySelectorAll(".product-card")
      [index]?.scrollIntoView({ block: "center" });
  }, [productId, isLoading, sections]);

  function handleCategoryChange(category: string) {
    setActiveCategory(category);
    sectionRefs.current.get(category)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }

  return (
    <div className="client-menu">
      <ClientTableHeader
        backAction={
          <button type="button" className="client-menu-back" aria-label={back.label} onClick={() => navigate(back.path)}>
            <ChevronLeft aria-hidden="true" />
          </button>
        }
      />
      <main className="client-menu-content">
        <CategoryTabs categories={tabs} activeId={activeCategory} onChange={handleCategoryChange} />
        <div className="client-menu-sections">
          {isLoading && <p role="status">Carregando cardápio…</p>}
          {error && <p role="alert">{error}</p>}
          {sections.map((section) => (
            <section
              key={section.id}
              className="client-menu-section"
              ref={(node) => {
                if (node) sectionRefs.current.set(section.id, node);
                else sectionRefs.current.delete(section.id);
              }}
              aria-label={section.name}
            >
              <header className="client-menu-heading">
                <h2>{section.name}</h2>
                <span>{section.products.length} itens</span>
              </header>
              <div
                className={
                  section.id === "menu-featured"
                    ? "client-menu-products client-menu-products--carousel"
                    : "client-menu-products"
                }
              >
                {section.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    name={product.name}
                    description={product.description ?? ""}
                    variant={section.id === "menu-featured" ? "featured" : "default"}
                    price={formatPriceMenu(product.finalPrice)}
                    originalPrice={product.promotion ? formatPriceMenu(product.price) : undefined}
                    badge={product.promotion ? promotionLabel(product.promotion) : undefined}
                    available={product.available && !isSoldOut(product)}
                    unavailableLabel={product.available ? "Esgotado" : undefined}
                    onSelect={() =>
                      navigate(`${adminPaths.menuPreviewProduct}/${encodeURIComponent(product.id)}${origin}`)
                    }
                    image={
                      // Mesma imagem que o cardápio do cliente usa (a original), para a prévia ser fiel.
                      resolveImageUrl(product.imageUrl) ? (
                        <img
                          className="client-menu-photo"
                          src={resolveImageUrl(product.imageUrl)}
                          alt={product.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="client-menu-photo" aria-hidden="true" />
                      )
                    }
                  />
                ))}
              </div>
              {!isLoading && !error && !section.products.length && (
                <p className="client-menu-empty">Nenhum item disponível nesta categoria.</p>
              )}
            </section>
          ))}
          {!isLoading && !error && !sections.length && (
            <p className="client-menu-empty" role="status">Nenhum item disponível.</p>
          )}
        </div>
      </main>
      <ClientTabBar
        onMenu={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        onOrder={() => navigate(previewTarget("order", searchParams))}
        onNavigate={(destination) => navigate(previewTarget(destination, searchParams))}
      />
    </div>
  );
}
