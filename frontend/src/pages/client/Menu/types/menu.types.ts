import type { MenuCatalog, Product } from "@/services/menu.service";

export type { MenuCatalog } from "@/services/menu.service";

export type MenuProps = {
  catalog?: MenuCatalog;
  onBack?: () => void;
  onNavigate?: (destination: string) => void;
  onSelectProduct: (product: Product, categoryName: string) => void;
  onOpenCart: () => void;
};