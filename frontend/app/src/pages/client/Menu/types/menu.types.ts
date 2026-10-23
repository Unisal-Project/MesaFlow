import type { Category, Product } from "@/services/menu.service"

export type MenuCatalog = { categories: Category[]; products: Product[] };

export type MenuProps = {
  catalog?: MenuCatalog;
  onBack?: () => void;
  onNavigate?: (destination: string) => void;
  onSelectProduct: (product: Product, categoryName: string) => void;
  onOpenCart: () => void;
};