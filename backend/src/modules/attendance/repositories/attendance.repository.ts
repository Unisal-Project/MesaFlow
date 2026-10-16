import type { AttendanceEntity } from "../entity/attendance.entity.js";
import type { AttendanceTotal } from "../../../generated/prisma/client.js";
import type { AttendanceStatus } from "../../../generated/prisma/client.js";
import type { AttendanceListItem } from "../types/ttendance-list-item.type.js";

export interface AttendanceRepository{
    findById(id: bigint): Promise<AttendanceEntity | null>;

    findOpenByTableId(tableId: bigint): Promise<AttendanceEntity | null>;

    create(tableId: bigint): Promise<AttendanceEntity>;

    findTotalByAttendanceId(attendanceId: bigint): Promise<AttendanceTotal | null>;

    requestClosing(attendanceId: bigint, requestedAt: Date): Promise<AttendanceEntity>;

    requestCancelled(attendanceId: bigint): Promise<AttendanceEntity>;

    findAllByStatus(status: AttendanceStatus): Promise<AttendanceListItem[]>;
}