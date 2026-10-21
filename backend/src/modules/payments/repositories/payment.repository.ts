export interface ConfirmedPayment {
  attendanceId: bigint;
  amount: string;
  paidAt: Date;
}

export interface PaymentRepository {
  confirmFullPayment(attendanceId: bigint): Promise<ConfirmedPayment>;
}
