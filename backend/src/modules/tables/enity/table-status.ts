export const tableStatuses = [
    "available",
    "occupied",
    "closing_requested",
    "awaiting_payment",
] as const;

export type TableStatus = typeof tableStatuses[number];

export interface TableStatusChange {
    status: TableStatus;
    attendanceId: bigint | null;
}
