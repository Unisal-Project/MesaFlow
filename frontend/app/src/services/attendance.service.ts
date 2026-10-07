const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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

export const findClosingRequestedAttendances= async () => {
    const response = await fetch(`${BACKEND_URL}/attendances/closing-requested`);
    if (!response.ok) {
        throw new Error("Falha ao buscar as solicitações de atendimento a serem encerradas");
    }
    const data: ClosingRequestedAttendance[] = await response.json();
    return data;
};

export const setClosingRequestedAttendances = async (attendanceId: string) => {
    const response = await fetch(`${BACKEND_URL}/attendances/${attendanceId}/request-closing`, {
        method: "PATCH",
    });
    if (!response.ok) {
        throw new Error("Falha ao solicitar o fechamento do atendimento");
    }
    const data: ClosingRequestedAttendance = await response.json();
    return data;
}

export type CancelledResquestAttendance = {
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

export const findCancelledAttendances= async () => {
    const response = await fetch(`${BACKEND_URL}/attendances/cancelled`);
    if (!response.ok) {
        throw new Error("Falha ao buscar as solicitações de atendimento canceladas");
    }
    const data: CancelledResquestAttendance[] = await response.json();
    return data;
}

export const setCancelledRequestedAttendances = async (attendanceId: string) => {
    const response = await fetch(`${BACKEND_URL}/attendances/${attendanceId}/request-cancelled`, {
        method: "PATCH",
    });
    if (!response.ok) {
        throw new Error("Falha ao cancelar a solicitação de fechamento do atendimento");
    }
    const data: CancelledResquestAttendance = await response.json();
    return data;
}