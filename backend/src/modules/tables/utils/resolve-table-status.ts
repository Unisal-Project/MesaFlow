import type { AttendanceStatus } from "../../attendance/entity/attendance.entity.js";
import type { TableStatusDTO } from "../dto/table-status.dto.js";

export function resolveTableStatus(
    attendance: { status: AttendanceStatus } | null
): TableStatusDTO {

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