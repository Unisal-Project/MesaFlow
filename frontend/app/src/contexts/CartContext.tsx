import {createContext,useContext,useEffect,useState,type ReactNode,} from "react";
import type { Product } from "@/_services/menu.service";

export type CartLine = {
  id: string;
  product: Product;
  quantity: number;
  notes: string;
};

type CartContextValue = {
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

const CART_STORAGE_KEY = "mesaflow:cart";
const SERVICE_FEE_RATE = 0.1;

const CartContext = createContext<CartContextValue | undefined>(undefined);

function createLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadInitialItems(): CartLine[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(loadInitialItems);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(product: Product, quantity: number, notes: string) {
    setItems((current) => {
      const existingIndex = current.findIndex(
        (line) => line.product.id === product.id && line.notes === notes
      );

      if (existingIndex !== -1) {
        return current.map((line, index) =>
          index === existingIndex ? { ...line, quantity } : line
        );
      }

      return [...current, { id: createLineId(), product, quantity, notes }];
    });
  }

  function removeItem(lineId: string) {
    setItems((current) => current.filter((line) => line.id !== lineId));
  }

  function updateQuantity(lineId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(lineId);
      return;
    }

    setItems((current) =>
      current.map((line) => (line.id === lineId ? { ...line, quantity } : line))
    );
  }

  function updateNotes(lineId: string, notes: string) {
    setItems((current) =>
      current.map((line) => (line.id === lineId ? { ...line, notes } : line))
    );
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = items.reduce(
    (sum, line) => sum + Number(line.product.price) * line.quantity,
    0
  );
  const serviceFee = Number((subtotal * SERVICE_FEE_RATE).toFixed(2));
  const total = subtotal + serviceFee;

  function splitLine(lineId: string) {
  setItems((current) => {
    const line = current.find((item) => item.id === lineId);
    if (!line || line.quantity <= 1) return current;

    const individualUnits: CartLine[] = Array.from({ length: line.quantity }, () => ({
      id: createLineId(),
      product: line.product,
      quantity: 1,
      notes: line.notes,
    }));

    return current.flatMap((item) => (item.id === lineId ? individualUnits : [item]));
  });
}

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        serviceFee,
        total,
        addItem,
        removeItem,
        updateQuantity,
        updateNotes,
        clearCart,
        splitLine
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart precisa ser usado dentro de um <CartProvider>");
  }

  return context;
}