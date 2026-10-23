import { useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/services/menu.service";
import { CartContext, type CartLine } from "./CartContext";

const CART_STORAGE_KEY = "mesaflow:cart";

function createLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadInitialItems(storageKey: string): CartLine[] {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({
  children,
  storageKey = CART_STORAGE_KEY,
}: {
  children: ReactNode;
  storageKey?: string;
}) {
  const [items, setItems] = useState<CartLine[]>(() =>
    loadInitialItems(storageKey),
  );

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  function addItem(product: Product, quantity: number, notes: string) {
    setItems((current) => {
      const existingIndex = current.findIndex(
        (line) => line.product.id === product.id && line.notes === notes,
      );

      if (existingIndex !== -1) {
        return current.map((line, index) =>
          index === existingIndex ? { ...line, quantity } : line,
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
      current.map((line) =>
        line.id === lineId ? { ...line, quantity } : line,
      ),
    );
  }

  function updateNotes(lineId: string, notes: string) {
    setItems((current) =>
      current.map((line) => (line.id === lineId ? { ...line, notes } : line)),
    );
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = items.reduce(
    (sum, line) => sum + Number(line.product.price) * line.quantity,
    0,
  );
  const total = subtotal;

  function splitLine(lineId: string) {
    setItems((current) => {
      const line = current.find((item) => item.id === lineId);
      if (!line || line.quantity <= 1) return current;

      const individualUnits: CartLine[] = Array.from(
        { length: line.quantity },
        () => ({
          id: createLineId(),
          product: line.product,
          quantity: 1,
          notes: line.notes,
        }),
      );

      return current.flatMap((item) =>
        item.id === lineId ? individualUnits : [item],
      );
    });
  }

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        total,
        addItem,
        removeItem,
        updateQuantity,
        updateNotes,
        clearCart,
        splitLine,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
