import type { PromoFields } from "@/utils/promotion";

export type PromotionStatus = "active" | "scheduled" | "paused";

/** Promoção própria do item (produto ou categoria); null se não tem nenhuma. */
export function promotionStatus(
  promo: Partial<PromoFields>,
  now = new Date(),
): PromotionStatus | null {
  if (!promo.promoType || promo.promoValue == null) return null;
  if (!promo.promoActive) return "paused";
  if (promo.promoEndsAt && new Date(promo.promoEndsAt) <= now) return "paused";
  if (promo.promoStartsAt && new Date(promo.promoStartsAt) > now)
    return "scheduled";
  return "active";
}
