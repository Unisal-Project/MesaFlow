import { useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button } from "@/components/buttons/Button";
import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import {
  filterOrders,
  filterOrdersByDate,
  getNextStatus,
  getPreviousStatus,
  type OrderFilter,
  type OrderPeriod,
  type OrderStatus,
  type OrderSummary,
} from "./orderLogic.js";
import {
  PaymentModal,
  type CompletedPayment,
} from "./PaymentModal";
import { OrderEditPanel } from "./OrderEditPanel";
import "./styles.css";

type OrderItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  observation?: string;
};

type Order = OrderSummary & {
  date: string;
  time: string;
  items: OrderItem[];
  unread?: boolean;
  payment?: {
    entries: CompletedPayment[];
    closedAt: string;
  };
};

type OrdersProps = {
  onNavigate?: (id: string) => void;
};

const paymentMethodLabels = {
  pix: "Pix",
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
} as const;

const statusDetails: Record<
  OrderStatus,
  { label: string; nextAction: string }
> = {
  waiting: { label: "Aguardando", nextAction: "Iniciar preparo" },
  preparing: { label: "Em preparo", nextAction: "Marcar como pronto" },
  ready: { label: "Pronto", nextAction: "Pedido pronto" },
  delivered: { label: "Entregue", nextAction: "Pedido entregue" },
  closed: { label: "Fechado", nextAction: "Pedido fechado" },
};

const orderFilters: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "waiting", label: "Aguardando" },
  { value: "preparing", label: "Em preparo" },
  { value: "ready", label: "Pronto" },
  { value: "delivered", label: "Entregue" },
  { value: "closed", label: "Fechado" },
];

const toDateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const dateDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateKey(date);
};

const initialOrders: Order[] = [
  {
    id: 1842,
    date: dateDaysAgo(0),
    table: "Mesa 08",
    time: "12:48",
    status: "waiting",
    unread: true,
    items: [
      { name: "X-Burger artesanal", quantity: 2, unitPrice: 28.9 },
      {
        name: "Batata rústica",
        quantity: 1,
        unitPrice: 18,
        observation: "Sem páprica",
      },
      { name: "Refrigerante lata", quantity: 2, unitPrice: 7 },
    ],
  },
  {
    id: 1841,
    date: dateDaysAgo(1),
    table: "Balcão",
    time: "12:41",
    status: "preparing",
    items: [
      { name: "Pizza margherita", quantity: 1, unitPrice: 44.9 },
      { name: "Suco de laranja", quantity: 1, unitPrice: 12 },
    ],
  },
  {
    id: 1840,
    date: dateDaysAgo(4),
    table: "Mesa 03",
    time: "12:34",
    status: "ready",
    items: [
      { name: "X-Salada", quantity: 2, unitPrice: 31.9 },
      { name: "Água com gás", quantity: 2, unitPrice: 6 },
    ],
  },
  {
    id: 1839,
    date: dateDaysAgo(12),
    table: "Mesa 11",
    time: "12:20",
    status: "delivered",
    items: [
      { name: "Pizza calabresa", quantity: 1, unitPrice: 46.9 },
      { name: "Refrigerante 1L", quantity: 1, unitPrice: 13 },
      { name: "Pudim da casa", quantity: 1, unitPrice: 14 },
    ],
  },
];

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getItemCount = (order: Order) =>
  order.items.reduce((total, item) => total + item.quantity, 0);

const getOrderTotal = (order: Order) =>
  order.items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );

const emptyOrderItems: OrderItem[] = [
  { name: "", quantity: 1, unitPrice: 0, observation: "" },
];

