import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Minus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/buttons/Button";
import { orderProductCatalog, orderTableOptions } from "./orderCatalog";

export type EditableOrderItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  observation?: string;
};

type OrderEditPanelProps = {
  orderId?: number;
  mode?: "create" | "edit";
  table: string;
  time: string;
  items: EditableOrderItem[];
  onCancel: () => void;
  onSave: (changes: {
    table: string;
    time: string;
    items: EditableOrderItem[];
  }) => void;
};

type DraftItem = EditableOrderItem & { draftId: number };

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OrderEditPanel({
  orderId,
  mode = "edit",
  table: initialTable,
  time: initialTime,
  items: initialItems,
  onCancel,
  onSave,
}: OrderEditPanelProps) {
  const modalRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const openProductIdRef = useRef<number | null>(null);
  const [table, setTable] = useState(initialTable);
  const [time, setTime] = useState(initialTime);
  const [items, setItems] = useState<DraftItem[]>(() =>
    initialItems.map((item, index) => ({ ...item, draftId: index + 1 })),
  );
  const [openProductId, setOpenProductId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    openProductIdRef.current = openProductId;
  }, [openProductId]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();

    return orderProductCatalog.filter((product) =>
      product.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch),
    );
  }, [productSearch]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.quantity * Math.max(0, item.unitPrice),
        0,
      ),
    [items],
  );
  const isValid =
    table.trim().length > 0 &&
    time.length > 0 &&
    items.length > 0 &&
    items.every(
      (item) =>
        item.name.trim().length > 0 &&
        item.quantity >= 1 &&
        item.unitPrice > 0,
    );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (openProductIdRef.current !== null) {
          setOpenProductId(null);
          setProductSearch("");
        } else {
          onCancel();
        }
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onCancel]);

  const updateItem = (draftId: number, changes: Partial<DraftItem>) => {
    setItems((current) =>
      current.map((item) =>
        item.draftId === draftId ? { ...item, ...changes } : item,
      ),
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        draftId:
          current.length > 0
            ? Math.max(...current.map((item) => item.draftId)) + 1
            : 1,
        name: "",
        quantity: 1,
        unitPrice: 0,
        observation: "",
      },
    ]);
  };

  const fillSimulatedOrder = () => {
    const now = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setTable("Mesa 06");
    setTime(now);
    setItems([
      {
        draftId: 1,
        name: "X-Burger artesanal",
        quantity: 2,
        unitPrice: 28.9,
        observation: "Molho à parte",
      },
      {
        draftId: 2,
        name: "Batata rústica",
        quantity: 1,
        unitPrice: 18,
        observation: "",
      },
      {
        draftId: 3,
        name: "Suco de laranja",
        quantity: 1,
        unitPrice: 12,
        observation: "Sem gelo",
      },
    ]);
    setOpenProductId(null);
    setProductSearch("");
  };

  const saveChanges = () => {
    if (!isValid) return;
    onSave({
      table: table.trim(),
      time,
      items: items.map(({ draftId: _draftId, ...item }) => ({
        ...item,
        name: item.name.trim(),
        observation: item.observation?.trim() || undefined,
      })),
    });
  };

  return (
    <div
      className="order-edit-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
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
            <span>{mode === "create" ? "NOVO PEDIDO" : "EDIÇÃO DO PEDIDO"}</span>
            <h2 id="order-edit-modal-title">
              {mode === "create" ? "Criar pedido" : `Editar pedido #${orderId}`}
            </h2>
            <p>
              {mode === "create"
                ? "Escolha a mesa e adicione os produtos do novo pedido."
                : "Atualize a mesa, os produtos e as observações do pedido."}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="order-edit-modal-close"
            aria-label="Fechar edição do pedido"
            onClick={onCancel}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="order-edit-modal-body">
          <div className="order-edit-panel">
            {mode === "create" && (
              <div className="order-simulation-bar">
                <div>
                  <strong>Precisa testar rapidamente?</strong>
                  <span>Preencha um pedido completo com dados de exemplo.</span>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={fillSimulatedOrder}
                >
                  Preencher pedido simulado
                </Button>
              </div>
            )}

            <div className="order-edit-general">
              <label>
                <span>Mesa ou atendimento</span>
                <select
                  value={table}
                  onChange={(event) => setTable(event.target.value)}
                >
                  {orderTableOptions.map((tableOption) => (
                    <option value={tableOption} key={tableOption}>
                      {tableOption}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Horário</span>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </label>
            </div>

            <div className="order-edit-section-heading">
              <div>
                <h3>Itens do pedido</h3>
                <p>Busque um produto pelo nome para alterar ou incluir.</p>
              </div>
              <Button variant="secondary" size="small" onClick={addItem}>
                <Plus aria-hidden="true" />
                Adicionar item
              </Button>
            </div>

            <div className="order-edit-items">
              {items.map((item, index) => (
                <article className="order-edit-item" key={item.draftId}>
                  <div className="order-edit-item-heading">
                    <strong>Item {index + 1}</strong>
                    <button
                      type="button"
                      aria-label={`Remover item ${index + 1}`}
                      onClick={() =>
                        setItems((current) =>
                          current.filter(
                            (currentItem) =>
                              currentItem.draftId !== item.draftId,
                          ),
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>

                  <div className="order-edit-field order-edit-name">
                    <span>Produto</span>
                    <div className="product-combobox">
                      <button
                        type="button"
                        className="product-combobox-trigger"
                        aria-haspopup="listbox"
                        aria-expanded={openProductId === item.draftId}
                        aria-controls={`product-options-${item.draftId}`}
                        onClick={() => {
                          const willOpen = openProductId !== item.draftId;
                          setOpenProductId(willOpen ? item.draftId : null);
                          setProductSearch("");
                        }}
                      >
                        <span className={item.name ? "" : "is-placeholder"}>
                          {item.name || "Selecione um produto"}
                        </span>
                        <ChevronDown aria-hidden="true" />
                      </button>

                      {openProductId === item.draftId && (
                        <div
                          className="product-combobox-menu"
                          id={`product-options-${item.draftId}`}
                        >
                          <label className="product-combobox-search">
                            <Search aria-hidden="true" />
                            <input
                              autoFocus
                              type="search"
                              aria-label="Pesquisar produto por nome"
                              placeholder="Pesquisar produto..."
                              value={productSearch}
                              onChange={(event) =>
                                setProductSearch(event.target.value)
                              }
                            />
                          </label>
                          <div className="product-combobox-options" role="listbox">
                            {filteredProducts.map((product) => (
                              <button
                                type="button"
                                role="option"
                                aria-selected={item.name === product.name}
                                className={
                                  item.name === product.name ? "is-selected" : ""
                                }
                                key={product.id}
                                onClick={() => {
                                  updateItem(item.draftId, {
                                    name: product.name,
                                    unitPrice: product.unitPrice,
                                  });
                                  setOpenProductId(null);
                                  setProductSearch("");
                                }}
                              >
                                <span>
                                  <strong>{product.name}</strong>
                                  <small>{formatCurrency(product.unitPrice)}</small>
                                </span>
                                {item.name === product.name && (
                                  <Check aria-hidden="true" />
                                )}
                              </button>
                            ))}
                            {filteredProducts.length === 0 && (
                              <p>Nenhum produto encontrado.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="order-edit-item-row">
                    <div className="order-edit-quantity">
                      <span>Quantidade</span>
                      <div>
                        <button
                          type="button"
                          aria-label={`Diminuir quantidade de ${item.name || `item ${index + 1}`}`}
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            updateItem(item.draftId, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                        >
                          <Minus aria-hidden="true" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          aria-label={`Quantidade de ${item.name || `item ${index + 1}`}`}
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.draftId, {
                              quantity: Math.max(
                                1,
                                Number(event.target.value) || 1,
                              ),
                            })
                          }
                        />
                        <button
                          type="button"
                          aria-label={`Aumentar quantidade de ${item.name || `item ${index + 1}`}`}
                          onClick={() =>
                            updateItem(item.draftId, {
                              quantity: item.quantity + 1,
                            })
                          }
                        >
                          <Plus aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <label className="order-edit-field order-edit-price is-readonly">
                      <span>Preço unitário</span>
                      <div>
                        <span>R$</span>
                        <input
                          type="number"
                          value={item.unitPrice || ""}
                          placeholder="0,00"
                          readOnly
                          aria-label={`Preço de ${item.name || `item ${index + 1}`}`}
                        />
                      </div>
                    </label>
                  </div>

                  <label className="order-edit-field">
                    <span>Observação (opcional)</span>
                    <input
                      type="text"
                      placeholder="Ex.: sem cebola"
                      value={item.observation ?? ""}
                      onChange={(event) =>
                        updateItem(item.draftId, {
                          observation: event.target.value,
                        })
                      }
                    />
                  </label>
                </article>
              ))}

              {items.length === 0 && (
                <div className="order-edit-empty">
                  <p>O pedido precisa ter pelo menos um item.</p>
                  <Button variant="secondary" size="small" onClick={addItem}>
                    <Plus aria-hidden="true" />
                    Adicionar primeiro item
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="order-edit-modal-footer">
          <div className="order-edit-total">
            <span>Novo total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <div className="order-edit-actions">
            <Button variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button disabled={!isValid} onClick={saveChanges}>
              {mode === "create" ? "Criar pedido" : "Salvar alterações"}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
