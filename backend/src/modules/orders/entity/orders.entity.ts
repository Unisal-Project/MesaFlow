export type OrderStatus = "PENDING" | "CANCELLED";

export type CancellationSource = "CUSTOMER" | "EMPLOYEE" | "ADMIN";

export class OrderEntity {
  constructor(
    public readonly id: bigint,
    public readonly attendanceId: bigint,
    public status: OrderStatus,
    public notes: string | null,
    public customerName: string | null,
    public readonly createdById: bigint | null,
    public cancelledAt: Date | null,
    public cancelledById: bigint | null,
    public cancellationSource: CancellationSource | null,
    public cancellationReason: string | null,
    public restoreStock: boolean | null,
    public createdAt: Date,
    public updatedAt: Date,
    /** Número curto do pedido no dia de operação (#1, #2…). */
    public readonly dailyNumber: number,
    /** Dia de operação, "AAAA-MM-DD". */
    public readonly businessDate: string,
  ) {}

  isPending(): boolean {
    return this.status === "PENDING";
  }
}
