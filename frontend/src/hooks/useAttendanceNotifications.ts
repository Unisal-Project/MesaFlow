import { fetchAdminOrders, type AdminOrderResponse } from "@/services/orders.service";
import { fetchWaiterCalls } from "@/services/waiter-calls.service";
import { useEffect, useState } from "react";
import {
  findCancelledAttendances,
  findClosingRequestedAttendances,
  type CancelledRequestAttendance,
  type ClosingRequestedAttendance,
} from "@/services/attendance.service";
import { getSession } from "@/services/auth.service";

type AttendanceNotification = ClosingRequestedAttendance | CancelledRequestAttendance | {
  id: string; status: "WAITER_CALL" | "NEW_ORDER"; closingRequestedAt: string; table: { number: number };
};

const seenByUser = new Map<string, Set<string>>();
const memorySeen = () => {
  const key = seenKey();
  if (!seenByUser.has(key)) seenByUser.set(key, new Set());
  return seenByUser.get(key)!;
};
const seenKey = () => `mesaflow.seenOrders.${getSession()?.user.id ?? "local"}`;
export function seenOrderIds(): Set<string> {
  try { return new Set([...memorySeen(), ...JSON.parse(localStorage.getItem(seenKey()) ?? "[]")]); }
  catch { return new Set(memorySeen()); }
}
function saveSeen(ids: Iterable<string>) {
  const list = [...ids];
  list.forEach((id) => memorySeen().add(id));
  try { localStorage.setItem(seenKey(), JSON.stringify(list)); } catch { /* Navegação continua sem storage. */ }
}
// Semeado nesta sessão (vale mesmo sem localStorage e com semente vazia).
const seeded = new Set<string>();
function hasSeenStore() {
  if (seeded.has(seenKey()) || memorySeen().size) return true;
  try { return localStorage.getItem(seenKey()) !== null; } catch { return false; }
}
export function markOrderSeen(id: string) {
  const seen = seenOrderIds(); seen.add(id);
  saveSeen(seen);
}
export function newOrderNotifications(orders: AdminOrderResponse[]) {
  const open = orders.filter(order => order.status !== "CANCELLED" && order.attendance.status !== "CANCELLED" && order.attendance.status !== "CLOSED");
  // Primeira visita neste aparelho/usuário: o que já existe conta como visto,
  // para o sino não "inundar" com todos os pedidos abertos de uma vez.
  if (!hasSeenStore()) {
    // TODOS os ids atuais (inclusive de contas fechadas): se uma conta for reaberta,
    // os pedidos antigos dela não voltam como "pedido novo".
    seeded.add(seenKey());
    saveSeen(orders.map((order) => order.id));
    return [];
  }
  const seen = seenOrderIds();
  // Poda: guarda só ids ainda presentes na resposta, para o storage não crescer sem limite.
  const present = new Set(orders.map((order) => order.id));
  saveSeen([...seen].filter((id) => present.has(id)));
  return open.filter(order => !seen.has(order.id))
    .map(order => ({id: order.id, status: "NEW_ORDER" as const, closingRequestedAt: order.createdAt, table: order.table}));
}

// Lidas/limpas: só neste aparelho, por usuário (não altera nada no backend).
type NotificationRef = { id: string; status: string; closingRequestedAt?: string };
type KeyStore = "readNotifications" | "dismissedNotifications";
const memoryKeys = new Map<string, Set<string>>();
const storeKey = (store: KeyStore) => `mesaflow.${store}.${getSession()?.user.id ?? "local"}`;
// Inclui o horário: o id de conta solicitada/cancelada é o do ATENDIMENTO, que se repete
// (ex.: conta reaberta e pedida de novo) — sem o horário a nova nunca apareceria.
export const notificationKey = (item: NotificationRef) =>
  `${item.status}:${item.id}:${item.closingRequestedAt ?? ""}`;
function storedKeys(store: KeyStore) {
  const key = storeKey(store);
  const memory = memoryKeys.get(key) ?? new Set<string>();
  try { return new Set([...memory, ...JSON.parse(localStorage.getItem(key) ?? "[]")]); }
  catch { return new Set(memory); }
}
// Grava só as chaves passadas: como sempre são as notificações presentes, isso já é a poda.
function saveKeys(store: KeyStore, items: NotificationRef[]) {
  const list = items.map(notificationKey);
  memoryKeys.set(storeKey(store), new Set(list));
  try { localStorage.setItem(storeKey(store), JSON.stringify(list)); } catch { /* Segue só em memória. */ }
}
export const visibleNotifications = <T extends NotificationRef>(items: T[]) => {
  const dismissed = storedKeys("dismissedNotifications");
  return items.filter((item) => !dismissed.has(notificationKey(item)));
};
export const unreadNotifications = <T extends NotificationRef>(items: T[]) => {
  const read = storedKeys("readNotifications");
  return items.filter((item) => !read.has(notificationKey(item)));
};
/** Ao abrir o sino: tudo o que está visível vira lido. */
export const markNotificationsRead = (items: NotificationRef[]) => saveKeys("readNotifications", items);
/** "Limpar notificações": esconde as atuais; pedido novo limpo também conta como visto. */
export function dismissNotifications(items: NotificationRef[]) {
  saveKeys("dismissedNotifications", items);
  const orders = items.filter((item) => item.status === "NEW_ORDER");
  if (orders.length) saveSeen([...seenOrderIds(), ...orders.map((item) => item.id)]);
}

export function useAttendanceNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<AttendanceNotification[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;

    async function refresh() {
      try {
        const [closing, cancelled, waiterCalls, orders] = await Promise.all([
          findClosingRequestedAttendances(), getSession()?.user.role === "ADMIN" ? findCancelledAttendances() : [], fetchWaiterCalls(), fetchAdminOrders(2), // pedido novo é sempre recente: 2 dias cobre a virada da meia-noite, sem buscar 90 dias a cada 5s
        ]);
        if (!disposed) setNotifications([...newOrderNotifications(orders), ...closing, ...cancelled, ...waiterCalls.map((call) => ({ id: call.id, status: "WAITER_CALL" as const, closingRequestedAt: call.createdAt, table: call.table }))]);
      } catch (error) {
        if (!disposed) console.error("Erro ao buscar notificações:", error);
      } finally {
        // Agenda depois da resposta para evitar requisições sobrepostas.
        if (!disposed) timer = setTimeout(refresh, 5000);
      }
    }

    void refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [enabled]);

  return notifications;
}
