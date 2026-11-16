import { Button } from "@/components";

import { Trash } from "lucide-react";

import type { AdminProduct } from "../types/product.types";

type DeleteProductModalProps = {
  product: AdminProduct;
  onClose: () => void;
  onConfirm: () => void;
  error?: string;
  busy?: boolean;
};

export function DeleteProductModal({
  product,
  onClose,
  onConfirm,
  error,
  busy,
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

        {error && <p role="alert">{error}</p>}

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
            loading={busy}
            onClick={onConfirm}
          >
            Excluir
          </Button>
        </footer>
      </section>
    </div>
  );
}