import { useState, useMemo } from "react";

import { statusDetails } from "../constants/order.constants";

import type { RestaurantTable } from "../../Table/types/table.types";

import { initialOrders } from "../mocks/order.mocks";

import {
  toDateKey,
  getNextStatus,
  getPreviousStatus,
  filterOrders,
  sortOrders,
} from "../utils/order.utils";

import type {
  Order,
  OrderFilter,
  OrderSort,
  CompletedPayment,
} from "../types/order.types";

export function useOrder(tables: RestaurantTable[] = []) {
  const [orders, setOrders] = useState(initialOrders);
  const [searchQuery, updateSearchQuery] = useState("");
  const [focusedOrderId, setFocusedOrderId] = useState<number | null>(null);
  const setSearchQuery = (query: string) => {
    setFocusedOrderId(null);
    updateSearchQuery(query);
  };
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");
  const [sortOrder, setSortOrder] = useState<OrderSort>("newest");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(
    initialOrders[0].id,
  );
  const [activityMessage, setActivityMessage] = useState("");
  const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

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
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, unread: false } : order,
      ),
    );
  };

  const openOrder = (orderId?: number) => {
    setActiveFilter("all");
    setSortOrder("newest");
    setFocusedOrderId(orderId ?? null);
    updateSearchQuery(orderId === undefined ? "" : String(orderId));
    if (orderId !== undefined) selectOrder(orderId);
    else setSelectedOrderId(orders[0]?.id ?? null);
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

  const getTableLink = (label: string) => {
    const number = /^Mesa\s+(\d+)$/i.exec(label)?.[1];
    const table = tables.find(
      (entry) =>
        entry.name === label ||
        (number !== undefined && entry.number === Number(number)),
    );
    return {
      tableId: table?.id,
      attendanceId: table?.attendanceId ?? undefined,
    };
  };

  const createOrder = (
    changes: Pick<Order, "table" | "time" | "items" | "observation">,
  ) => {
    const nextId = Math.max(0, ...orders.map((order) => order.id)) + 1;
    const now = new Date();
    const newOrder: Order = {
      id: nextId,
      date: toDateKey(now),
      ...changes,
      ...getTableLink(changes.table),
      status: "waiting",
      unread: false,
    };

    setOrders((currentOrders) => [newOrder, ...currentOrders]);
    setSelectedOrderId(nextId);
    setActiveFilter("all");
    setSortOrder("newest");
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
    changes: Pick<Order, "table" | "time" | "items" | "observation">,
  ) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              ...changes,
              ...(order.table !== changes.table
                ? getTableLink(changes.table)
                : {}),
            }
          : order,
      ),
    );
    setEditingOrderId(null);
    setActivityMessage(`Alterações do pedido #${orderId} salvas.`);
  };

  const paymentOrder =
    orders.find((order) => order.id === paymentOrderId) ?? null;
  const editingOrder =
    orders.find((order) => order.id === editingOrderId) ?? null;

  return {
    openOrder,
    paymentOrder,
    editingOrder,
    saveOrderChanges,
    reopenOrder,
    completeOrder,
    cancelOrder,
    createOrder,
    updateOrderStatus,
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
  };
}
