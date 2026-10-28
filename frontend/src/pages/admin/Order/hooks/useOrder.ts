import { calculateBill } from "@/utils/serviceFee";
import { useState, useMemo } from "react";


import type { RestaurantTable } from "../../Table/types/table.types";

import { initialOrders } from "../mocks/order.mocks";

import {
  getAccountOrders,
  getOrderTotal,
  toDateKey,
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
      status: "open",
      unread: false,
    };

    setOrders((currentOrders) => [newOrder, ...currentOrders]);
    setSelectedOrderId(nextId);
    setActiveFilter("all");
    setSortOrder("newest");
    setSearchQuery("");
    setIsCreatingOrder(false);
    setActivityMessage(`Pedido #${nextId} criado com sucesso.`);
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

  const completeOrder = (orderId: number, entries: CompletedPayment[], serviceFeeWaived = false) => {
    const selected = orders.find((order) => order.id === orderId);
    if (!selected || selected.status === "closed") return;
    const accountOrders = getAccountOrders(orders, selected);
    const orderIds = accountOrders.map((order) => order.id);
    const subtotal = accountOrders.reduce((sum, order) => sum + Math.round(getOrderTotal(order) * 100), 0);
    const { serviceInCents, totalInCents } = calculateBill(subtotal, serviceFeeWaived);
    if (entries.some((entry) => entry.amount <= 0) ||
        entries.reduce((sum, entry) => sum + Math.round(entry.amount * 100), 0) !== totalInCents) return;
    const closedAt = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        orderIds.includes(order.id)
          ? { ...order, status: "closed", payment: {
              entries: order.id === orderId ? entries : [], closedAt, serviceFeeWaived,
              serviceFee: order.id === orderId ? serviceInCents / 100 : 0, orderIds,
            } }
          : order,
      ),
    );
    setSelectedOrderId(orderId);
    setPaymentOrderId(null);
    setActivityMessage(`Pedido #${orderId} fechado com sucesso.`);
  };

  const reopenOrder = (orderId: number) => {
    const orderIds = orders.find((order) => order.id === orderId)?.payment?.orderIds ?? [orderId];
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        orderIds.includes(order.id)
          ? { ...order, status: "open", payment: undefined }
          : order,
      ),
    );
    setSelectedOrderId(orderId);
    setEditingOrderId(null);
    setActivityMessage(`Pedido #${orderId} reaberto.`);
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
    paymentOrders: paymentOrder ? getAccountOrders(orders, paymentOrder) : [],
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
