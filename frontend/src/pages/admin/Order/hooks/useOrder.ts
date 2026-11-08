import { useCallback, useEffect, useMemo, useState } from "react";

import {
  cancelAdminOrder,
  closeAttendance,
  createTableOrder,
  fetchAdminOrders,
  updateOrderItems,
  type AdminOrderItemsInput,
  type AdminOrderResponse,
  type PaymentMethodCode,
} from "@/services/orders.service";

import type { RestaurantTable } from "../../Table/types/table.types";
import type { AdminProduct } from "../../Products/types/product.types";

import {
  getAccountOrders,
  toDateKey,
  filterOrders,
  sortOrders,
} from "../utils/order.utils";

import type {
  Order,
  OrderFilter,
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
    table: tableLabel(response.table),
    tableId: response.table.id,
    attendanceId: attendance.id,
    status: closed ? "closed" : "open",
    date: toDateKey(created),
    time: created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
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
            ? toDateKey(new Date(attendance.closedAt))
            : undefined,
          serviceFee: firstOfAttendance ? Number(attendance.serviceFee ?? 0) : 0,
          serviceFeeWaived: Number(attendance.serviceFee ?? 0) === 0,
          orderIds: attendanceOrderIds,
        }
      : undefined,
  };
}

export function toOrders(responses: AdminOrderResponse[]): Order[] {
  // Pedidos cancelados ficam no histórico do banco, fora da lista operacional.
  const active = responses.filter((order) => order.status !== "CANCELLED");
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
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");
  const [sortOrder, setSortOrder] = useState<OrderSort>("newest");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const reload = useCallback(
    () =>
      fetchAdminOrders()
        .then((responses) => {
          const list = toOrders(responses);
          setOrders(list);
          setSelectedOrderId((current) => current ?? list[0]?.id ?? null);
          setError("");
        })
        .catch((err: unknown) => setError(message(err)))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

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
          unitPrice: product.priceValue,
          stock: product.quantity,
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

  const filteredOrders = useMemo(
    () =>
      sortOrders(
        filterOrders(orders, activeFilter, searchQuery).filter(
          (order) => focusedOrderId === null || order.id === focusedOrderId,
        ),
        sortOrder,
      ),
    [activeFilter, orders, searchQuery, focusedOrderId, sortOrder],
  );
  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;

  const selectOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setEditingOrderId(null);
  };

  const openOrder = (orderId?: number) => {
    setActiveFilter("all");
    setSortOrder("newest");
    setFocusedOrderId(orderId ?? null);
    updateSearchQuery(orderId === undefined ? "" : String(orderId));
    if (orderId !== undefined) selectOrder(orderId);
    else setSelectedOrderId(orders[0]?.id ?? null);
  };

  const toInput = (changes: OrderFormChanges): AdminOrderItemsInput => ({
    items: toItemsInput(changes.items),
    notes: changes.observation?.trim() || null,
  });

  const createOrder = async (changes: OrderFormChanges) => {
    let createdId: number | null = null;
    const ok = await run(async () => {
      const created = await createTableOrder(changes.tableId, toInput(changes));
      createdId = Number(created.id);
    }, "Pedido criado com sucesso.");
    if (!ok) return;
    setIsCreatingOrder(false);
    setActiveFilter("all");
    setSortOrder("newest");
    setSearchQuery("");
    if (createdId !== null) {
      setSelectedOrderId(createdId);
      setActivityMessage(`Pedido #${createdId} criado com sucesso.`);
    }
  };

  const saveOrderChanges = async (orderId: number, changes: OrderFormChanges) => {
    const ok = await run(
      () => updateOrderItems(String(orderId), toInput(changes)),
      `Alterações do pedido #${orderId} salvas.`,
    );
    if (ok) setEditingOrderId(null);
  };

  const cancelOrder = async () => {
    if (!selectedOrder) return;
    // Regra de negócio: o cancelamento pelo painel exige motivo.
    const reason = window
      .prompt(`Motivo do cancelamento do pedido #${selectedOrder.id}:`)
      ?.trim();
    if (!reason) return;
    if (reason.length < 3) {
      setError("Descreva o motivo com pelo menos 3 caracteres.");
      return;
    }
    const restoreStock = window.confirm(
      "Devolver os itens ao estoque?\n\nOK: sim, os itens não foram usados.\nCancelar: não, o item já foi preparado.",
    );
    const ok = await run(
      () =>
        cancelAdminOrder(String(selectedOrder.id), { reason, restoreStock }),
      `Pedido #${selectedOrder.id} cancelado.`,
    );
    if (ok) setSelectedOrderId(null);
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
    createOrder,
    selectOrder,
    filteredOrders,
    isCreatingOrder,
    activityMessage,
    searchQuery,
    setSearchQuery,
    orders,
    todayOrders: orders.filter((order) => order.date === toDateKey(new Date())),
    activeFilter,
    setActiveFilter,
    sortOrder,
    setSortOrder,
    setIsCreatingOrder,
    selectedOrderId,
    setPaymentOrderId,
    selectedOrder,
    setEditingOrderId,
    catalog,
    tableOptions,
    loading,
    busy,
    error,
    setError,
    reload,
  };
}
