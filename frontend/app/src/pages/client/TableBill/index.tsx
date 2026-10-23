import { ChevronLeft, ShoppingCart } from "lucide-react";
import { Button, ClientHeader, Radio, SystemMessage } from "@/components";

import { ClientTabBar } from "@/components/layout/ClientTabBar";

import { useTableBill } from "./hooks/useTableBill";

import { closingOptions } from "./constants/tableBill.constants";

import { mockTableBill } from "./mocks/tableBill.mocks";

import type {
  TableBillProps,
} from "./types/tableBill.types";

import "./styles.scss";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function TableBill({ bill = mockTableBill, onBack, onNavigate }: TableBillProps) {
  const {
    closingOption,
    setClosingOption,
    isClosed,
    totalInCents,
    handleNavigate,
    handleRequestClose,
    closureRequested,
    feedbackRef
  } = useTableBill(bill, onNavigate);

  const table = new URLSearchParams(window.location.search).get("mesa")?.trim() || "12";
  const tableLabel = /^mesa\s/i.test(table) ? table : `Mesa ${table}`;
  const requestDisabled = isClosed || closureRequested;

  return (
    <div className="table-bill-page">
      <ClientHeader
        title="MesaFlow"
        subtitle={tableLabel}
        backAction={
          <button type="button" className="table-bill-back" aria-label="Voltar" onClick={onBack}>
            <ChevronLeft aria-hidden="true" />
          </button>
        }
        cartAction={
          <button
            className="table-bill-cart"
            type="button"
            aria-label={`Carrinho, ${bill.cartItemCount} ${bill.cartItemCount === 1 ? "item" : "itens"}`}
            onClick={() => handleNavigate("order")}
          >
            <ShoppingCart aria-hidden="true" />
            <span aria-hidden="true">
              {bill.cartItemCount}
            </span>
          </button>
        }
      />

      <main className="table-bill-main" aria-labelledby="table-bill-title">
        <div className="table-bill-heading">
          <h1 id="table-bill-title">Conta da mesa</h1>
          <span className="table-bill-status">{isClosed ? "Fechada" : closureRequested ? "Conta solicitada" : "Aberta"}</span>
        </div>

        <section className="table-bill-summary" aria-label="Resumo da conta">
          <dl>
            {bill.orders.map((order) => (
              <div className="table-bill-row" key={order.id}>
                <dt>Pedido #{order.id}</dt>
                <dd>{currency.format(order.amountInCents / 100)}</dd>
              </div>
            ))}
            <div className="table-bill-row">
              <dt>Serviço</dt>
              <dd>{currency.format(bill.serviceInCents / 100)}</dd>
            </div>
            <div className="table-bill-row table-bill-total">
              <dt>Total da mesa</dt>
              <dd>{currency.format(totalInCents / 100)}</dd>
            </div>
          </dl>
        </section>

        <fieldset className="table-bill-options" aria-label="Opções para fechamento da conta" disabled={requestDisabled}>
          {closingOptions.map((option) => (
            <Radio
              key={option.id}
              className="table-bill-option"
              name="table-bill-closing-option"
              value={option.id}
              label={option.label}
              checked={closingOption === option.id}
              disabled={requestDisabled}
              onChange={() => setClosingOption(option.id)}
            />
          ))}
        </fieldset>

        <Button
          type="button"
          variant="primary"
          className="table-bill-close"
          disabled={requestDisabled}
          onClick={handleRequestClose}
        >
          {closureRequested ? "Conta solicitada" : "Solicitar fechamento"}
        </Button>

        {closureRequested && (
          <div className="table-bill-feedback" ref={feedbackRef}>
            <SystemMessage variant="success">
              Conta solicitada! Aguarde o atendimento para finalizar.
            </SystemMessage>
          </div>
        )}
      </main>

      <ClientTabBar activeId="bill" onMenu={() => handleNavigate("menu")} onOrder={() => handleNavigate("order")} onNavigate={handleNavigate} />
    </div>
  );
}
