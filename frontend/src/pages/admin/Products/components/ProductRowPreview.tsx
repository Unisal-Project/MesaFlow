import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { MenuProductCard } from "./MenuProductCard";
import type { AdminProduct } from "../types/product.types";

export function ProductRowPreview({ product, onClose }: {
  product: AdminProduct;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    if (media.matches) {
      onClose();
      return;
    }
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    dialog?.focus();
    document.body.style.overflow = "hidden";
    const closeOnMobile = () => { if (media.matches) onClose(); };
    media.addEventListener("change", closeOnMobile);
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      media.removeEventListener("change", closeOnMobile);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <dialog ref={dialogRef} className="product-modal product-row-preview"
      aria-label={`Prévia de ${product.name}`} tabIndex={-1}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="product-row-preview-content">
        <button type="button" className="product-row-preview-close" aria-label="Fechar prévia" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
        <MenuProductCard
          name={product.name}
          description={product.observation}
          finalPrice={product.finalPriceValue}
          price={product.priceValue}
          promotion={product.promotion}
          imageUrl={product.imageUrl}
          available={product.available}
          trackStock={product.trackStock}
          quantity={product.quantity}
        />
      </div>
    </dialog>
  );
}
