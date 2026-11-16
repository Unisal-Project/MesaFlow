import {
  Badge,
  Button,
  ProductCard,
  SelectField,
  Switch,
  TextAreaField,
  TextField,
} from "@/components";
import { formatPriceMenu } from "@/utils/formatPrice";
import {
  previewPrice,
  promotionLabel,
  type PromoFields,
} from "@/utils/promotion";
import { PromotionFields } from "./PromotionFields";

import { ChevronDown, Plus, Trash, X } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";

import type { AdminProduct, NewProductForm } from "../types/product.types";
import { MONEY_PATTERN, toDecimal } from "../utils/decimal";

type ProductFormModalProps = {
  categories: ({
    id: string;
    name: string;
    active?: boolean;
  } & Partial<PromoFields>)[];
  editingProductId: string | null;
  hasUnsavedChanges?: boolean;
  error?: string;
  busy?: boolean;
  newProduct: NewProductForm;
  setNewProduct: Dispatch<SetStateAction<NewProductForm>>;
  products: AdminProduct[];
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto?: (url: string) => void;
  onSetCoverPhoto?: (url: string) => void;
  onDelete: (product: AdminProduct) => void;
  /** "+ Nova" categoria sem sair do formulário; devolve a categoria criada. */
  onCreateCategory?: (name: string) => Promise<{ id: string }>;
};

