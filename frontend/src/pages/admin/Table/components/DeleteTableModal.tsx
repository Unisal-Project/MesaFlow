import { Button } from "@/components";
import { Trash } from "lucide-react";

import type { RestaurantTable } from "../types/table.types";

type DeleteTableModalProps = {
  table: RestaurantTable;
  error: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteTableModal({
  table,
  error,
  busy,
  onClose,
  onConfirm,
}: DeleteTableModalProps) {
  return (
    <div
      className="table-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="table-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-table-title"
      >
        <div className="table-delete-dialog-icon">
          <Trash />
        </div>

        <h2 id="delete-table-title">Excluir mesa?</h2>

        {error && <p role="alert">{error}</p>}

        <p>
          “{table.name}” será removida permanentemente da lista de
          mesas.
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
            disabled={busy}
            onClick={onConfirm}
          >
            Excluir
          </Button>
        </footer>
      </section>
    </div>
  );
}