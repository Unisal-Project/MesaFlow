import { createContext } from "react";
import type { Product } from "@/services/menu.service";

export type CartLine = {
  id: string;
  product: Product;
  quantity: number;
  notes: string;
};

export type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  addItem: (product: Product, quantity: number, notes: string) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  updateNotes: (lineId: string, notes: string) => void;
  clearCart: () => void;
  splitLine: (lineId: string) => void;
};

export const CartContext = createContext<CartContextValue | undefined>(
  undefined
);