import {
  useEffect,
  useRef,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { Button, TextField } from "@/components";
import { Trash, X } from "lucide-react";
import type { RestaurantTable, TableForm } from "../types/table.types";

type TableFormModalProps = {
  editingTableId: string | null;
  tableForm: TableForm;
  setTableForm: Dispatch<SetStateAction<TableForm>>;
  tables: RestaurantTable[];
  error: string;
  busy: boolean;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onDelete: (table: RestaurantTable) => void;
};

export function TableFormModal({
  editingTableId,
  tableForm,
  setTableForm,
  tables,
  error,
  busy,
  onClose,
  onSave,
  onDelete,
}: TableFormModalProps) {
  const isEditing = editingTableId !== null;
  const modalRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable.at(-1)?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === focusable.at(-1)
      ) {
        event.preventDefault();
        focusable[0]?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  const handleDelete = () => {
    const table = tables.find((item) => item.id === editingTableId);
    onClose();
    if (table) onDelete(table);
  };

  return (
    <div
      className="table-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="table-modal table-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-form-title"
        aria-describedby="table-form-description"
      >
        <header className="table-modal-heading">
          <div>
            <h2 id="table-form-title">
              {isEditing ? "Editar mesa" : "Cadastrar mesa"}
            </h2>
            <p id="table-form-description">
              {isEditing
                ? "Atualize as informações da mesa."
                : "Adicione uma nova mesa ao estabelecimento."}
            </p>
          </div>
          <button
            type="button"
            className="table-modal-close"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <form className="table-form" onSubmit={onSave}>
          <div className="table-form-fields">
            <TextField
              label="Número ou identificação"
              id="table-identification"
              required
              maxLength={40}
              placeholder="Ex.: 21"
              value={tableForm.name}
              onChange={(event) => {
                const name = event.target.value;
                const number = /^(?:mesa\s*)?(\d+)$/i.exec(name.trim())?.[1];
                setTableForm((current) => ({
                  ...current,
                  name,
                  number: number ?? current.number,
                }));
              }}
            />
            <TextField
              label="Capacidade"
              id="table-capacity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              placeholder="Ex.: 4 lugares"
              value={tableForm.seats}
              onChange={(event) =>
                setTableForm((current) => ({
                  ...current,
                  seats: event.target.value,
                }))
              }
            />
            {isEditing && (
              <label className="table-form-active">
                <input
                  type="checkbox"
                  checked={tableForm.active}
                  onChange={(event) =>
                    setTableForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
                Mesa ativa
              </label>
            )}
            {error && (
              <p className="table-form-error" role="alert">
                {error}
              </p>
            )}
            <p className="table-form-note">
              {isEditing
                ? "As alterações preservam o atendimento atual."
                : "A mesa será cadastrada como disponível."}
            </p>
          </div>
          <footer className="table-modal-actions">
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                className="table-delete-action"
                onClick={handleDelete}
              >
                <Trash aria-hidden="true" />
                Excluir mesa
              </Button>
            )}
            <div className="table-modal-save-actions">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {isEditing ? "Salvar alterações" : "Criar mesa"}
              </Button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
