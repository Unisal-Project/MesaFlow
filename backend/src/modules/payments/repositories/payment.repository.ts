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

export interface PaymentRepository {
  confirmFullPayment(attendanceId: bigint): Promise<ConfirmedPayment>;
  closeWithPayments(
    attendanceId: bigint,
    data: CloseAttendanceDTO,
    closedById: bigint | null,
  ): Promise<ClosedAttendance>;
}
