export type AttendanceStatus =
    | "OPEN"
    | "CLOSING_REQUESTED"
    | "CLOSED"
    | "CANCELLED"
    | "AWAITING_PAYMENT";

export interface AttendanceData {
    id: bigint;
    tableId: bigint;
    status: AttendanceStatus;
    openedAt: Date;
    closingRequestedAt: Date | null;
    closedAt: Date | null;
    closedById: bigint | null;
    createdAt: Date;
    updatedAt: Date;
}

export class AttendanceEntity implements AttendanceData {
    constructor(
        public readonly id: bigint,
        public readonly tableId: bigint,
        public status: AttendanceStatus,
        public readonly openedAt: Date,
        public closingRequestedAt: Date | null,
        public closedAt: Date | null,
        public closedById: bigint | null,
        public readonly createdAt: Date,
        public updatedAt: Date
    ) {}

    isOpen(): boolean {
        return this.status === "OPEN";
    }

    canRequestClosing(): boolean {
        return this.isOpen();
    }

    canRequestCancellation(): boolean {
        return this.isOpen();
    }

    canReceiveOrders(): boolean{
        return this.isOpen()
    }
}
