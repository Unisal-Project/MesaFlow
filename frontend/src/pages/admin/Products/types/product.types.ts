export type MockProduct = {
  id: number;
  name: string;
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
