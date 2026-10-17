import type { AttendanceStatus } from "../../../generated/prisma/enums.js";

export class AttendanceEntity{
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