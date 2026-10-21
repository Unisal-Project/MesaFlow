import type { AttendanceStatus } from "./attendance.entity.js";

export interface AttendanceTotal {
    attendanceId: bigint;
    tableId: bigint;
    status: AttendanceStatus;
    total: string;
}
