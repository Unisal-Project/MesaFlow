import { calculateBill } from "@/utils/serviceFee";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Check,
  CreditCard,
  Plus,
  QrCode,
  Trash2,
  X,
} from "lucide-react";

import type { PaymentMethod, CompletedPayment } from "../types/order.types";

import { fetchSettings } from "@/services/settings.service";
import { Button, SkeletonCard, SystemMessage } from "@/components";

type PaymentDraft = {
  id: number;
  method: PaymentMethod;
  amount: string;
  wantsChange: boolean;
  receivedAmount: string;
  feeRate: string;
};

/** Pedido que compõe a conta da mesa (aba "Pedidos da mesa"). */
export type AccountOrder = {
  id: number;
  total: number;
  time?: string;
  items?: { name: string; quantity: number; unitPrice: number; observation?: string }[];
};

type PaymentModalProps = {
  orderId: number;
  total: number;
  /** Mesa da conta (ex.: "Mesa 5"); a conta fecha todos os pedidos dela. */
  table?: string;
  /** Pedidos incluídos na conta, para o resumo mostrar de onde vem o consumo. */
  accountOrders?: AccountOrder[];
  onClose: () => void;
  onComplete: (payments: CompletedPayment[], serviceFeeWaived: boolean) => void;
};

const paymentMethods = [
  { value: "pix" as const, label: "Pix", icon: QrCode },
  { value: "cash" as const, label: "Dinheiro", icon: Banknote },
  { value: "debit" as const, label: "Débito", icon: CreditCard },
  { value: "credit" as const, label: "Crédito", icon: CreditCard },
];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseAmount = (value: string) => {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};

const toInputAmount = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",");
/** Percentual digitado com vírgula ou ponto. */
const parseRate = (value: string) => Number(value.replace(",", "."));

/** Não monta o formulário nem permite confirmar com uma taxa presumida. */
export function PaymentModal(props: PaymentModalProps) {
  const [rate, setRate] = useState<number | null>(null);
  const [error, setError] = useState("");
  const pendingRef = useRef<HTMLDialogElement>(null);
  const reload = useCallback(async () => {
    setError("");
    try { setRate((await fetchSettings()).serviceFeeRate); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar a taxa de serviço."); }
  }, []);
  useEffect(() => { void Promise.resolve().then(reload); }, [reload]);
  useEffect(() => {
    if (rate !== null) return;
    const dialog = pendingRef.current;
    const focus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; focus?.focus(); };
  }, [rate]);
  if (rate !== null) return <PaymentForm {...props} serviceFeeRate={rate} />;
  return <dialog ref={pendingRef} className="payment-modal payment-settings-loading" aria-labelledby="payment-settings-title"
    onCancel={event => { event.preventDefault(); props.onClose(); }}>
    <h2 id="payment-settings-title">Carregando conta</h2>
    {error ? <><SystemMessage variant="error">{error}</SystemMessage><Button variant="secondary" onClick={() => void reload()}>Tentar de novo</Button></> : <SkeletonCard />}
    <Button variant="secondary" onClick={props.onClose}>Voltar</Button>
  </dialog>;
}

