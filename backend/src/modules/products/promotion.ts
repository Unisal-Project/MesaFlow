import { z } from "zod";

/** Campos de promoção, iguais em products e categories (regra 8). */
export type Promo = {
  promoType: "PERCENT" | "AMOUNT" | null;
  promoValue: { toString(): string } | null;
  promoActive: boolean;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
};

export type AppliedPromotion = {
  type: "PERCENT" | "AMOUNT";
  value: string;
  source: "PRODUCT" | "CATEGORY";
};

export const promoFields = {
  promoType: true,
  promoValue: true,
  promoActive: true,
  promoStartsAt: true,
  promoEndsAt: true,
} as const;

/** Select Prisma com tudo que o cálculo do preço efetivo precisa. */
export const promoSelect = {
  price: true,
  ...promoFields,
  category: { select: promoFields },
} as const;

type Priced = Promo & {
  price: { toString(): string };
  category?: Promo | null;
};

const toCents = (value: { toString(): string }) =>
  Math.round(Number(value.toString()) * 100);

/** Preço em centavos com a promoção, ou null se ela não vale agora. */
function discounted(
  priceCents: number,
  promo: Promo | null | undefined,
  now: Date,
) {
  if (!promo?.promoActive || !promo.promoType || promo.promoValue == null)
    return null;
  if (promo.promoStartsAt && promo.promoStartsAt > now) return null;
  if (promo.promoEndsAt && promo.promoEndsAt <= now) return null;
  const value = Number(promo.promoValue.toString());
  return promo.promoType === "PERCENT"
    ? Math.round((priceCents * (100 - value)) / 100)
    : priceCents - toCents(promo.promoValue);
}

const applied = (
  promo: Promo,
  source: AppliedPromotion["source"],
): AppliedPromotion => ({
  type: promo.promoType!,
  value: promo.promoValue!.toString(),
  source,
});

/**
 * Único cálculo de preço do sistema: promoção do produto vence a da categoria
 * principal; categoria em R$ que zeraria o preço é ignorada; mínimo R$ 0,01.
 */
export function pricing(product: Priced, now = new Date()) {
  const price = toCents(product.price);
  const format = (cents: number) => (cents / 100).toFixed(2);
  const own = discounted(price, product, now);
  if (own !== null)
    return {
      finalPrice: format(Math.max(1, own)),
      promotion: applied(product, "PRODUCT"),
    };
  const fromCategory = discounted(price, product.category, now);
  if (fromCategory !== null && fromCategory > 0)
    return {
      finalPrice: format(fromCategory),
      promotion: applied(product.category!, "CATEGORY"),
    };
  return { finalPrice: format(price), promotion: null };
}

/** Preço a cobrar no pedido (string "12.34"). */
export const effectivePrice = (product: Priced, now = new Date()) =>
  pricing(product, now).finalPrice;

type PromoInput = {
  promoType?: "PERCENT" | "AMOUNT" | null;
  promoValue?: number | { toString(): string } | null;
  promoActive?: boolean;
  promoStartsAt?: Date | null;
  promoEndsAt?: Date | null;
};

/** Valida o estado (completo ou parcial) da promoção; price só para produto. */
export function promoIssue(promo: PromoInput, price?: number): string | null {
  const value = promo.promoValue == null ? null : Number(promo.promoValue);
  if (
    promo.promoType === "PERCENT" &&
    value !== null &&
    (!Number.isInteger(value) || value < 1 || value > 90)
  )
    return "O percentual da promoção deve ser um inteiro de 1 a 90";
  if (promo.promoActive && (!promo.promoType || value === null))
    return "Promoção ativa exige tipo e valor";
  if (
    promo.promoStartsAt &&
    promo.promoEndsAt &&
    promo.promoEndsAt <= promo.promoStartsAt
  )
    return "O fim da promoção deve ser depois do início";
  if (
    promo.promoType === "AMOUNT" &&
    value !== null &&
    price !== undefined &&
    value >= price
  )
    return "O desconto em R$ deve ser menor que o preço do produto";
  return null;
}

/** Campos Zod da promoção para os DTOs de produto e categoria. */
export const promoSchemaFields = {
  promoType: z.enum(["PERCENT", "AMOUNT"]).nullable().optional(),
  promoValue: z
    .number()
    .positive()
    .max(99_999_999.99)
    .multipleOf(0.01)
    .nullable()
    .optional(),
  promoActive: z.boolean().optional(),
  promoStartsAt: z.coerce.date().nullable().optional(),
  promoEndsAt: z.coerce.date().nullable().optional(),
};
