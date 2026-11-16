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
  featured: boolean;
  available: boolean;
  observation?: string;
  imageUrl?: string;
  thumbUrl?: string;
};

export type NewProductForm = {
  name: string;
  quantity: string;
  price: string;
  observation: string;
  /** Guarda o id da categoria selecionada. */
  category: string;
  additionalCategoryIds: string[];
  /** Capa (vai para os cards e a prévia). */
  imageUrl: string;
  /** Fotos 2 e 3, na ordem. */
  moreImages: string[];
  /** URL original → miniatura; blobs novos usam a própria prévia local. */
  photoThumbs?: Record<string, string>;
  trackStock: boolean;
  featured: boolean;
  available: boolean;
  promo: PromoForm;
};

export type ProductsProps = {
  onNavigate?: (id: string) => void;
  productState: ReturnType<typeof import("../hooks/useProducts").useProducts>;
  categoryState: ReturnType<
    typeof import("../../Categories/hooks/useCategories").useCategories
  >;
  activeTab: "products" | "categories" | "promotions";
  showAllProducts: boolean;
  showAllCategories: boolean;
  onSwitchTab: (tab: "products" | "categories" | "promotions") => void;
  onShowAllProducts: () => void;
  onShowAllCategories: () => void;
  onBackToMenu: () => void;
};
