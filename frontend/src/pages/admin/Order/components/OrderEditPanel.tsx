import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components";
import type {
  OrderCatalogProduct,
  OrderFormChanges,
  OrderItem,
  OrderTableOption,
} from "../types/order.types";

export type EditableOrderItem = OrderItem;

type OrderEditPanelProps = {
  orderId?: number;
  mode?: "create" | "edit";
  tableId: string;
  items: EditableOrderItem[];
  observation?: string;
  catalog: OrderCatalogProduct[];
  tableOptions: OrderTableOption[];
  busy?: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (changes: OrderFormChanges) => void;
};
type DraftItem = EditableOrderItem & {
  draftId: number;
  unitObservations: string[];
};
const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OrderEditPanel({
  orderId,
  mode = "edit",
  tableId: initialTable,
  items: initialItems,
  observation: initialObservation = "",
  catalog,
  tableOptions,
  busy = false,
  error,
  onCancel,
  onSave,
}: OrderEditPanelProps) {
  const modalRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [table, setTable] = useState(initialTable);
  const [observation, setObservation] = useState(initialObservation);
  const [items, setItems] = useState<DraftItem[]>(() =>
    initialItems
      .filter((item) => item.name.trim())
      .map((item, index) => ({
        ...item,
        draftId: index + 1,
        unitObservations: Array.from(
          { length: item.quantity },
          (_, unit) => item.unitObservations?.[unit] ?? item.observation ?? "",
        ),
      })),
  );
  // Fechar com alterações pede confirmação (Esc, fundo, X e Cancelar).
  const draft = JSON.stringify({ table, observation, items });
  const [initialDraft] = useState(draft);
  const requestClose = () => {
    if (draft === initialDraft || window.confirm("Descartar alterações?"))
      onCancel();
  };
  const closeRef = useRef(requestClose);
  useEffect(() => {
    closeRef.current = requestClose;
  });
  const [productSearch, setProductSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .trim();
    return catalog.filter((product) =>
      normalize(product.name).includes(normalize(productSearch)),
    );
  }, [catalog, productSearch]);
  const total = items.reduce(
    (sum, item) => sum + item.quantity * Math.max(0, item.unitPrice),
    0,
  );
  const isValid =
    table.length > 0 &&
    items.length > 0 &&
    items.every((item) => item.productId && item.quantity >= 1);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
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
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !searchRef.current?.contains(event.target)
      )
        setSearchOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [searchOpen]);

  const updateQuantity = (draftId: number, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.draftId === draftId
          ? {
              ...item,
              quantity,
              unitObservations: Array.from(
                { length: quantity },
                (_, unit) => item.unitObservations[unit] ?? "",
              ),
            }
          : item,
      ),
    );
  };
  const addProduct = (product: OrderCatalogProduct) => {
    setItems((current) => [
      ...current,
      {
        productId: product.id,
        name: product.name,
        unitPrice: product.unitPrice,
        quantity: 1,
        unitObservations: [""],
        draftId: Math.max(0, ...current.map((item) => item.draftId)) + 1,
      },
    ]);
    setProductSearch("");
    setSearchOpen(false);
  };
  const saveChanges = () => {
    if (!isValid) return;
    onSave({
      tableId: table,
      observation: observation.trim() || undefined,
      items: items.map(({ draftId: _draftId, ...item }) => ({
        ...item,
        name: item.name.trim(),
        observation: undefined,
        unitObservations: item.unitObservations.map((note) => note.trim()),
      })),
    });
  };

  return (
    <div
      className="order-edit-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        ref={modalRef}
        className="order-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-edit-modal-title"
      >
        <header className="order-edit-modal-header">
          <div>
            <h2 id="order-edit-modal-title">
              {mode === "create" ? "Novo pedido" : `Editar pedido #${orderId}`}
            </h2>
            <p>
              {mode === "create"
                ? "Registre um pedido para o cliente e personalize cada item."
                : "Atualize os produtos e personalize cada item do pedido."}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="order-edit-modal-close"
            aria-label="Fechar edição do pedido"
            onClick={requestClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="order-edit-modal-body">
          <div className="order-edit-general">
            <label>
              <span>Mesa</span>
              {/* Um pedido pertence ao atendimento da mesa: não muda de mesa. */}
              <select
                value={table}
                disabled={mode === "edit"}
                onChange={(event) => setTable(event.target.value)}
              >
                <option value="">Selecione uma mesa</option>
                {tableOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <section
            className="order-product-search"
            aria-labelledby="add-products-title"
          >
            <h3 id="add-products-title">Adicionar produtos</h3>
            <div className="product-combobox" ref={searchRef}>
              <label className="product-combobox-search">
                <Search aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Buscar produto no cardápio..."
                  aria-label="Pesquisar produto por nome"
                  aria-expanded={searchOpen}
                  aria-controls="order-product-results"
                  value={productSearch}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => {
                    setProductSearch(event.target.value);
                    setSearchOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && searchOpen) {
                      event.stopPropagation();
                      setSearchOpen(false);
                    }
                  }}
                />
              </label>
              {searchOpen && (
                <div
                  className="product-combobox-menu"
                  id="order-product-results"
                >
                  <div className="product-combobox-options">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                      >
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            {formatCurrency(product.unitPrice)}
                            {product.stock !== null &&
                              ` · ${product.stock} em estoque`}
                          </small>
                        </span>
                        <Plus aria-hidden="true" />
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p>Nenhum produto encontrado.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
          <div className="order-items-caption">
            <h3>ITENS DO PEDIDO</h3>
            <span>Observações personalizadas por unidade</span>
          </div>
          <div className="order-edit-items">
            {items.map((item, index) => (
              <article className="order-edit-item" key={item.draftId}>
                <div className="order-item-topline">
                  <span className="order-product-initial" aria-hidden="true">
                    {item.name.charAt(0)}
                  </span>
                  <div className="order-product-name">
                    <h3>{item.name}</h3>
                    <strong>{formatCurrency(item.unitPrice)}</strong>
                  </div>
                  <div
                    className="order-item-quantity"
                    aria-label={`Quantidade de ${item.name}`}
                  >
                    <button
                      type="button"
                      aria-label={`Diminuir quantidade de ${item.name}`}
                      disabled={item.quantity <= 1}
                      onClick={() =>
                        updateQuantity(item.draftId, item.quantity - 1)
                      }
                    >
                      <Minus aria-hidden="true" />
                    </button>
                    <output aria-label={`Quantidade de ${item.name}`}>
                      {item.quantity}
                    </output>
                    <button
                      type="button"
                      aria-label={`Aumentar quantidade de ${item.name}`}
                      onClick={() =>
                        updateQuantity(item.draftId, item.quantity + 1)
                      }
                    >
                      <Plus aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="order-item-remove"
                    aria-label={`Remover item ${index + 1}`}
                    onClick={() =>
                      setItems((current) =>
                        current.filter(
                          (entry) => entry.draftId !== item.draftId,
                        ),
                      )
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
                <p className="order-unit-title">Observações individuais</p>
                <div className="order-unit-observations">
                  {item.unitObservations.map((note, unit) => (
                    <label key={unit}>
                      <span>Unidade {unit + 1}</span>
                      <input
                        type="text"
                        aria-label={`Observação de ${item.name}, unidade ${unit + 1}`}
                        placeholder="Ex.: sem cebola"
                        value={note}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((entry) =>
                              entry.draftId === item.draftId
                                ? {
                                    ...entry,
                                    unitObservations:
                                      entry.unitObservations.map(
                                        (value, position) =>
                                          position === unit
                                            ? event.target.value
                                            : value,
                                      ),
                                  }
                                : entry,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              </article>
            ))}
            {items.length === 0 && (
              <div className="order-edit-empty">
                <p>Busque um produto no cardápio para adicionar ao pedido.</p>
              </div>
            )}
          </div>
          <label className="order-general-observation">
            <span>Observação geral do pedido (opcional)</span>
            <textarea
              rows={2}
              placeholder="Ex.: Entregar todos os pratos juntos."
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
            />
          </label>
        </div>
        {error && (
          <p className="order-edit-error" role="alert">
            {error}
          </p>
        )}
        <footer className="order-edit-modal-footer">
          <div className="order-edit-total">
            <span>Total do pedido</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <div className="order-edit-actions">
            <Button variant="secondary" onClick={requestClose}>
              Cancelar
            </Button>
            <Button disabled={!isValid} loading={busy} onClick={saveChanges}>
              {mode === "create" ? "Criar pedido" : "Salvar alterações"}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
