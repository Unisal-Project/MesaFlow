import { PrismaConnector } from "../../../src/database/prisma.js";

export const db = PrismaConnector;

export async function connectDatabase() {
  const database = new URL(process.env.DATABASE_URL ?? "");

  if (
    process.env.NODE_ENV !== "test" ||
    database.protocol !== "mysql:" ||
    database.hostname !== "127.0.0.1" ||
    database.port !== "3308" ||
    database.pathname !== "/mesaflow_test"
  ) {
    throw new Error("Invalid integration test environment.");
  }

  await db.$connect();
}

export async function disconnectDatabase() {
  await db.$disconnect();
}

export async function cleanupTable(tableId: bigint) {
  await db.$transaction(async (tx) => {
    const attendances = await tx.attendance.findMany({
      where: { tableId },
      select: { id: true },
    });

    const attendanceIds = attendances.map(({ id }) => id);

    const orders = await tx.order.findMany({
      where: {
        attendanceId: { in: attendanceIds },
      },
      select: { id: true },
    });

    const orderIds = orders.map(({ id }) => id);

    await tx.printJob.deleteMany({
      where: {
        OR: [
          { attendanceId: { in: attendanceIds } },
          { orderId: { in: orderIds } },
        ],
      },
    });

    await tx.stockMovement.deleteMany({
      where: { orderId: { in: orderIds } },
    });

    await tx.payment.deleteMany({
      where: { attendanceId: { in: attendanceIds } },
    });

    await tx.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });

    await tx.order.deleteMany({
      where: { id: { in: orderIds } },
    });

    await tx.attendance.deleteMany({
      where: { tableId },
    });

    await tx.waiterCall.deleteMany({
      where: { tableId },
    });

    await tx.restaurantTable.delete({
      where: { id: tableId },
    });
  });
}
