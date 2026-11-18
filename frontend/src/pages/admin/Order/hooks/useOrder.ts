import { useCallback, useEffect, useMemo, useState } from "react";

import {
  cancelAdminOrder,
  closeAttendance,
  createTableOrder,
  fetchAdminOrders,
  fetchOperationalOrders,
  reopenAttendance,
  updateOrderItems,
  type AdminOrderItemsInput,
  type AdminOrderResponse,
  type PaymentMethodCode,
} from "@/services/orders.service";

import { markOrderSeen } from "@/hooks/useAttendanceNotifications";
import { fetchSettings } from "@/services/settings.service";
import { businessToday, setDayCutoff, toBusinessDate } from "@/utils/businessDay";

import type { RestaurantTable } from "../../Table/types/table.types";
import type { AdminProduct } from "../../Products/types/product.types";

import {
  getAccountOrders,
  orderNumber,
  toDateKey,
  dateDaysAgo,
  filterOrdersByDate,
  filterOrders,
  sortOrders,
} from "../utils/order.utils";

import type {
  Order,
  OrderFilter,
  OrderPeriod,
  OrderSort,
  CompletedPayment,
  OrderCatalogProduct,
  OrderFormChanges,
  OrderTableOption,
  PaymentMethod,
} from "../types/order.types";

