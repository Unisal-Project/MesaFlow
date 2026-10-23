import type { Order } from "../../Order/types/order.types";
import { formatPrice } from "@/utils/formatPrice";
import { Pencil, QrCode, ReceiptText } from "lucide-react";

import { Button } from "@/components";

import { MockTableQr } from "./MockTableQr";

import { statusInfo, nextStatus } from "../constants/table.constants";

import type { RestaurantTable } from "../types/table.types";

type TableDetailsModalProps = {
  table: RestaurantTable;
  activeOrder?: Order;
  onViewOrder: (orderId: number) => void;
  selectedDetail: "qr" | null;
  setSelectedDetail: (detail: "qr" | null) => void;
  error: string;
  busy: boolean;
  onClose: () => void;
  onEdit: (table: RestaurantTable) => void;
  onAdvanceStatus: () => Promise<void>;
};

export function TableDetailsModal({
  table,
  activeOrder,
  onViewOrder,
  selectedDetail,
  setSelectedDetail,
  error,
  busy,
  onClose,
  onEdit,
  onAdvanceStatus,
}: TableDetailsModalProps) {
  return (
    <div
      className="table-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="table-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-details-title"
      >
        <header className="table-modal-heading">
          <div>
            <span className={`table-status ${table.status}`}>
              {statusInfo[table.status].label}
            </span>

            <h2 id="table-details-title">{table.name}</h2>

            <p>{statusInfo[table.status].description}</p>
          </div>

          <button
            type="button"
            className="table-modal-close"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="table-modal-body">
          {error && selectedDetail !== "qr" && <p role="alert">{error}</p>}

          {/* Visualização principal */}
          {selectedDetail === null && (
            <div className="table-options">
              <Button
                type="button"
                disabled={
                  busy || (!table.active && table.status === "available")
                }
                onClick={() => {
                  if (table.status === "awaiting_payment" && activeOrder) {
                    onViewOrder(activeOrder.id);
                    return;
                  }
                  void onAdvanceStatus();
                }}
              >
                {busy
                  ? "Atualizando…"
                  : table.status === "awaiting_payment" && activeOrder
                    ? "Ver pedido e receber pagamento"
                    : nextStatus[table.status].label}
              </Button>

              {activeOrder && (
                <section
                  className="table-linked-order"
                  aria-labelledby="table-linked-order-title"
                >
                  <h3 id="table-linked-order-title">
                    Pedido #{activeOrder.id}
                  </h3>
                  <ul>
                    {activeOrder.items.map((item, index) => (
                      <li key={`${item.name}-${index}`}>
                        <span>
                          {item.quantity} × {item.name}
                        </span>
                        <strong>
                          {formatPrice(item.quantity * item.unitPrice)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  <p>
                    <span>Total do pedido</span>
                    <strong>
                      {formatPrice(
                        activeOrder.items.reduce(
                          (total, item) =>
                            total + item.quantity * item.unitPrice,
                          0,
                        ),
                      )}
                    </strong>
                  </p>
                </section>
              )}
              <p>O que você deseja consultar?</p>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedDetail("qr")}
              >
                <QrCode aria-hidden="true" />
                Gerar QR Code
              </Button>

              {activeOrder !== undefined ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onViewOrder(activeOrder.id)}
                >
                  <ReceiptText aria-hidden="true" />
                  Ver pedido
                </Button>
              ) : (
                <span className="table-no-order">
                  Nenhum pedido ativo para esta mesa.
                </span>
              )}
            </div>
          )}

          {/* Visualização do QR Code */}
          {selectedDetail === "qr" && (
            <MockTableQr key={table.id} table={table} />
          )}
        </div>

        <footer className="table-detail-actions">
          {selectedDetail ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedDetail(null)}
            >
              Voltar
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onClose}>
              Voltar às mesas
            </Button>
          )}

          <Button type="button" disabled={busy} onClick={() => onEdit(table)}>
            <Pencil aria-hidden="true" />
            Editar mesa
          </Button>
        </footer>
      </section>
    </div>
  );
}
