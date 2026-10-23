import type { Order } from "../types/order.types";

import { dateDaysAgo } from "../utils/order.utils";

export const initialOrders: Order[] = [
  {
    id: 1842,
    tableId: "mock-table-8",
    attendanceId: "mock-attendance-8",
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
    tableId: "mock-table-3",
    attendanceId: "mock-attendance-3",
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
  ...[
    { id: 1843, number: 12, status: "waiting" as const },
    { id: 1844, number: 2, status: "preparing" as const },
    { id: 1845, number: 5, status: "delivered" as const },
    { id: 1846, number: 6, status: "waiting" as const },
    { id: 1847, number: 9, status: "ready" as const },
    { id: 1848, number: 10, status: "delivered" as const },
  ].map(({ id, number, status }) => ({
    id,
    tableId: `mock-table-${number}`,
    attendanceId: `mock-attendance-${number}`,
    table: `Mesa ${String(number).padStart(2, "0")}`,
    date: dateDaysAgo(0),
    time: "12:30",
    status,
    items: [
      { name: "X-Burger artesanal", quantity: 2, unitPrice: 28.9 },
      { name: "Batata rústica", quantity: 1, unitPrice: 18 },
    ],
  })),
];
