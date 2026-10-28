import { useContentTransition } from "@/hooks/useContentTransition";
import { useImperativeHandle, useRef } from "react";
import { flushSync } from "react-dom";
import {
  CheckCircle2,
  ClipboardList,
  List,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";

import { Button } from "@/components";
import { AdminSidebar } from "@/components";

import { PaymentModal } from "./components/PaymentModal.js";
import { OrderEditPanel } from "./components/OrderEditPanel.js";
import { Notifications } from "@/components";

import {
  paymentMethodLabels,
  emptyOrderItems,
} from "./constants/order.constants.js";

import {
  formatCurrency,
  getItemCount,
  getOrderTotal,
  getCurrentTime,
} from "./utils/order.utils";

import type { OrdersProps, OrderSort } from "./types/order.types.js";

import logoAlternativo from "@/assets/logotipo/logo_alternativo-2.png";
import { OrdersSummary } from "./components/OrdersSummary";

import "./styles.scss";

export default function Orders({
  onNavigate,
  onSelectOrder,
  ref,
  state,
}: OrdersProps) {
  const { contentRef } = useContentTransition();
  const {
    openOrder,
    paymentOrder,
    paymentOrders,
    editingOrder,
    saveOrderChanges,
    reopenOrder,
    completeOrder,
    cancelOrder,
    createOrder,
    selectOrder,
    filteredOrders,
    isCreatingOrder,
    activityMessage,
    searchQuery,
    setSearchQuery,
    orders,
    todayOrders,
    sortOrder,
    setSortOrder,
    setIsCreatingOrder,
    selectedOrderId,
    setPaymentOrderId,
    selectedOrder,
    setEditingOrderId,
  } = state;

  const detailsRef = useRef<HTMLElement>(null);
  const topbarRef = useRef<HTMLDivElement>(null);

  const viewOrderDetails = (orderId: number) => {
    // No desktop, a lista e os detalhes já ficam lado a lado.
    if (!window.matchMedia("(max-width: 1080px)").matches) {
      selectOrder(orderId);
      onSelectOrder?.(orderId);
      return;
    }

    // Atualiza o pedido antes de medir e posicionar os detalhes.
    flushSync(() => selectOrder(orderId));
    onSelectOrder?.(orderId);
    const details = detailsRef.current;
    if (!details) return;

    const headerHeight = topbarRef.current?.getBoundingClientRect().height ?? 0;
    const top =
      window.scrollY + details.getBoundingClientRect().top - headerHeight - 12;
    details.focus({ preventScroll: true });
    window.scrollTo({
      top: Math.max(0, top),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  useImperativeHandle(ref, () => ({ openOrder }));

  return (
    <div className="orders-page">
      <AdminSidebar
        activeId="orders"
        brandSubtitle="GESTÃO DO RESTAURANTE"
        navigationLabel="MENU PRINCIPAL"
        showAvatar
        brandImage={<img src={logoAlternativo} alt="" />}
        onChange={(id) => onNavigate?.(id)}
        userName="Nome do usuário"
        userRole="Administrador"
      />

      <main className="orders-content">
        <div className="orders-topbar" ref={topbarRef}>
          <div className="orders-breadcrumb" aria-label="Página atual">
            <span>Visão geral</span>
            <strong>/ &nbsp;Pedidos</strong>
          </div>

          <div className="orders-topbar-actions">
            <label className="order-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar pedido"
                placeholder="Buscar pedidos, mesas..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            <Notifications items={[]} />
          </div>
        </div>

        <div className="orders-body">
          <header className="orders-heading">
            <h1>Pedidos</h1>
            <p>Crie, edite e finalize os pedidos.</p>
          </header>

          <OrdersSummary orders={orders} todayTotal={todayOrders.length} />

          <div className="orders-list-heading">
            <div>
              <h2 id="orders-list-title">Pedidos registrados</h2>
              <p>{filteredOrders.length} {filteredOrders.length === 1 ? "pedido encontrado" : "pedidos encontrados"}</p>
            </div>
            <div className="orders-list-controls">
              <label className="orders-sort-control">
                <span>Ordenar por</span>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as OrderSort)}
                >
                  <option value="newest">Mais recentes</option>
                  <option value="oldest">Mais antigos</option>
                </select>
              </label>
              <Button
                className="order-create-button"
                onClick={() => setIsCreatingOrder(true)}
              >
                <Plus aria-hidden="true" />
                Novo pedido
              </Button>
            </div>
          </div>

          <p className="order-activity-message" role="status" aria-live="polite">
            {activityMessage}
          </p>

          <div className="orders-workspace">
            <section
              className="orders-column"
              aria-labelledby="orders-list-title"
            >
              <div className="orders-list-body" ref={contentRef}>
                {filteredOrders.map((order) => {
                  const isSelected = order.id === selectedOrderId;
                  return (
                    <article
                      className={`order-card ${isSelected ? "is-selected" : ""}`}
                      key={order.id}
                      aria-current={isSelected ? "true" : undefined}
                      role="button"
                      tabIndex={0}
                      aria-label={`Visualizar pedido #${order.id}`}
                      onClick={() => viewOrderDetails(order.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          viewOrderDetails(order.id);
                        }
                      }}
                    >
                      <div className="order-card-heading">
                        <span className="order-list-icon">
                          <List aria-hidden="true" />
                        </span>
                        <div>
                          <h3>Pedido #{order.id}</h3>
                          <p className="order-card-meta">
                            <span>{order.table}</span>
                            <span>{order.time}</span>
                            <span>{getItemCount(order)} itens</span>
                          </p>
                        </div>

                      </div>
                      <p className="order-card-description">
                        {order.items
                          .map((item) => `${item.quantity}x ${item.name}`)
                          .join(" • ")}
                      </p>
                      <strong className="order-card-total">
                        {formatCurrency(getOrderTotal(order))}
                      </strong>
                    </article>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <div className="orders-empty-state">
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Ajuste a busca para encontrar o pedido.</p>
                  </div>
                )}
              </div>
            </section>

            <aside
              className="order-details-panel"
              aria-live="polite"
              aria-label="Detalhes do pedido selecionado"
              ref={detailsRef}
              tabIndex={-1}
            >
              {selectedOrder ? (
                <>
                  <div className="order-details-heading">
                    <span className="order-list-icon">
                      <List aria-hidden="true" />
                    </span>
                    <div>
                      <h2>Pedido #{selectedOrder.id}</h2>
                      <p className="order-details-meta">
                        {selectedOrder.table} · Enviado às {selectedOrder.time}
                      </p>
                    </div>

                  </div>

                  <div className="order-details-tabs" role="group">
                    <button
                      type="button"
                      className="active"
                      aria-pressed="true"
                    >
                      <ClipboardList aria-hidden="true" />
                      Resumo
                    </button>
                    <button
                      type="button"
                      disabled={selectedOrder.status === "closed"}
                      title={
                        selectedOrder.status === "closed"
                          ? "Reabra o pedido para editar"
                          : undefined
                      }
                      onClick={() => setEditingOrderId(selectedOrder.id)}
                    >
                      <Pencil aria-hidden="true" />
                      Editar pedido
                    </button>
                  </div>

                  <>
                    <div className="order-details-items">
                      {selectedOrder.items.map((item, index) => (
                        <div
                          className="order-details-item"
                          key={`${item.name}-${index}`}
                        >
                          <span>{item.quantity}×</span>
                          <div>
                            <strong>{item.name}</strong>
                            {item.unitObservations
                              ? item.unitObservations.map(
                                  (note, unit) =>
                                    note && (
                                      <small key={unit}>
                                        Unidade {unit + 1}: {note}
                                      </small>
                                    ),
                                )
                              : item.observation && (
                                  <small>{item.observation}</small>
                                )}
                          </div>
                          <b>
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </b>
                        </div>
                      ))}
                    </div>

                    {selectedOrder.observation && (
                      <p className="order-details-observation">
                        {selectedOrder.observation}
                      </p>
                    )}
                    <div className="order-details-total">
                      <span>Total</span>
                      <strong>
                        {formatCurrency(getOrderTotal(selectedOrder))}
                      </strong>
                    </div>

                    {selectedOrder.status === "closed" &&
                      selectedOrder.payment && (
                        <section className="closed-payment-summary">
                          <div className="closed-payment-heading">
                            <CheckCircle2 aria-hidden="true" />
                            <div>
                              <strong>Pedido fechado</strong>
                              <span>
                                Pagamento registrado às{" "}
                                {selectedOrder.payment.closedAt}
                              </span>
                            </div>
                          </div>
                          <div className="closed-payment-lines">
                            <div>
                              <span>{selectedOrder.payment.serviceFeeWaived
                                ? "Cliente optou por não pagar a taxa de serviço"
                                : "Taxa de serviço (10%)"}</span>
                              <strong>{formatCurrency(selectedOrder.payment.serviceFee ?? 0)}</strong>
                            </div>
                            {selectedOrder.payment.entries.map(
                              (entry, index) => (
                                <div key={`${entry.method}-${index}`}>
                                  <span>
                                    {paymentMethodLabels[entry.method]}
                                  </span>
                                  <strong>
                                    {formatCurrency(entry.amount)}
                                  </strong>
                                  {entry.processingFee !== undefined && (
                                    <small>
                                      Taxa maquininha (informativa):{" "}
                                      {formatCurrency(entry.processingFee)}
                                    </small>
                                  )}
                                  {entry.change !== undefined &&
                                    entry.change > 0 && (
                                      <small>
                                        Troco: {formatCurrency(entry.change)}
                                      </small>
                                    )}
                                </div>
                              ),
                            )}
                          </div>
                        </section>
                      )}

                    <div className="order-details-actions">
                      {selectedOrder.status === "closed" ? (
                        <Button
                          className="order-details-reopen"
                          variant="secondary"
                          onClick={() => reopenOrder(selectedOrder.id)}
                        >
                          <RotateCcw aria-hidden="true" />
                          Reabrir pedido
                        </Button>
                      ) : (
                        <Button onClick={() => setPaymentOrderId(selectedOrder.id)}>
                          Finalizar pedido
                        </Button>
                      )}
                      <Button variant="secondary" onClick={cancelOrder}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                </>
              ) : (
                <div className="order-details-empty">
                  <h2>
                    {selectedOrderId === null
                      ? "Selecione um pedido"
                      : `Pedido #${selectedOrderId} não encontrado`}
                  </h2>
                  <p>
                    {selectedOrderId === null
                      ? "Os itens e ações aparecerão aqui."
                      : "Este pedido não está disponível na lista atual. Busque outro pedido ou volte ao Dashboard."}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {paymentOrder && (
        <PaymentModal
          key={paymentOrder.id}
          orderId={paymentOrder.id}
          total={paymentOrders.reduce((sum, order) => sum + Math.round(getOrderTotal(order) * 100), 0) / 100}
          onClose={() => setPaymentOrderId(null)}
          onComplete={(payments, waived) => completeOrder(paymentOrder.id, payments, waived)}
        />
      )}

      {editingOrder && (
        <OrderEditPanel
          key={editingOrder.id}
          orderId={editingOrder.id}
          table={editingOrder.table}
          time={editingOrder.time}
          items={editingOrder.items}
          observation={editingOrder.observation}
          onCancel={() => setEditingOrderId(null)}
          onSave={(changes) => saveOrderChanges(editingOrder.id, changes)}
        />
      )}

      {isCreatingOrder && (
        <OrderEditPanel
          mode="create"
          table=""
          time={getCurrentTime()}
          items={emptyOrderItems}
          onCancel={() => setIsCreatingOrder(false)}
          onSave={createOrder}
        />
      )}
    </div>
  );
}
