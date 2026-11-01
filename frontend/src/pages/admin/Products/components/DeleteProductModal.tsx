import { Button } from "@/components";

import { Trash } from "lucide-react";

import type { MockProduct } from "../types/product.types";

type DeleteProductModalProps = {
  product: MockProduct;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteProductModal({
  product,
  onClose,
  onConfirm,
}: DeleteProductModalProps) {
  return (
    <div
      className="product-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="product-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-product-title"
        aria-describedby="delete-product-description"
      >
        <div
          className="product-delete-dialog-icon"
          aria-hidden="true"
        >
          <Trash />
        </div>

        <h2 id="delete-product-title">
          Excluir produto?
        </h2>

        <p id="delete-product-description">
          “{product.name}” será removido da lista. Esta ação não
          poderá ser desfeita.
        </p>

        <footer>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
          >
            Excluir
          </Button>
        </footer>
      </section>
    </div>
  );
}