import { useEffect, useMemo, useRef, useState } from "react";
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

import { Button } from "@/components";

type PaymentDraft = {
  id: number;
  method: PaymentMethod;
  amount: string;
  wantsChange: boolean;
  receivedAmount: string;
  feeRate: string;
};

type PaymentModalProps = {
  orderId: number;
  total: number;
  onClose: () => void;
  onComplete: (payments: CompletedPayment[]) => void;
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

const toInputAmount = (cents: number) => (cents / 100).toFixed(2);

export function PaymentModal({
  orderId,
  total,
  onClose,
  onComplete,
}: PaymentModalProps) {
  const modalRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const totalCents = Math.round(total * 100);
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
        (Number.isFinite(Number(payment.feeRate)) &&
          Number(payment.feeRate) >= 0 &&
          Number(payment.feeRate) <= 100),
    );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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
  }, [onClose]);

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
          ...(payment.method === "credit" && Number(payment.feeRate) > 0
            ? {
                processingFeeRate: Number(payment.feeRate),
                processingFee:
                  Math.round(
                    (parseAmount(payment.amount) * Number(payment.feeRate)) /
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
    );
  };

  return (
    <div
      className="payment-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
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
            <h2 id="payment-modal-title">Finalizar pedido #{orderId}</h2>
            <p>Informe como o cliente realizou o pagamento.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="payment-modal-close"
            aria-label="Fechar pagamento"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="payment-modal-body">
          <div className="payment-modal-main">
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
                            type="number"
                            min="0.01"
                            step="0.01"
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
                              type="number"
                              min={payment.amount || "0"}
                              step="0.01"
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
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
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
          </div>

          <aside className="payment-summary">
            <span>RESUMO</span>
            <h3>Total do pedido</h3>
            <strong className="payment-summary-total">
              {formatCurrency(total)}
            </strong>

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
                    Number(payment.feeRate) > 0 && (
                      <small>
                        Taxa informativa:{" "}
                        {formatCurrency(
                          Math.round(
                            (parseAmount(payment.amount) *
                              Number(payment.feeRate)) /
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
          <Button variant="secondary" onClick={onClose}>
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
