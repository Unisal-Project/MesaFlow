import type { AppliedPromotion, PromoForm } from "@/utils/promotion";

export type AdminProduct = {
  id: string;
  categoryId: string;
  additionalCategoryIds: string[];
  name: string;
  /** Nome da categoria, derivado de categoryId. */
  category: string;
  price: string;
  priceValue: number;
  /** Preço cobrado hoje (backend), já com promoção. */
  finalPrice: string;
  finalPriceValue: number;
  promotion: AppliedPromotion | null;
  quantity: number;
  trackStock: boolean;
  available: boolean;
  observation?: string;
  imageUrl?: string;
};

export type NewProductForm = {
  name: string;
  quantity: string;
  price: string;
  observation: string;
  /** Guarda o id da categoria selecionada. */
  category: string;
  additionalCategoryIds: string[];
  imageUrl: string;
  trackStock: boolean;
  available: boolean;
  promo: PromoForm;
};

export type ProductsProps = {
  onNavigate?: (id: string) => void;
  productState: ReturnType<typeof import("../hooks/useProducts").useProducts>;
  categoryState: ReturnType<
    typeof import("../../Categories/hooks/useCategories").useCategories
  >;
  activeTab: "products" | "categories";
  showAllProducts: boolean;
  showAllCategories: boolean;
  onSwitchTab: (tab: "products" | "categories") => void;
  onShowAllProducts: () => void;
  onShowAllCategories: () => void;
  onBackToMenu: () => void;
};
