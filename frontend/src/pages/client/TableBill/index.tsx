
import { ClientTableHeader } from "@/components/layout/ClientTableHeader";
import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { ChevronLeft } from "lucide-react";
import { SystemMessage, Button } from "@/components";

import { useBillOrders } from "./hooks/useBillOrders";
import { useTableBill } from "./hooks/useTableBill";
import type { TableBillProps } from "./types/tableBill.types";

import "./styles.scss";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatCurrency = (cents: number) =>
  currency.format(cents / 100);

export function TableBill({
  tableToken = "",
  onBack,
  onNavigate,
}: TableBillProps) {
  const {
    orders,
    attendanceStatus,
    isLoading,
    error,
    refreshBill,
  } = useBillOrders(tableToken);

  const {
    isSubmitting,
    requestError,
    handleRequestClose,
  } = useTableBill(tableToken, refreshBill);

  const activeOrders = orders.filter(
    (order) => order.status !== "CANCELLED",
  );

  const subtotalInCents = activeOrders
    .flatMap((order) => order.items)
    .reduce(
      (total, item) =>
        total +
        Math.round(Number(item.unitPrice) * 100) * item.quantity,
      0,
    );

  const closingRequested =
    attendanceStatus === "CLOSING_REQUESTED" ||
    attendanceStatus === "AWAITING_PAYMENT";

  const canRequestClosing =
    !isLoading &&
    !error &&
    attendanceStatus === "OPEN" &&
    activeOrders.length > 0 &&
    !isSubmitting;
  
  return (
    <div className="table-bill-page">
      <ClientTableHeader
        backAction={
          <button
            type="button"
            className="table-bill-back"
            aria-label="Voltar"
            onClick={onBack}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        }
      />

      <main
        className="table-bill-main"
        aria-labelledby="table-bill-title"
      >
        <div className="table-bill-heading">
          <h1 id="table-bill-title">Conta da mesa</h1>

          {!isLoading && !error && (
            <span className="table-bill-status">
              {closingRequested ? "Conta solicitada" : "Aberta"}
            </span>
          )}
        </div>

        <section
          className="table-bill-summary"
          aria-label="Resumo da conta"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <p role="status">Carregando conta...</p>
          ) : error ? (
            <div role="alert">
              <SystemMessage variant="error">
                {error}
              </SystemMessage>

              <button type="button" onClick={refreshBill}>
                Tentar novamente
              </button>
            </div>
          ) : activeOrders.length === 0 ? (
            <p>Nenhum pedido encontrado para esta mesa.</p>
          ) : (
            <dl>
              {activeOrders.flatMap((order) =>
                order.items.map((item) => (
                  <div
                    className="table-bill-row"
                    key={`${order.id}-${item.id}`}
                  >
                    <dt>
                      {item.quantity}x {item.productName}
                    </dt>

                    <dd>
                      {formatCurrency(
                        Math.round(
                          Number(item.unitPrice) * 100,
                        ) * item.quantity,
                      )}
                    </dd>
                  </div>
                )),
              )}

              <div className="table-bill-row table-bill-total">
                <dt>Total do consumo</dt>
                <dd>{formatCurrency(subtotalInCents)}</dd>
              </div>
            </dl>
          )}
        </section>


        {!isLoading && !error && attendanceStatus === "OPEN" && (
          <Button
            type="button"
            variant="primary"
            className="table-bill-close"
            disabled={!canRequestClosing}
            onClick={handleRequestClose}
          >
            {isSubmitting ? "Solicitando..." : "Solicitar fechamento"}
          </Button>
        )}

        {requestError && (
          <div className="table-bill-feedback" role="alert">
            <SystemMessage variant="error">
              {requestError}
            </SystemMessage>
          </div>
        )}

        {closingRequested && !isLoading && !error && (
          <div className="table-bill-feedback">
            <SystemMessage variant="success">
              Conta solicitada! Aguarde o atendimento para finalizar.
            </SystemMessage>
          </div>
        )}
      </main>

      <ClientTabBar
        activeId="bill"
        onMenu={() => onNavigate?.("menu")}
        onOrder={() => onNavigate?.("order")}
        onNavigate={onNavigate}
      />
    </div>
  );
}