export function ProductFormModal({
  categories,
  editingProductId,
  hasUnsavedChanges = false,
  newProduct,
  setNewProduct,
  products,
  onClose,
  onSave,
  onPhotoChange,
  onRemovePhoto,
  onSetCoverPhoto,
  onDelete,
  onCreateCategory,
  error,
  busy,
}: ProductFormModalProps) {
  const modalRef = useRef<HTMLElement>(null);
  const category = categories.find((item) => item.id === newProduct.category);
  const photos = [newProduct.imageUrl, ...(newProduct.moreImages ?? [])].filter(
    Boolean,
  );
  const preview = previewPrice(
    toDecimal(newProduct.price),
    { ...newProduct.promo, promoValue: toDecimal(newProduct.promo.promoValue) },
    category as PromoFields | undefined,
  );
  // null = campo "+ Nova" fechado; sem categorias ele já começa aberto.
  const [newCategoryName, setNewCategoryName] = useState<string | null>(
    categories.length ? null : "",
  );
  const [categoryError, setCategoryError] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Esc, fundo, X e Cancelar passam por aqui: só pergunta se houver alteração
  // (inclusive o nome digitado no "+ Nova" categoria).
  const requestClose = () => {
    const dirty = hasUnsavedChanges || Boolean(newCategoryName?.trim());
    if (!dirty || window.confirm("Descartar alterações?")) onClose();
  };
  const closeRef = useRef(requestClose);
  useEffect(() => {
    closeRef.current = requestClose;
  });

  async function createCategory() {
    const name = newCategoryName?.trim();
    if (!name || !onCreateCategory || creatingCategory) return;
    setCreatingCategory(true);
    setCategoryError("");
    try {
      const saved = await onCreateCategory(name);
      setNewProduct((current) => ({
        ...current,
        category: saved.id,
        additionalCategoryIds: current.additionalCategoryIds.filter(
          (id) => id !== saved.id,
        ),
      }));
      setNewCategoryName(null);
    } catch (reason) {
      setCategoryError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar a categoria.",
      );
    } finally {
      setCreatingCategory(false);
    }
  }
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
        if (event.target === event.currentTarget) requestClose();
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
              {editingProductId === null ? "Novo produto" : "Editar produto"}
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
            onClick={requestClose}
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

          <div className="new-product-category-group">
            <div className="new-product-category-row">
              <div className="new-product-category">
                <SelectField
                  label="Categoria principal"
                  id="product-category"
                  required
                  value={newProduct.category}
                  onChange={(event) =>
                    setNewProduct((current) => ({
                      ...current,
                      category: event.target.value,
                      additionalCategoryIds:
                        current.additionalCategoryIds.filter(
                          (id) => id !== event.target.value,
                        ),
                    }))
                  }
                >
                  <option value="" disabled>
                    Selecione uma categoria
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.active === false ? " (inativa)" : ""}
                    </option>
                  ))}
                </SelectField>
                <ChevronDown aria-hidden="true" />
              </div>
              {onCreateCategory && newCategoryName === null && (
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setNewCategoryName("")}
                >
                  <Plus aria-hidden="true" />
                  Nova
                </Button>
              )}
            </div>
            {onCreateCategory && newCategoryName !== null && (
              <div className="new-product-new-category">
                <TextField
                  label="Nome da nova categoria"
                  id="product-new-category"
                  maxLength={50}
                  placeholder="Ex.: Bebidas"
                  value={newCategoryName}
                  error={categoryError || undefined}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter cria a categoria em vez de enviar o produto.
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    void createCategory();
                  }}
                />
                <Button
                  type="button"
                  size="small"
                  loading={creatingCategory}
                  onClick={() => void createCategory()}
                >
                  Criar
                </Button>
                {categories.length > 0 && (
                  <button
                    type="button"
                    className="product-modal-close"
                    aria-label="Cancelar nova categoria"
                    onClick={() => {
                      setNewCategoryName(null);
                      setCategoryError("");
                    }}
                  >
                    <X aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>
          <TextField
            className="money-field"
            label="Preço (R$)"
            id="product-price"
            inputMode="decimal"
            pattern={MONEY_PATTERN}
            title="Use números, ex.: 12,50"
            placeholder="0,00"
            required
            value={newProduct.price}
            onChange={(event) =>
              setNewProduct((current) => ({
                ...current,
                price: event.target.value,
              }))
            }
          />
          <label
            className="field new-product-status-field"
            htmlFor="product-availability"
          >
            <span>Disponibilidade</span>
            <span
              className={`product-availability-control${newProduct.available ? "" : " is-unavailable"}`}
            >
              <span aria-hidden="true" />
              <select
                id="product-availability"
                value={newProduct.available ? "available" : "unavailable"}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    available: event.target.value === "available",
                  }))
                }
              >
                <option value="available">Disponível</option>
                <option value="unavailable">Indisponível</option>
              </select>
            </span>
          </label>
          <Switch
            label="Destaque no cardápio"
            checked={newProduct.featured ?? false}
            onChange={(event) =>
              setNewProduct((current) => ({
                ...current,
                featured: event.target.checked,
              }))
            }
          />
          <Switch
            className="new-product-track-stock"
            label="Controlar estoque"
            checked={newProduct.trackStock}
            onChange={(event) =>
              setNewProduct((current) => ({
                ...current,
                trackStock: event.target.checked,
              }))
            }
          />
          {newProduct.trackStock && (
            <TextField
              label="Quantidade"
              id="product-quantity"
              type="number"
              min={0}
              step={1}
              required
              value={newProduct.quantity}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  quantity: event.target.value,
                }))
              }
            />
          )}
          <div className="new-product-photo">
            <span>
              Imagem do produto (até 3 fotos; a capa aparece no cardápio)
            </span>
            <ul className="product-photo-list">
              {photos.map((url, index) => (
                <li key={url} className="product-photo-item">
                  <img
                    src={newProduct.photoThumbs?.[url] ?? url}
                    alt={`Foto ${index + 1} do produto`}
                    onError={(event) => {
                      if (event.currentTarget.getAttribute("src") !== url)
                        event.currentTarget.src = url;
                    }}
                  />
                  {index === 0 ? (
                    <Badge variant="success">Capa</Badge>
                  ) : (
                    onSetCoverPhoto && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={() => onSetCoverPhoto(url)}
                      >
                        Definir como capa
                      </Button>
                    )
                  )}
                  {onRemovePhoto && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      aria-label={`Remover foto ${index + 1}`}
                      onClick={() => onRemovePhoto(url)}
                    >
                      <Trash aria-hidden="true" />
                      Remover
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {photos.length < 3 && (
              <label className="product-photo-upload">
                <input
                  type="file"
                  aria-label="Adicionar imagem do produto"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={onPhotoChange}
                />
                <Plus aria-hidden="true" />
                {photos.length
                  ? `Adicionar foto (${photos.length}/3)`
                  : "Adicionar imagem (opcional)"}
              </label>
            )}
          </div>
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
          <PromotionFields
            idPrefix="product"
            value={newProduct.promo}
            onChange={(promo) =>
              setNewProduct((current) => ({ ...current, promo }))
            }
          />
          {preview.promotion?.source === "CATEGORY" && (
            <p className="new-product-promo-inherited" role="status">
              Herdando promoção da categoria {category?.name} (
              {promotionLabel(preview.promotion)})
            </p>
          )}
          <details
            className="new-product-more"
            open={newProduct.additionalCategoryIds.length > 0 || undefined}
          >
            <summary>Mais opções</summary>
            <fieldset className="new-product-additional-categories">
              <legend>Categorias adicionais (opcional)</legend>
              {categories
                .filter((category) => category.id !== newProduct.category)
                .map((category) => (
                  <label key={category.id}>
                    <input
                      type="checkbox"
                      checked={newProduct.additionalCategoryIds.includes(
                        category.id,
                      )}
                      onChange={(event) =>
                        setNewProduct((current) => ({
                          ...current,
                          additionalCategoryIds: event.target.checked
                            ? [...current.additionalCategoryIds, category.id]
                            : current.additionalCategoryIds.filter(
                                (id) => id !== category.id,
                              ),
                        }))
                      }
                    />
                    {category.name}
                    {category.active === false ? " (inativa)" : ""}
                  </label>
                ))}
              {!categories.length && <p>Nenhuma categoria cadastrada.</p>}
            </fieldset>
          </details>

          <div className="new-product-preview">
            {(() => {
              const card = (
                <ProductCard
                  name={newProduct.name || "Nome do produto"}
                  description={newProduct.observation}
                  price={formatPriceMenu(preview.finalPrice)}
                  originalPrice={
                    preview.promotion
                      ? formatPriceMenu(toDecimal(newProduct.price) || "0")
                      : undefined
                  }
                  badge={
                    preview.promotion
                      ? promotionLabel(preview.promotion)
                      : undefined
                  }
                  available={newProduct.available}
                  image={
                    newProduct.imageUrl ? (
                      <img
                        className="food-photo new-product-preview-photo"
                        src={newProduct.imageUrl}
                        alt=""
                      />
                    ) : undefined
                  }
                />
              );
              // Produto salvo e sem alterações: o próprio cartão abre o cardápio real
              // rolado até ele (mesma aba). O link recarrega o app, por isso só sem pendências.
              if (editingProductId === null) return card;
              if (hasUnsavedChanges)
                return (
                  <>
                    {card}
                    <small id="product-preview-hint">
                      Salve as alterações para abrir a prévia no cardápio
                    </small>
                  </>
                );
              return (
                <a
                  className="new-product-preview-link"
                  href={`/admin/ver-cardapio?produto=${encodeURIComponent(editingProductId)}&origem=produtos`}
                  aria-label={`Abrir ${newProduct.name || "produto"} no cardápio`}
                >
                  {card}
                </a>
              );
            })()}
          </div>

          {error && (
            <p className="product-form-error" role="alert">
              {error}
            </p>
          )}

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
              <Button type="button" variant="secondary" onClick={requestClose}>
                Cancelar
              </Button>

              <Button type="submit" loading={busy}>
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
