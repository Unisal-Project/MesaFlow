import { useEffect, useState } from "react";
import {
  findCancelledAttendances,
  findClosingRequestedAttendances,
  type CancelledRequestAttendance,
  type ClosingRequestedAttendance,
} from "@/services/attendance.service";

type AttendanceNotification = ClosingRequestedAttendance | CancelledRequestAttendance;

export function useAttendanceNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<AttendanceNotification[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;

    async function refresh() {
      try {
        const [closing, cancelled] = await Promise.all([
          findClosingRequestedAttendances(), findCancelledAttendances(),
        ]);
        if (!disposed) setNotifications([...closing, ...cancelled]);
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
