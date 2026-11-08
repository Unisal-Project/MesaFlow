import type { AttendanceStatus } from "../../attendance/entity/attendance.entity.js";
import type { TableEntity } from "../enity/table.entity.js";

export interface TableAttendanceData {
  id: bigint;
  status: AttendanceStatus;
  openedAt?: Date;
  closingRequestedAt?: Date | null;
}

export interface TableWithAttendance {
  table: TableEntity;
  attendance: TableAttendanceData | null;
}
