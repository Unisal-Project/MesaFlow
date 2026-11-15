import type { AppliedPromotion } from "../promotion.js";

export type ProductInput = {
  categoryId: bigint;
  additionalCategoryIds?: bigint[];
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  stockQuantity?: number;
  trackStock?: boolean;
  available?: boolean;
  active?: boolean;
  promoType?: "PERCENT" | "AMOUNT" | null;
  promoValue?: number | null;
  promoActive?: boolean;
  promoStartsAt?: Date | null;
  promoEndsAt?: Date | null;
};

export type ProductUpdateInput = {
  categoryId?: bigint;
  additionalCategoryIds?: bigint[];
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number;
  stockQuantity?: number;
  trackStock?: boolean;
  available?: boolean;
  active?: boolean;
  promoType?: "PERCENT" | "AMOUNT" | null;
  promoValue?: number | null;
  promoActive?: boolean;
  promoStartsAt?: Date | null;
  promoEndsAt?: Date | null;
};

export type ProductOutput = {
  id: bigint;
  categoryId: bigint;
  additionalCategoryIds?: bigint[];
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  stockQuantity: number;
  trackStock: boolean;
  available: boolean;
  active: boolean;
  promoType: "PERCENT" | "AMOUNT" | null;
  promoValue: string | null;
  promoActive: boolean;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
  /** Preço a cobrar agora (com promoção vigente). */
  finalPrice: string;
  promotion: AppliedPromotion | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductResponse = {
  id: string;
  categoryId: string;
  additionalCategoryIds: string[];
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  stockQuantity: number;
  trackStock: boolean;
  available: boolean;
  active: boolean;
  promoType: "PERCENT" | "AMOUNT" | null;
  promoValue: string | null;
  promoActive: boolean;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
  /** Preço a cobrar agora (com promoção vigente). */
  finalPrice: string;
  promotion: AppliedPromotion | null;
  createdAt: Date;
  updatedAt: Date;
};
