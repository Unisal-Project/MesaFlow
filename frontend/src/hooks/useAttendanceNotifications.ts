import { fetchWaiterCalls } from "@/services/waiter-calls.service";
import { useEffect, useState } from "react";
import {
  findCancelledAttendances,
  findClosingRequestedAttendances,
  type CancelledRequestAttendance,
  type ClosingRequestedAttendance,
} from "@/services/attendance.service";

type AttendanceNotification = ClosingRequestedAttendance | CancelledRequestAttendance | {
  id: string; status: "WAITER_CALL"; closingRequestedAt: string; table: { number: number };
};

export function useAttendanceNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<AttendanceNotification[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;

    async function refresh() {
      try {
        const [closing, cancelled, waiterCalls] = await Promise.all([
          findClosingRequestedAttendances(), findCancelledAttendances(), fetchWaiterCalls(),
        ]);
        if (!disposed) setNotifications([...closing, ...cancelled, ...waiterCalls.map((call) => ({ id: call.id, status: "WAITER_CALL" as const, closingRequestedAt: call.createdAt, table: call.table }))]);
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
