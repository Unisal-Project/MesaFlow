import { useContentTransition } from "@/hooks/useContentTransition";
import { useImperativeHandle, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  List,
  Pencil,
  Plus,
  Search,
} from "lucide-react";

import { Button, ConfirmationDialog, Tabs } from "@/components";
import { getSession } from "@/services/auth.service";
import { accountPaidTotal } from "./hooks/useOrder";
import { AdminSidebar } from "@/components";

import { PaymentModal } from "./components/PaymentModal.js";
import { OrderEditPanel } from "./components/OrderEditPanel.js";
import { Notifications } from "@/components";

import { paymentMethodLabels, orderPeriods, emptyPeriodMessages } from "./constants/order.constants.js";

import {
  formatCurrency,
  getItemCount,
  getOrderTotal,
  orderNumber,
  currentBusinessDate,
} from "./utils/order.utils";

import type { OrdersProps, OrderSort, OrderFilter, OrderPeriod } from "./types/order.types.js";

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
    completeOrder,
    cancelOrder,
    reopenAccount,
    createOrder,
    selectOrder,
    filteredOrders,
    isCreatingOrder,
    activityMessage,
    searchQuery,
    setSearchQuery,
    orders,
    todayOrders,
    todayDate,
    minimumDate,
    period,
    setPeriod,
    specificDate,
    setSpecificDate,
    activeFilter,
    setActiveFilter,
    sortOrder,
    setSortOrder,
    setIsCreatingOrder,
    selectedOrderId,
    setPaymentOrderId,
    selectedOrder,
    setEditingOrderId,
  } = state;

  const isAdmin = getSession()?.user.role === "ADMIN";
  // Confirmação de "Excluir pedido" / "Reabrir conta" do pedido aberto no painel.
  const [confirm, setConfirm] = useState<{
    kind: "delete" | "reopen";
    orderId: number;
  } | null>(null);
  const [restoreStock, setRestoreStock] = useState(true);
  const [deleteReason, setDeleteReason] = useState("");

  const businessToday = currentBusinessDate();

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
        onChange={(id) => onNavigate?.(id)}
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

            <Notifications />
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
              <p>
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1
                  ? "pedido encontrado"
                  : "pedidos encontrados"}
              </p>
            </div>
            <div className="orders-list-controls">
              <label className="orders-sort-control">
                <span>Status</span>
                <select aria-label="Filtrar por status" value={activeFilter}
                  onChange={(event) => setActiveFilter(event.target.value as OrderFilter)}>
                  <option value="all">Todos</option>
                  <option value="open">Em aberto</option>
                  <option value="closed">Fechados</option>
                </select>
              </label>
              <label className="orders-sort-control">
                <span>Ordenar por</span>
                <select
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(event.target.value as OrderSort)
                  }
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

          <div className="orders-period-controls">
            <Tabs items={orderPeriods.map((item) => item.id === "specific"
              ? { ...item, label: <span className="orders-period-date-label"><CalendarDays size={16} aria-hidden="true" /><span>{item.label}</span></span> }
              : item)} activeId={period}
              onChange={(value) => setPeriod(value as OrderPeriod)} ariaLabel="Período dos pedidos" />
            {period === "specific" && (
              <label className="orders-sort-control">
                <span>Data do pedido</span>
                <input type="date" min={minimumDate} max={todayDate} value={specificDate}
                  onChange={(event) => setSpecificDate(event.target.value)} />
              </label>
            )}
          </div>

          <p
            className="order-activity-message"
            role="status"
            aria-live="polite"
          >
            {activityMessage}
          </p>
          {state.error && !editingOrder && !state.isCreatingOrder && (
            <p className="order-edit-error" role="alert">
              {state.error}
            </p>
          )}
          <p role="status" hidden={!state.loading}>
            Carregando pedidos...
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
                          <h3>Pedido {orderNumber(order, businessToday)}</h3>
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

                {/* Carregando já tem aviso próprio; separa vazio real de filtro. */}
                {!state.loading && filteredOrders.length === 0 && (
                  <div className="orders-empty-state">
                    {orders.length === 0 ? (
                      <>
                        <h3>{emptyPeriodMessages[period]}</h3>
                        <Button onClick={() => setIsCreatingOrder(true)}>
                          <Plus aria-hidden="true" />
                          Lançar primeiro pedido
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3>{emptyPeriodMessages[period]}</h3>
                        <Button variant="secondary" onClick={() => openOrder()}>
                          Limpar filtros
                        </Button>
                      </>
                    )}
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
                      <h2>Pedido {orderNumber(selectedOrder, businessToday)}</h2>
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
                              <span>
                                Taxa de serviço
                              </span>
                              <strong>
                                {formatCurrency(
                                  selectedOrder.payment.serviceFee ?? 0,
                                )}
                              </strong>
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
                      {/* Conta paga: só o ADMIN reabre (estorna os pagamentos). */}
                      {selectedOrder.status !== "closed" && (
                        <Button
                          onClick={() => setPaymentOrderId(selectedOrder.id)}
                        >
                          Finalizar pedido
                        </Button>
                      )}
                      {isAdmin && selectedOrder.status === "closed" && (
                        <Button
                          variant="secondary"
                          disabled={state.busy}
                          onClick={() =>
                            setConfirm({ kind: "reopen", orderId: selectedOrder.id })
                          }
                        >
                          Reabrir conta
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="secondary"
                          disabled={state.busy || selectedOrder.status === "closed"}
                          title={
                            selectedOrder.status === "closed"
                              ? "Reabra a conta para excluir este pedido"
                              : undefined
                          }
                          onClick={() => {
                            setRestoreStock(true);
                            setConfirm({ kind: "delete", orderId: selectedOrder.id });
                          }}
                        >
                          Excluir pedido
                        </Button>
                      )}
                    </div>
                    <ConfirmationDialog
                      open={confirm?.orderId === selectedOrder.id}
                      variant="danger"
                      title={
                        confirm?.kind === "reopen"
                          ? `Reabrir a conta de ${selectedOrder.table}?`
                          : `Excluir o pedido ${orderNumber(selectedOrder)}?`
                      }
                      description={
                        confirm?.kind === "reopen"
                          ? `⚠️ Atenção: os pagamentos registrados nesta conta (${formatCurrency(accountPaidTotal(orders, selectedOrder))}) serão desfeitos e a mesa volta a ficar ocupada. Você precisará registrar o pagamento de novo ao fechar.`
                          : "⚠️ Atenção: este pedido será cancelado e sairá da lista e da conta da mesa. Esta ação não pode ser desfeita."
                      }
                      confirmLabel={
                        confirm?.kind === "reopen" ? "Reabrir conta" : "Excluir pedido"
                      }
                      onCancel={() => {
                        setConfirm(null);
                        setDeleteReason("");
                      }}
                      onConfirm={() => {
                        setConfirm(null);
                        void (confirm?.kind === "reopen"
                          ? reopenAccount()
                          : cancelOrder(restoreStock, deleteReason));
                        setDeleteReason("");
                      }}
                    >
                      {confirm?.kind === "delete" && (
                        <>
                          <label className="field">
                            <span>Motivo (opcional)</span>
                            <input
                              type="text"
                              maxLength={500}
                              value={deleteReason}
                              placeholder="Excluído pelo administrador"
                              onChange={(event) => setDeleteReason(event.target.value)}
                            />
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={restoreStock}
                              onChange={(event) => setRestoreStock(event.target.checked)}
                            />
                            Devolver itens ao estoque
                          </label>
                        </>
                      )}
                    </ConfirmationDialog>
                  </>
                </>
              ) : (
                <div className="order-details-empty">
                  <h2>
                    {selectedOrderId === null
                      ? "Selecione um pedido"
                      : "Este pedido não foi encontrado"}
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
          table={paymentOrder.table}
          accountOrders={paymentOrders
            .map((order) => ({ id: order.id, dailyNumber: order.dailyNumber, businessDate: order.businessDate, total: getOrderTotal(order), time: order.time, items: order.items }))
            .sort((a, b) => a.id - b.id)}
          total={
            paymentOrders.reduce(
              (sum, order) => sum + Math.round(getOrderTotal(order) * 100),
              0,
            ) / 100
          }
          onClose={() => setPaymentOrderId(null)}
          onComplete={(payments, waived) =>
            completeOrder(paymentOrder.id, payments, waived)
          }
        />
      )}

      {editingOrder && (
        <OrderEditPanel
          key={editingOrder.id}
          orderId={editingOrder.id}
          tableId={editingOrder.tableId ?? ""}
          items={editingOrder.items}
          observation={editingOrder.observation}
          catalog={state.catalog}
          tableOptions={state.tableOptions}
          busy={state.busy}
          error={state.error}
          onCancel={() => {
            state.setError("");
            setEditingOrderId(null);
          }}
          onSave={(changes) => saveOrderChanges(editingOrder.id, changes)}
        />
      )}

      {isCreatingOrder && (
        <OrderEditPanel
          mode="create"
          tableId={state.newOrderTableId ?? ""}
          items={[]}
          catalog={state.catalog}
          tableOptions={state.tableOptions}
          busy={state.busy}
          error={state.error}
          onCancel={() => {
            state.setError("");
            setIsCreatingOrder(false);
          }}
          onSave={createOrder}
        />
      )}
    </div>
  );
}
