import { useEffect, useRef, type FormEvent } from "react";
import { Button, TextAreaField, TextField } from "@/components";
import { X } from "lucide-react";

import type { CategoryForm } from "../types/category.types";

type CategoryFormModalProps = {
  isOpen: boolean;
  editingCategoryId: number | null;
  form: CategoryForm;
  onFormChange: (form: CategoryForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
};

export function CategoryFormModal({
  isOpen,
  editingCategoryId,
  form,
  onFormChange,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  const modalRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
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
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
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
  }, [isOpen]);
  if (!isOpen) return null;

  const isEditing = editingCategoryId !== null;

  return (
    <div
      className="category-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="category-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
      >
        <header className="category-modal-heading">
          <div>
            <h2 id="category-form-title">
              {isEditing ? "Editar categoria" : "Nova categoria"}
            </h2>

            <p>
              {isEditing
                ? "Atualize as informações da categoria selecionada."
                : "Crie uma categoria para organizar os produtos do cardápio."}
            </p>
          </div>

          <button
            type="button"
            className="category-modal-close"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <form className="category-form" onSubmit={onSubmit}>
          <TextField
            label="Nome da categoria"
            required
            maxLength={50}
            placeholder="Ex.: Pratos principais"
            value={form.name}
            onChange={(event) =>
              onFormChange({
                ...form,
                name: event.target.value,
              })
            }
          />

          <TextAreaField
            label="Descrição"
            required
            maxLength={140}
            placeholder="Explique quais produtos fazem parte desta categoria"
            value={form.description}
            onChange={(event) =>
              onFormChange({
                ...form,
                description: event.target.value,
              })
            }
          />

          <footer className="category-modal-actions">
            <div className="category-modal-save-actions">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>

              <Button type="submit">
                {isEditing
                  ? "Salvar alterações"
                  : "Cadastrar categoria"}
              </Button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}