const toCode: Record<PaymentMethod, PaymentMethodCode> = {
  pix: "PIX",
  cash: "CASH",
  debit: "DEBIT_CARD",
  credit: "CREDIT_CARD",
};
const fromCode: Record<PaymentMethodCode, PaymentMethod> = {
  PIX: "pix",
  CASH: "cash",
  DEBIT_CARD: "debit",
  CREDIT_CARD: "credit",
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível acessar o servidor";

const tableLabel = (table: AdminOrderResponse["table"]) =>
  table.name ?? `Mesa ${String(table.number).padStart(2, "0")}`;

// Observações por unidade viram itens separados; aqui elas voltam a se agrupar.
export function toOrderItems(items: AdminOrderResponse["items"]) {
  const grouped = new Map<string, Order["items"][number]>();
  for (const item of items) {
    const key = `${item.productId}:${item.unitPrice}`;
    const current = grouped.get(key);
    const notes = Array.from({ length: item.quantity }, () => item.notes ?? "");
    if (current) {
      current.quantity += item.quantity;
      current.unitObservations!.push(...notes);
    } else {
      grouped.set(key, {
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        unitObservations: notes,
      });
    }
  }
  return [...grouped.values()].map((item) => {
    const notes = item.unitObservations!;
    // Mesma observação em todas as unidades é exibida como observação do item.
    return notes.every((note) => note === notes[0])
      ? { ...item, observation: notes[0] || undefined }
      : item;
  });
}

/** Uma linha por produto + observação, que é o que o backend guarda. */
export function toItemsInput(items: Order["items"]) {
  const lines = new Map<string, { productId: string; quantity: number; notes?: string }>();
  for (const item of items) {
    if (!item.productId) continue;
    const notes = Array.from(
      { length: item.quantity },
      (_, unit) => item.unitObservations?.[unit] ?? item.observation ?? "",
    );
    for (const note of notes) {
      const key = `${item.productId}\u0000${note}`;
      const line = lines.get(key);
      if (line) line.quantity += 1;
      else
        lines.set(key, {
          productId: item.productId,
          quantity: 1,
          ...(note ? { notes: note } : {}),
        });
    }
  }
  return [...lines.values()];
}

export function toOrder(
  response: AdminOrderResponse,
  firstOfAttendance: boolean,
  attendanceOrderIds: number[],
): Order {
  const created = new Date(response.createdAt);
  const { attendance } = response;
  const closed = attendance.status === "CLOSED";
  return {
    id: Number(response.id),
    dailyNumber: response.dailyNumber,
    businessDate: response.businessDate,
    table: tableLabel(response.table),
    tableId: response.table.id,
    attendanceId: attendance.id,
    status: closed ? "closed" : "open",
    // Dia de operação do pedido (o mesmo do número #N); sem ele, a data local.
    date: response.businessDate ?? toDateKey(created),
    time: created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    createdAt: response.createdAt,
    items: toOrderItems(response.items),
    observation: response.notes ?? undefined,
    payment: closed
      ? {
          // Os pagamentos pertencem à conta; aparecem no primeiro pedido dela.
          entries: firstOfAttendance
            ? attendance.payments.map((payment) => ({
                method: fromCode[payment.method ?? "CASH"],
                amount: Number(payment.amount),
                ...(payment.receivedAmount
                  ? {
                      receivedAmount: Number(payment.receivedAmount),
                      change: Number(payment.changeAmount ?? 0),
                    }
                  : {}),
                ...(payment.processingFee
                  ? { processingFee: Number(payment.processingFee) }
                  : {}),
              }))
            : [],
          closedAt: attendance.closedAt
            ? new Date(attendance.closedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          closedOn: attendance.closedAt
            ? toBusinessDate(new Date(attendance.closedAt))
            : undefined,
          serviceFee: firstOfAttendance ? Number(attendance.serviceFee ?? 0) : 0,
          orderIds: attendanceOrderIds,
        }
      : undefined,
  };
}

export function toOrders(responses: AdminOrderResponse[]): Order[] {
  // Pedidos cancelados ficam no histórico do banco, fora da lista operacional.
  const active = responses.filter((order) => order.status !== "CANCELLED" && order.attendance.status !== "CANCELLED");
  const byAttendance = new Map<string, number[]>();
  for (const order of active) {
    const ids = byAttendance.get(order.attendance.id) ?? [];
    ids.push(Number(order.id));
    byAttendance.set(order.attendance.id, ids);
  }
  return active.map((order) => {
    const ids = byAttendance.get(order.attendance.id)!;
    return toOrder(order, Math.min(...ids) === Number(order.id), ids);
  });
}

/** Mantém a seleção se o pedido ainda existe; senão cai para o primeiro (ou null). */
export function pickSelectedOrderId(current: number | null, list: Order[]) {
  return current !== null && list.some((order) => order.id === current)
    ? current
    : (list[0]?.id ?? null);
}

export const POLL_INTERVAL_MS = 15_000;

const daysBetween = (later: string, earlier: string) =>
  Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000);

/**
 * Quantos dias de pedidos o período escolhido precisa; null = só a lista
 * operacional (Hoje e Ontem), que é o que o polling de 15 s baixa. Períodos
 * maiores buscam só o intervalo pedido, e não mais 90 dias a cada 15 s.
 */
export function historyDays(period: OrderPeriod, specificDate: string, todayDate: string) {
  if (period === "today" || period === "yesterday") return null;
  if (period === "7days") return 8;
  if (period === "30days") return 31;
  if (period === "specific") return Math.min(366, Math.max(2, daysBetween(todayDate, specificDate) + 2));
  return 90;
}
export const DELETE_ORDER_REASON = "Excluído pelo administrador";

/** Soma dos pagamentos da conta (eles ficam só no primeiro pedido dela). */
export const accountPaidTotal = (orders: Order[], order: Order) =>
  orders
    .filter((item) => item.attendanceId === order.attendanceId)
    .reduce(
    (sum, item) =>
      sum +
      (item.payment?.entries ?? []).reduce((acc, entry) => acc + entry.amount, 0),
    0,
  );

/**
 * Chama `load` agora e a cada `intervalMs`, sem sobrepor requisições.
 * Retorna a função de limpeza (para o unmount).
 */
export function startPolling(
  load: () => Promise<unknown>,
  intervalMs = POLL_INTERVAL_MS,
) {
  let running = false;
  let stopped = false;
  const tick = () => {
    if (running || stopped) return;
    running = true;
    load()
      .catch(() => undefined)
      .finally(() => {
        running = false;
      });
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

export function useOrder(
  tables: RestaurantTable[] = [],
  products: AdminProduct[] = [],
  onAttendanceChange?: () => void,
) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, updateSearchQuery] = useState("");
  const [focusedOrderId, setFocusedOrderId] = useState<number | null>(null);
  const setSearchQuery = (query: string) => {
    setFocusedOrderId(null);
    updateSearchQuery(query);
  };
  // Dia de operação atual (virada de Configurações). Recalculado no render: o
  // polling já atualiza a tela na virada.
  const todayDate = businessToday();
  const minimumDate = dateDaysAgo(89); // Hoje + 89 anteriores = 90 datas carregadas.
  const [period, updatePeriod] = useState<OrderPeriod>("today");
  const [specificDate, updateSpecificDate] = useState(todayDate);
  const setPeriod = (value: OrderPeriod) => {
    setFocusedOrderId(null);
    updatePeriod(value);
  };
  const setSpecificDate = (value: string) => {
    if (value >= minimumDate && value <= todayDate) {
      setFocusedOrderId(null);
      updateSpecificDate(value);
    }
  };
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");
  const [sortOrder, setSortOrder] = useState<OrderSort>("newest");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  // null = fechado; "" = novo pedido sem mesa; id = mesa pré-selecionada.
  const [newOrderTableId, setNewOrderTableId] = useState<string | null>(null);
  const isCreatingOrder = newOrderTableId !== null;
  const setIsCreatingOrder = (open: boolean, tableId = "") =>
    setNewOrderTableId(open ? tableId : null);

  // Pedido de link/notificação fora da janela carregada: busca 90 dias uma vez.
  const [widenedFor, setWidenedFor] = useState<number | null>(null);
  // Pedido focado cuja busca ampliada (90 dias) já terminou, achado ou não.
  const [searchedFor, setSearchedFor] = useState<number | null>(null);
  const days =
    focusedOrderId !== null && widenedFor === focusedOrderId
      ? 90
      : historyDays(period, specificDate, todayDate);

  const reload = useCallback(
    () =>
      (days === null ? fetchOperationalOrders() : fetchAdminOrders(days))
        .then((responses) => {
          const list = toOrders(responses);
          setOrders(list);
          setSelectedOrderId((current) => pickSelectedOrderId(current, list));
          if (focusedOrderId !== null && days !== 90 && !list.some((order) => order.id === focusedOrderId))
            setWidenedFor(focusedOrderId);
          setError("");
        })
        .catch((err: unknown) => setError(message(err)))
        .finally(() => {
          if (days === 90 && focusedOrderId !== null) setSearchedFor(focusedOrderId);
          setLoading(false);
        }),
    [days, focusedOrderId],
  );

  // Dia de operação: lê a virada de /settings uma vez (até lá vale o padrão 05:00).
  const [, setCutoffLoaded] = useState(false);
  useEffect(() => {
    fetchSettings()
      .then((settings) => {
        setDayCutoff(settings.dayCutoffHour);
        setCutoffLoaded(true);
      })
      .catch(() => undefined);
  }, []);

  // Polling leve: pedidos novos do QR aparecem sem recarregar a página.
  useEffect(() => startPolling(reload), [reload]);

  // Toda escrita recarrega a lista: a conta inteira (e a mesa) pode ter mudado.
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      await reload();
      onAttendanceChange?.();
      setActivityMessage(success);
      setError("");
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const catalog = useMemo<OrderCatalogProduct[]>(
    () =>
      products
        .filter((product) => product.available)
        .map((product) => ({
          id: product.id,
          name: product.name,
          // Estimativa: quem cobra é o backend (preço efetivo com promoção).
          unitPrice: product.finalPriceValue,
          stock: product.trackStock ? product.quantity : null,
          category: product.category,
        })),
    [products],
  );
  const tableOptions = useMemo<OrderTableOption[]>(
    () =>
      tables
        .filter((table) => table.active)
        .map((table) => ({ id: table.id, label: table.name })),
    [tables],
  );

  // O link direto pode chegar antes do catálogo de pedidos carregar.
  const focusedOrder = orders.find((order) => order.id === focusedOrderId);
  const visiblePeriod = focusedOrder &&
    !filterOrdersByDate([focusedOrder], period, specificDate, todayDate).length
    ? "specific" : period;
  const visibleDate = focusedOrder?.date ?? specificDate;
  const filteredOrders = useMemo(
    () =>
      sortOrders(
        filterOrders(filterOrdersByDate(orders, visiblePeriod, visibleDate, todayDate), activeFilter, searchQuery),
        sortOrder,
      ),
    [activeFilter, orders, searchQuery, sortOrder, visiblePeriod, visibleDate, todayDate],
  );
  const visibleSelectedOrderId = focusedOrderId ?? pickSelectedOrderId(selectedOrderId, filteredOrders);
  const selectedOrder =
    filteredOrders.find((order) => order.id === visibleSelectedOrderId) ?? null;

  const selectOrder = (orderId: number) => {
    // Escolher outro pedido encerra o "foco" de link/notificação; sem isso a rota
    // reabria o pedido e voltava o período para Hoje, encolhendo a lista.
    setFocusedOrderId(null);
    setSelectedOrderId(orderId);
    setEditingOrderId(null);
  };

  const openOrder = (orderId?: number) => {
    updatePeriod("today");
    const target = orders.find((order) => order.id === orderId);
    if (target && !filterOrdersByDate([target], "today", "", todayDate).length) {
      updatePeriod("specific");
      updateSpecificDate(target.date);
    }
    setActiveFilter("all");
    setSortOrder("newest");
    setFocusedOrderId(orderId ?? null);
    updateSearchQuery("");
    // Não usa selectOrder: ele encerra o foco (clique do usuário), e aqui o foco é intencional.
    setSelectedOrderId(orderId ?? orders[0]?.id ?? null);
    setEditingOrderId(null);
  };

  const toInput = (changes: OrderFormChanges): AdminOrderItemsInput => ({
    items: toItemsInput(changes.items),
    notes: changes.observation?.trim() || null,
  });

  const createOrder = async (changes: OrderFormChanges) => {
    let createdId: number | null = null;
    let createdLabel = "";
    const ok = await run(async () => {
      const created = await createTableOrder(changes.tableId, toInput(changes));
      createdId = Number(created.id);
      createdLabel = orderNumber({ id: createdId, dailyNumber: created.dailyNumber });
    }, "Pedido criado com sucesso.");
    if (!ok) return;
    setIsCreatingOrder(false);
    updatePeriod("today");
    setActiveFilter("all");
    setSortOrder("newest");
    setSearchQuery("");
    if (createdId !== null) {
      setSelectedOrderId(createdId);
      setActivityMessage(`Pedido ${createdLabel} criado com sucesso.`);
    }
  };

  const saveOrderChanges = async (orderId: number, changes: OrderFormChanges) => {
    const ok = await run(
      () => updateOrderItems(String(orderId), toInput(changes)),
      `Alterações do pedido #${orderId} salvas.`,
    );
    if (ok) setEditingOrderId(null);
  };

  /** "Excluir pedido" = cancelamento (soft). Motivo opcional: vazio (ou < 3 letras,
   *  mínimo do backend) usa o padrão "Excluído pelo administrador". */
  const cancelOrder = async (restoreStock: boolean, reason = "") => {
    if (!selectedOrder) return;
    const typed = reason.trim();
    const ok = await run(
      () =>
        cancelAdminOrder(String(selectedOrder.id), {
          reason: typed.length >= 3 ? typed : DELETE_ORDER_REASON,
          restoreStock,
        }),
      `Pedido ${orderNumber(selectedOrder)} excluído.`,
    );
    if (ok) setSelectedOrderId(null);
  };

  const reopenAccount = async () => {
    if (!selectedOrder?.attendanceId || selectedOrder.status !== "closed") return;
    // Os pedidos da conta reaberta não são "novos" para o sino.
    orders
      .filter((order) => order.attendanceId === selectedOrder.attendanceId)
      .forEach((order) => markOrderSeen(String(order.id)));
    await run(
      () => reopenAttendance(selectedOrder.attendanceId!),
      `Conta de ${selectedOrder.table} reaberta.`,
    );
  };

  const completeOrder = async (
    orderId: number,
    entries: CompletedPayment[],
    serviceFeeWaived = false,
  ) => {
    const selected = orders.find((order) => order.id === orderId);
    if (!selected?.attendanceId || selected.status === "closed") return;
    const ok = await run(
      () =>
        closeAttendance(selected.attendanceId!, {
          serviceFeeWaived,
          payments: entries.map((entry) => ({
            method: toCode[entry.method],
            amount: entry.amount,
            ...(entry.receivedAmount !== undefined
              ? { receivedAmount: entry.receivedAmount }
              : {}),
            ...(entry.processingFee ? { processingFee: entry.processingFee } : {}),
          })),
        }),
      `Conta de ${selected.table} fechada com sucesso.`,
    );
    if (ok) {
      setSelectedOrderId(orderId);
      setPaymentOrderId(null);
    }
  };

  const paymentOrder =
    orders.find((order) => order.id === paymentOrderId) ?? null;
  const editingOrder =
    orders.find((order) => order.id === editingOrderId) ?? null;

  return {
    openOrder,
    paymentOrder,
    paymentOrders: paymentOrder ? getAccountOrders(orders, paymentOrder) : [],
    editingOrder,
    saveOrderChanges,
    completeOrder,
    cancelOrder,
    reopenAccount,
    createOrder,
    selectOrder,
    filteredOrders,
    isCreatingOrder,
    newOrderTableId,
    activityMessage,
    setActivityMessage,
    searchQuery,
    setSearchQuery,
    orders,
    todayOrders: orders.filter((order) => order.date === todayDate),
    todayDate,
    minimumDate,
    period: visiblePeriod,
    setPeriod,
    specificDate: visibleDate,
    setSpecificDate,
    activeFilter,
    setActiveFilter,
    sortOrder,
    setSortOrder,
    setIsCreatingOrder,
    selectedOrderId: visibleSelectedOrderId,
    setPaymentOrderId,
    selectedOrder,
    setEditingOrderId,
    catalog,
    tableOptions,
    loading,
    // O pedido do link ainda pode estar fora da janela carregada: a rota só pode
    // dar "não encontrado" depois que a busca ampliada terminar sem achá-lo.
    resolvingOrder:
      focusedOrderId !== null &&
      !orders.some((order) => order.id === focusedOrderId) &&
      searchedFor !== focusedOrderId,
    busy,
    error,
    setError,
    reload,
  };
}