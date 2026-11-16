
import type { CloseAttendanceDTO } from "../dto/close-attendance.dto.js";

export interface ConfirmedPayment {
  attendanceId: bigint;
  amount: string;
  paidAt: Date;
}

export interface ClosedAttendance {
  attendanceId: bigint;
  subtotal: string;
  serviceFee: string;
  total: string;
  closedAt: Date;
}

export interface ReopenedAttendance {
  attendanceId: bigint;
  refundedPayments: number;
}

export interface PaymentRepository {
  confirmFullPayment(
    attendanceId: bigint,
    userId: bigint,
  ): Promise<ConfirmedPayment>;

  closeWithPayments(
    attendanceId: bigint,
    data: CloseAttendanceDTO,
    closedById: bigint,
  ): Promise<ClosedAttendance>;

  reopen(attendanceId: bigint): Promise<ReopenedAttendance>;
}
