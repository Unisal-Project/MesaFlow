import type { AttendanceData } from "../entity/attendance.entity.js";

export type AttendanceListItem = AttendanceData & {
  activeTableId: bigint | null;
  table: {
    id: bigint;
    number: number;
    name: string | null;
  };
};
