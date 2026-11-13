import { useState } from "react";

import type { ProductDetailProps } from "../types/productDetail.types";
import { useCart } from "@/contexts/useCart";

export function useProductDetail(
    product: ProductDetailProps["product"],
    onAdded: ProductDetailProps["onAdded"]
) {
    const { itemCount, items, addItem } = useCart();
    const [notes, setNotes] = useState<string[]>(() => {
        const existingNotes = items
            .filter((line) => line.product.id === product.id)
            .flatMap((line) => Array.from({ length: line.quantity }, () => line.notes));
        return existingNotes.length ? existingNotes : [""];
    });
    const quantity = notes.length;
    const maxQuantity = Math.max(0, product.stockQuantity);

    function setQuantity(nextQuantity: number) {
        setNotes((current) => Array.from(
            { length: Math.max(1, Math.min(nextQuantity, maxQuantity)) },
            (_, index) => current[index] ?? "",
        ));
    }

    function setUnitNotes(index: number, value: string) {
        setNotes((current) => current.map((note, unitIndex) => unitIndex === index ? value : note));
    }

    function handleAdd() {
        if (quantity > maxQuantity) return;
        addItem(product, quantity, notes);
        onAdded();
    }

    return { itemCount, quantity, setQuantity, notes, setUnitNotes, maxQuantity, handleAdd };
}
