import { useState, useEffect } from "react";

import type { ProductDetailProps } from "../types/productDetail.types";

import { useCart } from "@/contexts/useCart";

export function useProductDetail(
    product: ProductDetailProps["product"],
    onAdded: ProductDetailProps["onAdded"]
) {
    const { itemCount, items, addItem } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    
    useEffect(() => {
        const existingLine = items.find((line) => line.product.id === product.id);
        setQuantity(existingLine?.quantity ?? 1);
        setNotes(existingLine?.notes ?? "");
    }, [product.id]);

    const quantityReservedElsewhere = items
        .filter((line) => line.product.id === product.id && line.notes !== notes)
        .reduce((sum, line) => sum + line.quantity, 0);
    const maxQuantity = Math.max(0, product.stockQuantity - quantityReservedElsewhere);

    function handleAdd() {
        addItem(product, quantity, notes);
        onAdded();
    }
  
    return {
        itemCount,
        quantity,
        setQuantity,
        notes,
        setNotes,
        maxQuantity,
        handleAdd,
    };
}