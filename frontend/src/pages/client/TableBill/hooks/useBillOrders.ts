import { useCallback, useEffect, useState } from "react";

import {
  fetchTableBill,
  type BillItem,
  type TableBillResponse,
} from "@/services/orders.service";

type AttendanceStatus = TableBillResponse["attendanceStatus"];

export function useBillOrders(tableToken: string) {
  const [items, setItems] = useState<BillItem[]>([]);
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
      setItems([]);
      setAttendanceId(null);
      setAttendanceStatus(null);

      if (!tableToken) {
        setError("Mesa não identificada. Escaneie o QR Code novamente.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetchTableBill(tableToken, controller.signal);

        if (controller.signal.aborted) return;

        setItems(response.items);
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
    items,
    attendanceId,
    attendanceStatus,
    isLoading,
    error,
    refreshBill,
  };
}
