
import { useCallback, useEffect, useState } from "react";

import {
  fetchOrdersByTableToken,
  type AttendanceOrder,
  type AttendanceOrdersResponse,
} from "@/services/orders.service";

type AttendanceStatus = AttendanceOrdersResponse["attendanceStatus"];

export function useBillOrders(tableToken: string) {
  const [orders, setOrders] = useState<AttendanceOrder[]>([]);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshBill = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBill() {
      setIsLoading(true);
      setError(null);
      setOrders([]);
      setAttendanceId(null);
      setAttendanceStatus(null);

      if (!tableToken) {
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
        setAttendanceStatus(response.attendanceStatus);
      } catch (reason) {
        if (controller.signal.aborted) return;

        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar a conta.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadBill();

    return () => controller.abort();
  }, [tableToken, refreshKey]);

  return {
    orders,
    attendanceId,
    attendanceStatus,
    isLoading,
    error,
    refreshBill,
  };
}
