import type { AttendanceStatus } from "../../attendance/entity/attendance.entity.js";
import type { TableStatus } from "../enity/table-status.js";

export function resolveTableStatus(
  attendance: { status: AttendanceStatus } | null,
): TableStatus {
  if (!attendance) {
    return "available";
  }

  switch (attendance.status) {
    case "OPEN":
      return "occupied";

    case "CLOSING_REQUESTED":
      return "closing_requested";

    case "AWAITING_PAYMENT":
      return "awaiting_payment";

    case "CLOSED":

    case "CANCELLED":
      return "available";
  }
}
