import { Button, SelectField, TextAreaField, TextField } from "@/components";

import { ChevronDown, Plus, Trash, X } from "lucide-react";


import { useEffect, useRef } from "react";

import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";

import type {
  MockProduct,
  NewProductForm,
} from "../types/product.types";

type ProductFormModalProps = {
  categories: string[];
  editingProductId: number | null;
  newProduct: NewProductForm;
  setNewProduct: Dispatch<SetStateAction<NewProductForm>>;
  products: MockProduct[];
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (product: MockProduct) => void;
};

export function ProductFormModal({
  categories,
  editingProductId,
  newProduct,
  setNewProduct,
  products,
  onClose,
  onSave,
  onPhotoChange,
  onDelete,
}: ProductFormModalProps) {
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
  }, []);

  return (
    <div
      className="product-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="product-modal product-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
      >
        <header className="product-modal-heading">
          <div>
            <h2 id="product-form-title">
              {editingProductId === null
                ? "Novo produto"
                : "Editar produto"}
            </h2>

            <p>
              {editingProductId === null
                ? "Preencha os dados do item do cardápio."
                : "Atualize as informações do produto selecionado."}
            </p>
          </div>

          <button
            type="button"
            className="product-modal-close"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <form className="new-product-form" onSubmit={onSave}>
          <TextField
            className="new-product-name"
            label="Nome do produto"
            placeholder="Ex.: Burger da casa"
            required
            value={newProduct.name}
            onChange={(event) =>
              setNewProduct((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />

          <div className="new-product-category">
            <SelectField label="Categoria" id="product-category" required value={newProduct.category}
              onChange={(event) => setNewProduct((current) => ({ ...current, category: event.target.value }))}>
              <option value="" disabled>Selecione uma categoria</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </SelectField>
            <ChevronDown aria-hidden="true" />
          </div>
          <TextField label="Preço (R$)" id="product-price" type="number" min={0} step="0.01" placeholder="0,00" required
            value={newProduct.price} onChange={(event) => setNewProduct((current) => ({ ...current, price: event.target.value }))} />
          <TextField label="Quantidade" id="product-quantity" type="number" min={0} step={1} required
            value={newProduct.quantity} onChange={(event) => setNewProduct((current) => ({ ...current, quantity: event.target.value }))} />
          <label className="field new-product-status-field" htmlFor="product-availability">
            <span>Disponibilidade</span>
            <span className={`product-availability-control${newProduct.available ? "" : " is-unavailable"}`}>
              <span aria-hidden="true" />
              <select id="product-availability" value={newProduct.available ? "available" : "unavailable"}
                onChange={(event) => setNewProduct((current) => ({ ...current, available: event.target.value === "available" }))}>
                <option value="available">Disponível</option><option value="unavailable">Indisponível</option>
              </select>
            </span>
          </label>

          <TextAreaField
            className="new-product-observation"
            label="Descrição"
            placeholder="Descreva os ingredientes e características do produto."
            value={newProduct.observation}
            onChange={(event) =>
              setNewProduct((current) => ({
                ...current,
                observation: event.target.value,
              }))
            }
          />

          <div className="new-product-photo">
            <span>Imagem do produto</span>
            <label className="product-photo-upload">
              <input type="file" aria-label="Adicionar imagem do produto" accept="image/png,image/jpeg,image/webp" onChange={onPhotoChange} />
              <Plus aria-hidden="true" />
              {newProduct.imageUrl ? "Alterar imagem" : "Adicionar imagem (opcional)"}
              {newProduct.imageUrl && <img src={newProduct.imageUrl} alt="Prévia do produto" />}
            </label>
          </div>

          <footer className="product-modal-actions">
            {editingProductId !== null && (
              <Button
                type="button"
                variant="ghost"
                className="product-delete-action"
                onClick={() => {
                  const product = products.find(
                    (item) => item.id === editingProductId,
                  );

                  if (product) onDelete(product);
                }}
              >
                <Trash />

                Excluir produto
              </Button>
            )}

            <div className="product-modal-save-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
              >
                Cancelar
              </Button>

              <Button type="submit">
                {editingProductId === null
                  ? "Criar produto"
                  : "Salvar alterações"}
              </Button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}