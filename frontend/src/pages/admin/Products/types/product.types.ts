export type AdminProduct = {
  id: string;
  categoryId: string;
  name: string;
  /** Nome da categoria, derivado de categoryId. */
  category: string;
  price: string;
  quantity: number;
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
  imageUrl: string;
  available: boolean;
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
