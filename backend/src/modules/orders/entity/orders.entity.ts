export type OrderStatus =
    | "PENDING"
    | "PREPARING"
    | "READY"
    | "DELIVERED"
    | "CANCELLED";

export type CancellationSource =
    | "CUSTOMER"
    | "EMPLOYEE"
    | "ADMIN";

export class OrderEntity {
    constructor(
        public readonly id: bigint,
        public readonly attendanceId: bigint,
        public status: OrderStatus,
        public notes: string | null,
        public readonly createdById: bigint | null,
        public cancelledAt: Date | null,
        public cancelledById: bigint | null,
        public cancellationSource: CancellationSource | null,
        public cancellationReason: string | null,
        public restoreStock: boolean | null,
        public createdAt: Date,
        public updatedAt: Date
    ){}

    isPending(): boolean {
        return this.status === "PENDING";
    }
}
