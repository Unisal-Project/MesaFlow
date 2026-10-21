import { AppError } from "../../../shared/errors/app-errors.js";
import type { AttendanceStatus } from "../../attendance/entity/attendance.entity.js";
import type { TableStatus, TableStatusChange } from "../enity/table-status.js";
import { resolveTableStatus } from "./resolve-table-status.js";

const nextStatus: Record<TableStatus, TableStatus> = {
  available: "occupied",
  occupied: "closing_requested",
  closing_requested: "awaiting_payment",
  awaiting_payment: "available",
};

export function resolveAttendanceTransition(
  active: boolean,
  attendance: { id: bigint; status: AttendanceStatus } | null,
  change: TableStatusChange,
): AttendanceStatus {
  const currentStatus = resolveTableStatus(attendance);

  if ((attendance?.id ?? null) !== change.attendanceId) {
    throw new AppError(
      "O atendimento da mesa mudou. Atualize a mesa e tente novamente",
      409,
    );
  }

  if (nextStatus[currentStatus] !== change.status) {
    throw new AppError("Transição de estado inválida para esta mesa", 409);
  }

  if (!attendance) {
    if (!active) {
      throw new AppError("Mesa inativa nao pode iniciar atendimento", 409);
    }

    return "OPEN";
  }

  return change.status === "closing_requested"
    ? "CLOSING_REQUESTED"
    : change.status === "awaiting_payment"
      ? "AWAITING_PAYMENT"
      : "CLOSED";
}
