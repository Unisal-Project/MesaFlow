import { ProductCard } from "@/components";
import { isSoldOut } from "@/services/menu.service";
import { formatPriceMenu } from "@/utils/formatPrice";
import { promotionLabel, type AppliedPromotion } from "@/utils/promotion";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
// Os estilos do cardápio do cliente (somente importados): o card da prévia é o
// MESMO JSX e as MESMAS classes do cardápio real, então fica idêntico a ele.
import "@/pages/client/Menu/styles.scss";
import "@/layouts/clientWorkspace.scss";

type MenuProductCardProps = {
  name: string;
  description?: string;
  /** Preço cobrado (já com promoção) e preço cheio (riscado quando há promoção). */
  finalPrice: number | string;
  price: number | string;
  promotion: AppliedPromotion | null;
  imageUrl?: string;
  available: boolean;
  trackStock: boolean;
  quantity: number;
};

/** Prévia de produto do admin: o card do cardápio do cliente, fora da página dele. */
export function MenuProductCard({
  name,
  description,
  finalPrice,
  price,
  promotion,
  imageUrl,
  available,
  trackStock,
  quantity,
}: MenuProductCardProps) {
  const src = resolveImageUrl(imageUrl ?? null);
  return (
    <div className="menu-card-preview client-workspace">
      <div className="client-menu">
        <div className="client-menu-products">
          <ProductCard
            name={name}
            description={description ?? ""}
            price={formatPriceMenu(String(finalPrice))}
            originalPrice={promotion ? formatPriceMenu(String(price)) : undefined}
            badge={promotion ? promotionLabel(promotion) : undefined}
            // Mesma regra do cliente: esgotado = controla estoque e o saldo acabou.
            available={available && !isSoldOut({ trackStock, stockQuantity: quantity })}
            unavailableLabel={available ? "Esgotado" : undefined}
            image={
              src ? (
                <img className="client-menu-photo" src={src} alt={name} loading="lazy" />
              ) : (
                <div className="client-menu-photo" aria-hidden="true" />
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
