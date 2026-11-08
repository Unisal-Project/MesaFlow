import { PrismaPaymentRepository } from "./repositories/prisma-payment.repository.js";
import type { CloseAttendanceDTO } from "./dto/close-attendance.dto.js";
import type { PaymentRepository } from "./repositories/payment.repository.js";

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository = new PrismaPaymentRepository(),
  ) {}

  async closeAttendance(
    attendanceId: bigint,
    data: CloseAttendanceDTO,
    closedById: bigint | null,
  ) {
    const result = await this.paymentRepository.closeWithPayments(
      attendanceId,
      data,
      closedById,
    );
    return { ...result, attendanceId: result.attendanceId.toString() };
  }

  async confirmAttendancePayment(attendanceId: bigint) {
    const payment =
      await this.paymentRepository.confirmFullPayment(attendanceId);

    return {
      attendanceId: payment.attendanceId.toString(),
      amount: payment.amount,
      status: "PAID" as const,
      paidAt: payment.paidAt,
    };
  }
}