export function PaymentForm({
  orderId,
  total,
  table,
  accountOrders = [],
  onClose,
  onComplete,
  serviceFeeRate,
}: PaymentModalProps & { serviceFeeRate: number }) {
  const modalRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<"payment" | "orders">("payment");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [serviceFeeWaived, setServiceFeeWaived] = useState(false);
  const subtotalCents = Math.round(total * 100);
  const { serviceInCents, totalInCents: totalCents } = calculateBill(subtotalCents, serviceFeeRate, serviceFeeWaived);
  const [payments, setPayments] = useState<PaymentDraft[]>([
    {
      id: 1,
      method: "pix",
      amount: toInputAmount(totalCents),
      wantsChange: false,
      receivedAmount: "",
      feeRate: "",
    },
  ]);

  // Fechar com alterações pede confirmação (Esc, fundo, X e Cancelar).
  const draft = JSON.stringify({ payments, serviceFeeWaived });
  const [initialDraft] = useState(draft);
  const requestClose = () => {
    if (draft === initialDraft || window.confirm("Descartar alterações?"))
      onClose();
  };
  const closeRef = useRef(requestClose);
  useEffect(() => {
    closeRef.current = requestClose;
  });

  const paidCents = useMemo(
    () =>
      payments.reduce((sum, payment) => sum + parseAmount(payment.amount), 0),
    [payments],
  );
  const remainingCents = totalCents - paidCents;
  const hasInvalidCash = payments.some(
    (payment) =>
      payment.method === "cash" &&
      payment.wantsChange &&
      parseAmount(payment.receivedAmount) < parseAmount(payment.amount),
  );
  const canComplete =
    payments.every((payment) => parseAmount(payment.amount) > 0) &&
    remainingCents === 0 &&
    !hasInvalidCash &&
    payments.every(
      (payment) =>
        payment.method !== "credit" ||
        (Number.isFinite(parseRate(payment.feeRate)) &&
          parseRate(payment.feeRate) >= 0 &&
          parseRate(payment.feeRate) <= 100),
    );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab" || !modalRef.current) return;

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
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
  }, []);

  const updatePayment = (id: number, changes: Partial<PaymentDraft>) => {
    setPayments((current) =>
      current.map((payment) =>
        payment.id === id ? { ...payment, ...changes } : payment,
      ),
    );
  };

  const selectMethod = (id: number, method: PaymentMethod) => {
    updatePayment(id, {
      method,
      wantsChange: false,
      receivedAmount: "",
      feeRate: "",
    });
  };

  const addPayment = () => {
    if (payments.length >= 4) return;

    setPayments((current) => [
      ...current,
      {
        id: Math.max(...current.map((payment) => payment.id)) + 1,
        method: current.at(-1)?.method ?? "pix",
        amount: remainingCents > 0 ? toInputAmount(remainingCents) : "",
        wantsChange: false,
        receivedAmount: "",
        feeRate: "",
      },
    ]);
  };

  const removePayment = (id: number) => {
    setPayments((current) => current.filter((payment) => payment.id !== id));
  };

  const finishOrder = () => {
    if (!canComplete) return;
    onComplete(
      payments.map((payment) => {
        const amount = parseAmount(payment.amount) / 100;
        const receivedAmount = parseAmount(payment.receivedAmount) / 100;
        return {
          method: payment.method,
          amount,
          ...(payment.method === "credit" && parseRate(payment.feeRate) > 0
            ? {
                processingFeeRate: parseRate(payment.feeRate),
                processingFee:
                  Math.round(
                    (parseAmount(payment.amount) * parseRate(payment.feeRate)) /
                      100,
                  ) / 100,
              }
            : {}),
          ...(payment.method === "cash" && payment.wantsChange
            ? {
                receivedAmount,
                change: Math.max(0, receivedAmount - amount),
              }
            : {}),
        };
      }),
      serviceFeeWaived,
    );
  };

  return (
    <div
      className="payment-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        ref={modalRef}
        className="payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <header className="payment-modal-header">
          <div>
            <h2 id="payment-modal-title">Fechar conta · {table || `pedido #${orderId}`}</h2>
            <p>
              {accountOrders.length > 1
                ? `A conta inclui ${accountOrders.length} pedidos desta mesa. Informe como o cliente realizou o pagamento.`
                : "Informe como o cliente realizou o pagamento."}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="payment-modal-close"
            aria-label="Fechar pagamento"
            onClick={requestClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="payment-modal-body">
          <div className="payment-modal-main">
            {accountOrders.length > 0 && (
              <div className="payment-view-tabs" role="tablist" aria-label="Fechamento da conta">
                {([["payment", "Pagamento"], ["orders", `Pedidos da mesa (${accountOrders.length})`]] as const).map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={view === id}
                    className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>
                ))}
              </div>
            )}
            {view === "orders" ? (
              <ol className="payment-account-orders" aria-label="Pedidos incluídos na conta">
                {accountOrders.map((order) => (
                  <li key={order.id}>
                    <header>
                      <strong>Pedido #{order.id}</strong>
                      {order.time && <span>Enviado às {order.time}</span>}
                      <strong className="payment-account-order-total">{formatCurrency(order.total)}</strong>
                    </header>
                    {order.items && order.items.length > 0 && (
                      <ul>
                        {order.items.map((item, index) => (
                          <li key={`${item.name}-${index}`}>
                            <span>{item.quantity}× {item.name}{item.observation ? <small> · {item.observation}</small> : null}</span>
                            <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            ) : (<>
            <div className="payment-section-heading">
              <div>
                <h3>Formas de pagamento</h3>
                <p>Use uma forma ou divida em até quatro pagamentos.</p>
              </div>
            </div>

            <div className="payment-entries">
              {payments.map((payment, index) => {
                const amountCents = parseAmount(payment.amount);
                const receivedCents = parseAmount(payment.receivedAmount);
                const changeCents = Math.max(0, receivedCents - amountCents);

                return (
                  <article className="payment-entry" key={payment.id}>
                    <div className="payment-entry-heading">
                      <strong>Pagamento {index + 1}</strong>
                      {index === 0 && (
                        <Button
                          variant="secondary"
                          size="small"
                          disabled={payments.length >= 4}
                          onClick={addPayment}
                        >
                          <Plus aria-hidden="true" />
                          Dividir pagamento
                        </Button>
                      )}

                      {payments.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remover pagamento ${index + 1}`}
                          onClick={() => removePayment(payment.id)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div
                      className="payment-method-options"
                      role="radiogroup"
                      aria-label={`Forma do pagamento ${index + 1}`}
                    >
                      {paymentMethods.map((method) => {
                        const Icon = method.icon;
                        const selected = payment.method === method.value;
                        return (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={selected ? "is-selected" : ""}
                            key={method.value}
                            onClick={() =>
                              selectMethod(payment.id, method.value)
                            }
                          >
                            <Icon aria-hidden="true" />
                            {method.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="payment-entry-fields">
                      <label className="payment-amount-field">
                        <span>Valor nesta forma</span>
                        <div>
                          <span>R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Valor do pagamento ${index + 1}`}
                            value={payment.amount}
                            onChange={(event) =>
                              updatePayment(payment.id, {
                                amount: event.target.value,
                              })
                            }
                          />
                        </div>
                      </label>

                      {payment.method === "cash" && payment.wantsChange && (
                        <label className="payment-amount-field">
                          <span>Valor recebido</span>
                          <div>
                            <span>R$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Valor recebido do pagamento ${index + 1}`}
                              value={payment.receivedAmount}
                              placeholder="0,00"
                              onChange={(event) =>
                                updatePayment(payment.id, {
                                  receivedAmount: event.target.value,
                                })
                              }
                            />
                          </div>
                        </label>
                      )}
                      {payment.method === "credit" && (
                        <label className="payment-amount-field">
                          <span>Taxa maquininha</span>
                          <div>
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Taxa da maquininha do pagamento ${index + 1}`}
                              placeholder="0,00"
                              value={payment.feeRate}
                              onChange={(event) =>
                                updatePayment(payment.id, {
                                  feeRate: event.target.value,
                                })
                              }
                            />
                            <span>%</span>
                          </div>
                          <small>Informativa, sem acréscimo ao cliente.</small>
                        </label>
                      )}
                    </div>
                    {payment.method === "cash" && (
                      <div className="cash-change-box">
                        <label className="cash-change-toggle">
                          <input
                            type="checkbox"
                            checked={payment.wantsChange}
                            onChange={(event) =>
                              updatePayment(payment.id, {
                                wantsChange: event.target.checked,
                                receivedAmount: "",
                              })
                            }
                          />
                          <span>O cliente precisa de troco?</span>
                        </label>
                        {payment.wantsChange && (
                          <div
                            className={`cash-change-result ${receivedCents > 0 && receivedCents < amountCents ? "has-error" : ""}`}
                          >
                            <span>Troco</span>
                            <strong>{formatCurrency(changeCents / 100)}</strong>
                            {receivedCents > 0 &&
                              receivedCents < amountCents && (
                                <small>
                                  O valor recebido é menor que esta parte.
                                </small>
                              )}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            </>)}
          </div>

          <aside className="payment-summary">
            <span>RESUMO</span>
            <h3>Total da conta</h3>
            <strong className="payment-summary-total">
              {formatCurrency(totalCents / 100)}
            </strong>

            <div className="payment-summary-breakdown">
              {accountOrders.length > 1 && accountOrders.map((order) => (
                <div key={order.id} className="payment-summary-order"><span>Pedido #{order.id}</span><strong>{formatCurrency(order.total)}</strong></div>
              ))}
              <div><span>Consumo</span><strong>{formatCurrency(subtotalCents / 100)}</strong></div>
              {serviceFeeRate > 0 && <div><span>Taxa de serviço ({serviceFeeRate.toLocaleString("pt-BR")}%)</span><strong>{formatCurrency(serviceInCents / 100)}</strong></div>}
            </div>
            {serviceFeeRate > 0 && <label className="cash-change-toggle">
              <input type="checkbox" checked={serviceFeeWaived} onChange={(event) => {
                const waived = event.target.checked;
                const nextTotal = calculateBill(subtotalCents, serviceFeeRate, waived).totalInCents;
                setServiceFeeWaived(waived);
                // Só ajusta automaticamente quando há um pagamento que cobre o total atual.
                setPayments((current) => current.length === 1 && parseAmount(current[0].amount) === totalCents
                  ? [{ ...current[0], amount: toInputAmount(nextTotal) }]
                  : current);
              }} />
              <span>Cliente optou por não pagar a taxa de serviço</span>
            </label>}
            <div className="payment-summary-breakdown">
              {payments.map((payment) => (
                <div key={payment.id}>
                  <span>{paymentMethodLabels[payment.method]}</span>
                  <strong>
                    {formatCurrency(parseAmount(payment.amount) / 100)}
                  </strong>
                  {payment.method === "cash" && (
                    <small>
                      {payment.wantsChange
                        ? `Troco: ${formatCurrency(Math.max(0, parseAmount(payment.receivedAmount) - parseAmount(payment.amount)) / 100)}`
                        : "Não precisa de troco"}
                    </small>
                  )}
                  {payment.method === "credit" &&
                    parseRate(payment.feeRate) > 0 && (
                      <small>
                        Taxa informativa:{" "}
                        {formatCurrency(
                          Math.round(
                            (parseAmount(payment.amount) *
                              parseRate(payment.feeRate)) /
                              100,
                          ) / 100,
                        )}
                      </small>
                    )}
                </div>
              ))}
            </div>

            <div
              className={`payment-balance ${
                remainingCents === 0
                  ? "is-complete"
                  : remainingCents < 0
                    ? "has-error"
                    : ""
              }`}
              role="status"
              aria-live="polite"
            >
              <div>
                {remainingCents === 0 && <CheckCircle2 aria-hidden="true" />}
                <span>
                  {remainingCents < 0 ? "Valor excedente" : "Restante"}
                </span>
              </div>
              <strong>{formatCurrency(Math.abs(remainingCents) / 100)}</strong>
            </div>

            <p className="payment-summary-help">
              {remainingCents === 0
                ? "Pagamento completo. O pedido já pode ser fechado."
                : remainingCents > 0
                  ? "Distribua o valor restante entre as formas escolhidas."
                  : "Reduza um dos valores para igualar ao total do pedido."}
            </p>
          </aside>
        </div>

        <footer className="payment-modal-footer">
          <Button variant="secondary" onClick={requestClose}>
            Voltar
          </Button>
          <Button disabled={!canComplete} onClick={finishOrder}>
            <Check aria-hidden="true" />
            Confirmar e fechar
          </Button>
        </footer>
      </section>
    </div>
  );
}
