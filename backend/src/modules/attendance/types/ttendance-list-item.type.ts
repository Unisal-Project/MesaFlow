import type { Attendance } from "../../../generated/prisma/client.js";

export type AttendanceListItem = Attendance & {
    table: {
        id: bigint;
        number: number;
        name: string | null;
    }
}