import { Button } from "@/components";
import { Trash } from "lucide-react";

import type { Category } from "../types/category.types";

type DeleteCategoryModalProps = {
  category: Category | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteCategoryModal({
  category,
  onClose,
  onConfirm,
}: DeleteCategoryModalProps) {
  if (!category) return null;

  return (
    <div
      className="category-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="category-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-category-title"
        aria-describedby="delete-category-description"
      >
        <div className="category-delete-dialog-icon" aria-hidden="true">
          <Trash />
        </div>

        <h2 id="delete-category-title">
          Excluir categoria?
        </h2>

        <p id="delete-category-description">
          “{category.name}” será removida da lista. Os produtos
          vinculados não serão excluídos.
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