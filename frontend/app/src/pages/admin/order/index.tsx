import { useMemo, useState } from "react";
import { Bell, Plus, Search } from "lucide-react";
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
};

type OrdersProps = {
  onNavigate?: (id: string) => void;
};

const statusDetails: Record<
  OrderStatus,
  { label: string; nextAction: string }
> = {
  waiting: { label: "Aguardando", nextAction: "Iniciar preparo" },
  preparing: { label: "Em preparo", nextAction: "Marcar como pronto" },
  ready: { label: "Pronto", nextAction: "Pedido pronto" },
  delivered: { label: "Entregue", nextAction: "Pedido entregue" },
};

const orderFilters: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "waiting", label: "Aguardando" },
  { value: "preparing", label: "Em preparo" },
  { value: "ready", label: "Pronto" },
  { value: "delivered", label: "Entregue" },
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
    if (direction === "next" && currentOrder.status === "delivered") return;
    if (direction === "previous" && currentOrder.status === "waiting") return;

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

  const simulateOrder = () => {
    const nextId = Math.max(...orders.map((order) => order.id)) + 1;
    const now = new Date();
    const simulatedOrder: Order = {
      id: nextId,
      date: toDateKey(now),
      table: `Mesa ${String((nextId % 12) + 1).padStart(2, "0")}`,
      time: now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "waiting",
      unread: true,
      items: [
        { name: "X-Burger artesanal", quantity: 1, unitPrice: 28.9 },
        {
          name: "Batata rústica",
          quantity: 1,
          unitPrice: 18,
          observation: "Molho à parte",
        },
        { name: "Suco de laranja", quantity: 1, unitPrice: 12 },
      ],
    };

    setOrders((currentOrders) => [simulatedOrder, ...currentOrders]);
    setSelectedOrderId(nextId);
    setActiveFilter("all");
    setSearchQuery("");
    setActivityMessage(`Pedido #${nextId} recebido na cozinha.`);
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

          <Button onClick={simulateOrder}>
            <Plus aria-hidden="true" />
            Simular pedido
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
                const canAdvance = order.status !== "delivered";
                const canRegress = order.status !== "waiting";
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
                      <Button
                        size="small"
                        disabled={!canAdvance}
                        onClick={() => updateOrderStatus(order.id, "next")}
                      >
                        Avançar status
                      </Button>
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

                <div className="order-details-items">
                  {selectedOrder.items.map((item) => (
                    <div className="order-details-item" key={item.name}>
                      <span>{item.quantity}×</span>
                      <div>
                        <strong>{item.name}</strong>
                        {item.observation && <small>{item.observation}</small>}
                      </div>
                      <b>{formatCurrency(item.quantity * item.unitPrice)}</b>
                    </div>
                  ))}
                </div>

                <div className="order-details-total">
                  <span>Total</span>
                  <strong>{formatCurrency(getOrderTotal(selectedOrder))}</strong>
                </div>

                <div className="order-details-actions">
                  <Button
                    variant="secondary"
                    disabled={selectedOrder.status === "waiting"}
                    onClick={() =>
                      updateOrderStatus(selectedOrder.id, "previous")
                    }
                  >
                    Regredir status
                  </Button>
                  <Button
                    disabled={selectedOrder.status === "delivered"}
                    onClick={() =>
                      updateOrderStatus(selectedOrder.id, "next")
                    }
                  >
                    Avançar status
                  </Button>
                  <Button variant="secondary" onClick={cancelOrder}>
                    Cancelar
                  </Button>
                </div>
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
    </div>
  );
}
