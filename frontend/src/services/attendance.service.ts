import { authHeaders } from "./auth.service";
import { apiRequest } from "@/api/client";

export type ClosingRequestedAttendance = {
    id: string;
    tableId: string;
    status: "CLOSING_REQUESTED";
    closingRequestedAt: string;
    table: {
        id: string;
        number: number;
        name: string | null;
    };
};

export type RequestQrClosingResponse = {
  attendanceId: string;
  status: "closing_requested";
};

export type CancelledRequestAttendance = {
    id: string;
    tableId: string;
    status: "CANCELLED";
    closingRequestedAt: string;
    table: {
        id: string;
        number: number;
        name: string | null;
    };
};

export const findClosingRequestedAttendances= async () => {
    return apiRequest<ClosingRequestedAttendance[]>(`/attendances/closing-requested`, { headers: authHeaders() });
};

export const setClosingRequestedAttendances = async (attendanceId: string) => {
    return apiRequest<ClosingRequestedAttendance>(`/attendances/${attendanceId}/request-closing`, {
        method: "PATCH",
    });
}

export const findCancelledAttendances= async () => {
    return apiRequest<CancelledRequestAttendance[]>(`/attendances/cancelled`, { headers: authHeaders() });
}

export const setCancelledRequestedAttendances = async (attendanceId: string) => {
    return apiRequest<CancelledRequestAttendance>(`/attendances/${attendanceId}/request-cancelled`, {
        method: "PATCH",
    });
}

export function requestQrClosing(
  token: string,
): Promise<RequestQrClosingResponse> {
  return apiRequest<RequestQrClosingResponse>(
    `/tables/by-token/${encodeURIComponent(token)}/request-closing`,
    {
      method: "POST",
    },
  );
}
