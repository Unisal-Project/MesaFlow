/**
 * Promoções no front: só EXIBIÇÃO. Quem calcula o preço cobrado é o backend
 * (finalPrice/promotion); previewPrice espelha a regra apenas para a prévia
 * do formulário admin, antes de salvar.
 */
export type PromoType = "PERCENT" | "AMOUNT";

export type PromoFields = {
  promoType: PromoType | null;
  promoValue: string | null;
  promoActive: boolean;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
};

export type AppliedPromotion = {
  type: PromoType;
  value: string;
  source: "PRODUCT" | "CATEGORY";
};

/** Estado do bloco "Promoção" nos formulários (datas em datetime-local). */
export type PromoForm = {
  promoType: PromoType;
  promoValue: string;
  promoActive: boolean;
  promoStartsAt: string;
  promoEndsAt: string;
};

export const emptyPromoForm: PromoForm = {
  promoType: "PERCENT",
  promoValue: "",
  promoActive: false,
  promoStartsAt: "",
  promoEndsAt: "",
};

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Selo do card: "-20%" ou "-R$ 5,00". */
export const promotionLabel = (promotion: { type: PromoType; value: string }) =>
  promotion.type === "PERCENT"
    ? `-${Number(promotion.value)}%`
    : `-${brl(Number(promotion.value))}`;

// ISO (UTC) da API <-> valor local do <input type="datetime-local">.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

export const toPromoForm = (promo: Partial<PromoFields>): PromoForm => ({
  promoType: promo.promoType ?? "PERCENT",
  promoValue: promo.promoValue == null ? "" : String(Number(promo.promoValue)),
  promoActive: promo.promoActive ?? false,
  promoStartsAt: toLocalInput(promo.promoStartsAt ?? null),
  promoEndsAt: toLocalInput(promo.promoEndsAt ?? null),
});

/** Corpo enviado à API; valor vazio vira null (desliga a promoção). */
export const toPromoInput = (form: PromoForm) => {
  const value = form.promoValue === "" ? null : Number(form.promoValue);
  return {
    promoType: value === null ? null : form.promoType,
    promoValue: value,
    promoActive: value !== null && form.promoActive,
    promoStartsAt: toIso(form.promoStartsAt),
    promoEndsAt: toIso(form.promoEndsAt),
  };
};

const formToFields = (form: PromoForm): PromoFields => ({
  ...toPromoInput(form),
  promoValue: form.promoValue || null,
});

function discounted(cents: number, promo: PromoFields | undefined, now: Date) {
  if (!promo?.promoActive || !promo.promoType || !promo.promoValue) return null;
  if (promo.promoStartsAt && new Date(promo.promoStartsAt) > now) return null;
  if (promo.promoEndsAt && new Date(promo.promoEndsAt) <= now) return null;
  const value = Number(promo.promoValue);
  return promo.promoType === "PERCENT"
    ? Math.round((cents * (100 - value)) / 100)
    : cents - Math.round(value * 100);
}

/** Espelho de pricing() do backend, só para a prévia admin. */
export function previewPrice(
  price: string,
  form: PromoForm,
  category?: PromoFields,
  now = new Date(),
): { finalPrice: string; promotion: AppliedPromotion | null } {
  const cents = Math.round(Number(price || 0) * 100);
  const own = formToFields(form);
  const ownCents = discounted(cents, own, now);
  if (ownCents !== null)
    return {
      finalPrice: (Math.max(1, ownCents) / 100).toFixed(2),
      promotion: { type: own.promoType!, value: own.promoValue!, source: "PRODUCT" },
    };
  const categoryCents = discounted(cents, category, now);
  if (category && categoryCents !== null && categoryCents > 0)
    return {
      finalPrice: (categoryCents / 100).toFixed(2),
      promotion: {
        type: category.promoType!,
        value: category.promoValue!,
        source: "CATEGORY",
      },
    };
  return { finalPrice: (cents / 100).toFixed(2), promotion: null };
}
