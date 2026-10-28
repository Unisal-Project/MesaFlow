import type { Product } from '@/services/menu.service';

export type ProductDetailProps = {
  product: Product;
  categoryName: string;
  onNavigate?: (destination: string) => void;
  onBack: () => void;
  onAdded: () => void;
  onGoToCart: () => void;
};