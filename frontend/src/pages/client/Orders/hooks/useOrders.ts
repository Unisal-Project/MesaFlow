
import { useCallback, useEffect, useState } from "react";

import {
  fetchOrdersByTableToken,
  type AttendanceOrder,
} from "@/services/orders.service";

export function useOrders(tableToken: string) {
  const [orders, setOrders] = useState<AttendanceOrder[]>([]);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshOrders = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setIsLoading(true);
      setError(null);

      if (!tableToken) {
        setOrders([]);
        setAttendanceId(null);
        setError("Mesa não identificada. Escaneie o QR Code novamente.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetchOrdersByTableToken(
          tableToken,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setOrders(response.orders);
        setAttendanceId(response.attendanceId);
      } catch (reason) {
        if (controller.signal.aborted) return;

        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar os pedidos.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => controller.abort();
  }, [tableToken, refreshKey]);

  return {
    orders,
    attendanceId,
    isLoading,
    error,
    refreshOrders,
  };
}