const getCurrentTime = () =>
  new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function Orders({ onNavigate }: OrdersProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<OrderPeriod>("today");
  const [specificDate, setSpecificDate] = useState(toDateKey(new Date()));
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(
    initialOrders[0].id,
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityMessage, setActivityMessage] = useState("");
  const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const periodOrders = useMemo(
    () =>
      filterOrdersByDate(
        orders,
        periodFilter,
        specificDate,
        toDateKey(new Date()),
      ),
    [orders, periodFilter, specificDate],
  );
  const filteredOrders = useMemo(
    () => filterOrders(periodOrders, activeFilter, searchQuery),
    [activeFilter, periodOrders, searchQuery],
  );
  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;
  const unreadOrders = orders.filter((order) => order.unread);

  const selectOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setEditingOrderId(null);
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, unread: false } : order,
      ),
    );
  };

  const updateOrderStatus = (
    orderId: number,
    direction: "next" | "previous",
  ) => {
    const currentOrder = orders.find((order) => order.id === orderId);
    if (!currentOrder) return;
    if (
      direction === "next" &&
      (currentOrder.status === "delivered" || currentOrder.status === "closed")
    )
      return;
    if (direction === "previous" && currentOrder.status === "waiting") return;
    if (currentOrder.status === "closed") return;

    const nextStatus =
      direction === "next"
        ? getNextStatus(currentOrder.status)
        : getPreviousStatus(currentOrder.status);
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order,
      ),
    );
    setSelectedOrderId(orderId);
    setActivityMessage(
      `Pedido #${orderId} atualizado para ${statusDetails[nextStatus].label}.`,
    );
  };

  const createOrder = (changes: Pick<Order, "table" | "time" | "items">) => {
    const nextId = Math.max(0, ...orders.map((order) => order.id)) + 1;
    const now = new Date();
    const newOrder: Order = {
      id: nextId,
      date: toDateKey(now),
      ...changes,
      status: "waiting",
      unread: false,
    };

    setOrders((currentOrders) => [newOrder, ...currentOrders]);
    setSelectedOrderId(nextId);
    setActiveFilter("all");
    setPeriodFilter("today");
    setSearchQuery("");
    setIsCreatingOrder(false);
    setActivityMessage(`Pedido #${nextId} criado e enviado para a cozinha.`);
  };

  const cancelOrder = () => {
    if (!selectedOrder) return;
    const confirmed = window.confirm(
      `Cancelar o pedido #${selectedOrder.id}? Esta ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    const remainingOrders = orders.filter(
      (order) => order.id !== selectedOrder.id,
    );
    setOrders(remainingOrders);
    setSelectedOrderId(remainingOrders[0]?.id ?? null);
    setActivityMessage(`Pedido #${selectedOrder.id} cancelado.`);
  };

  const completeOrder = (orderId: number, entries: CompletedPayment[]) => {
    const closedAt = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? { ...order, status: "closed", payment: { entries, closedAt } }
          : order,
      ),
    );
    setSelectedOrderId(orderId);
    setPaymentOrderId(null);
    setActivityMessage(`Pedido #${orderId} fechado com sucesso.`);
  };

  const reopenOrder = (orderId: number) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? { ...order, status: "delivered", payment: undefined }
          : order,
      ),
    );
    setSelectedOrderId(orderId);
    setEditingOrderId(null);
    setActivityMessage(`Pedido #${orderId} reaberto e marcado como entregue.`);
  };

  const saveOrderChanges = (
    orderId: number,
    changes: Pick<Order, "table" | "time" | "items">,
  ) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, ...changes } : order,
      ),
    );
    setEditingOrderId(null);
    setActivityMessage(`Alterações do pedido #${orderId} salvas.`);
  };

  const paymentOrder =
    orders.find((order) => order.id === paymentOrderId) ?? null;
  const editingOrder =
    orders.find((order) => order.id === editingOrderId) ?? null;

  return (
    <div className="orders-page">
      <AdminSidebar
        activeId="orders"
        onChange={(id) => onNavigate?.(id)}
        userName="Nome do usuário"
        userRole="Administrador"
      />

      <main className="orders-content">
        <div className="orders-topbar">
          <header className="orders-heading">
            <span>Cozinha e salão</span>
            <h1>PEDIDOS</h1>
            <p>Acompanhe cada pedido do recebimento até ficar pronto.</p>
          </header>

          <div className="orders-topbar-actions">
            <label className="order-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar pedido"
                placeholder="Buscar pedido ou mesa"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            <div className="order-notifications">
              <button
                type="button"
                className="order-notification-button"
                aria-label={`${unreadOrders.length} notificações não lidas`}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((current) => !current)}
              >
                <Bell aria-hidden="true" />
                {unreadOrders.length > 0 && (
                  <span aria-hidden="true">{unreadOrders.length}</span>
                )}
              </button>

              {notificationsOpen && (
                <section
                  className="order-notification-panel"
                  aria-label="Notificações de pedidos"
                >
                  <div>
                    <strong>Novos pedidos</strong>
                    {unreadOrders.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setOrders((currentOrders) =>
                            currentOrders.map((order) => ({
                              ...order,
                              unread: false,
                            })),
                          )
                        }
                      >
                        Marcar como lidas
                      </button>
                    )}
                  </div>
                  {unreadOrders.length > 0 ? (
                    unreadOrders.map((order) => (
                      <button
                        type="button"
                        className="order-notification-item"
                        key={order.id}
                        onClick={() => {
                          selectOrder(order.id);
                          setNotificationsOpen(false);
                        }}
                      >
                        <span>Pedido #{order.id}</span>
                        <small>
                          {order.table} · {order.time}
                        </small>
                      </button>
                    ))
                  ) : (
                    <p>Você está em dia com os novos pedidos.</p>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>

        <section className="orders-toolbar" aria-label="Filtros dos pedidos">
          <div className="orders-toolbar-filters">
            <div className="order-filter-tabs" role="group">
              {orderFilters.map((filter) => {
                const count =
                  filter.value === "all"
                    ? periodOrders.length
                    : periodOrders.filter(
                        (order) => order.status === filter.value,
                      ).length;
                return (
                  <button
                    type="button"
                    aria-pressed={activeFilter === filter.value}
                    className={activeFilter === filter.value ? "active" : ""}
                    key={filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                  >
                    {filter.label}
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>

            <label className="order-period-filter">
              <span>Período</span>
              <select
                value={periodFilter}
                onChange={(event) =>
                  setPeriodFilter(event.target.value as OrderPeriod)
                }
              >
                <option value="today">Hoje</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="all">Todos os dias</option>
                <option value="specific">Dia específico</option>
              </select>
            </label>

            {periodFilter === "specific" && (
              <label className="order-specific-date">
                <span>Escolha o dia</span>
                <input
                  type="date"
                  value={specificDate}
                  max={toDateKey(new Date())}
                  onChange={(event) => setSpecificDate(event.target.value)}
                />
              </label>
            )}
          </div>

          <Button
            className="order-create-button"
            aria-label="Criar pedido"
            title="Criar pedido"
            onClick={() => setIsCreatingOrder(true)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </section>

        <p className="order-activity-message" role="status" aria-live="polite">
          {activityMessage}
        </p>

        <div className="orders-workspace">
          <section className="orders-column" aria-labelledby="orders-list-title">
            <div className="orders-list-heading">
              <div>
                <h2 id="orders-list-title">Pedidos recentes</h2>
                <p>{filteredOrders.length} pedidos nesta visualização</p>
              </div>
            </div>

            <div className="orders-list-body">
              {filteredOrders.map((order) => {
                const isSelected = order.id === selectedOrderId;
                const canAdvance =
                  order.status !== "delivered" && order.status !== "closed";
                const canRegress =
                  order.status !== "waiting" && order.status !== "closed";
                return (
                  <article
                    className={`order-card ${isSelected ? "is-selected" : ""}`}
                    data-status={order.status}
                    key={order.id}
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => selectOrder(order.id)}
                  >
                    <div className="order-card-heading">
                      <h3>Pedido #{order.id}</h3>
                      <span
                        className="order-status-badge"
                        data-status={order.status}
                      >
                        {statusDetails[order.status].label}
                      </span>
                    </div>

                    <p className="order-card-meta">
                      <span>{order.table}</span>
                      <span>{order.time}</span>
                      <span>{getItemCount(order)} itens</span>
                    </p>

                    <strong className="order-card-total">
                      {formatCurrency(getOrderTotal(order))}
                    </strong>

                    <div className="order-card-actions">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => selectOrder(order.id)}
                      >
                        Ver detalhes
                      </Button>
                      {order.status === "closed" ? (
                        <Button
                          className="order-card-reopen"
                          variant="secondary"
                          size="small"
                          onClick={() => reopenOrder(order.id)}
                        >
                          <RotateCcw aria-hidden="true" />
                          Reabrir pedido
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            size="small"
                            disabled={!canRegress}
                            onClick={() =>
                              updateOrderStatus(order.id, "previous")
                            }
                          >
                            Regredir
                          </Button>
                          {order.status === "delivered" ? (
                            <Button
                              size="small"
                              onClick={() => setPaymentOrderId(order.id)}
                            >
                              Finalizar pedido
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              disabled={!canAdvance}
                              onClick={() =>
                                updateOrderStatus(order.id, "next")
                              }
                            >
                              Avançar status
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}

              {filteredOrders.length === 0 && (
                <div className="orders-empty-state">
                  <h3>Nenhum pedido encontrado</h3>
                  <p>Ajuste a busca ou selecione outro status.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="order-details-panel" aria-live="polite">
            {selectedOrder ? (
              <>
                <span className="order-details-label">DETALHES</span>
                <div className="order-details-heading">
                  <h2>Pedido #{selectedOrder.id}</h2>
                  <span
                    className="order-status-badge"
                    data-status={selectedOrder.status}
                  >
                    {statusDetails[selectedOrder.status].label}
                  </span>
                </div>
                <p className="order-details-meta">
                  {selectedOrder.table} · Enviado às {selectedOrder.time}
                </p>

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
                            {item.observation && (
                              <small>{item.observation}</small>
                            )}
                          </div>
                          <b>
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </b>
                        </div>
                      ))}
                    </div>

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
                            {selectedOrder.payment.entries.map(
                              (entry, index) => (
                                <div key={`${entry.method}-${index}`}>
                                  <span>
                                    {paymentMethodLabels[entry.method]}
                                  </span>
                                  <strong>{formatCurrency(entry.amount)}</strong>
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
                        <>
                          <Button
                            variant="secondary"
                            disabled={selectedOrder.status === "waiting"}
                            onClick={() =>
                              updateOrderStatus(selectedOrder.id, "previous")
                            }
                          >
                            Regredir status
                          </Button>
                          {selectedOrder.status === "delivered" ? (
                            <Button
                              onClick={() =>
                                setPaymentOrderId(selectedOrder.id)
                              }
                            >
                              Finalizar pedido
                            </Button>
                          ) : (
                            <Button
                              onClick={() =>
                                updateOrderStatus(selectedOrder.id, "next")
                              }
                            >
                              Avançar status
                            </Button>
                          )}
                        </>
                      )}
                      <Button variant="secondary" onClick={cancelOrder}>
                        Cancelar
                      </Button>
                    </div>
                </>
              </>
            ) : (
              <div className="order-details-empty">
                <h2>Selecione um pedido</h2>
                <p>Os itens e ações aparecerão aqui.</p>
              </div>
            )}
          </aside>
        </div>
      </main>

      {paymentOrder && (
        <PaymentModal
          orderId={paymentOrder.id}
          total={getOrderTotal(paymentOrder)}
          onClose={() => setPaymentOrderId(null)}
          onComplete={(payments) => completeOrder(paymentOrder.id, payments)}
        />
      )}

      {editingOrder && (
        <OrderEditPanel
          key={editingOrder.id}
          orderId={editingOrder.id}
          table={editingOrder.table}
          time={editingOrder.time}
          items={editingOrder.items}
          onCancel={() => setEditingOrderId(null)}
          onSave={(changes) => saveOrderChanges(editingOrder.id, changes)}
        />
      )}

      {isCreatingOrder && (
        <OrderEditPanel
          mode="create"
          table="Mesa 01"
          time={getCurrentTime()}
          items={emptyOrderItems}
          onCancel={() => setIsCreatingOrder(false)}
          onSave={createOrder}
        />
      )}
    </div>
  );
}
