import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { test } from "node:test";

// MariaDB real (npm run test:db). Usa um dia de operação no ano 2200, só deste
// teste, para não mexer no contador de hoje; apaga só o que criou.
test(
  "número do dia: concorrência, rollback e cancelado no MariaDB",
  { skip: process.env.RUN_TABLES_DB_TESTS !== "1" },
  async () => {
    const { PrismaConnector: db } = await import("../src/database/prisma.js");
    const { nextDailyNumber } =
      await import("../src/modules/orders/daily-number.js");
    // 15:00Z = 12:00 em São Paulo: longe da virada.
    const now = new Date(Date.UTC(2200, 0, randomInt(1, 28), 15));
    const day = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
    const table = await db.restaurantTable.create({
      data: {
        number: randomInt(2_000_000_000, 4_000_000_000),
        name: "Teste número do dia",
        qrToken: randomUUID(),
      },
    });
    const attendance = await db.attendance.create({
      data: { tableId: table.id, status: "CANCELLED" },
    });
    const createOrder = () =>
      db.$transaction(async (tx) => {
        const number = await nextDailyNumber(tx, now);
        return tx.order.create({
          data: { ...number, attendanceId: attendance.id },
        });
      });
    try {
      // 20 pedidos simultâneos → 1..20, sem repetição nem buraco.
      const orders = await Promise.all(Array.from({ length: 20 }, createOrder));
      assert.deepEqual(
        orders.map((order) => order.dailyNumber).sort((a, b) => a - b),
        Array.from({ length: 20 }, (_, index) => index + 1),
      );
      assert.ok(orders.every((order) => +order.businessDate === +day));

      // Erro depois de pegar o número: rollback devolve o número.
      await assert.rejects(
        db.$transaction(async (tx) => {
          await nextDailyNumber(tx, now);
          throw new Error("falha ao criar pedido");
        }),
        /falha ao criar pedido/,
      );

      // Cancelado mantém o número; o próximo não o reaproveita.
      const cancelled = orders.find((order) => order.dailyNumber === 20)!;
      await db.order.update({
        where: { id: cancelled.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      const next = await createOrder();
      assert.equal(next.dailyNumber, 21);
      const kept = await db.order.findUniqueOrThrow({
        where: { id: cancelled.id },
      });
      assert.equal(kept.dailyNumber, 20);
    } finally {
      await db.order.deleteMany({ where: { attendanceId: attendance.id } });
      await db.orderDailyCounter.deleteMany({ where: { businessDate: day } });
      await db.attendance.delete({ where: { id: attendance.id } });
      await db.restaurantTable.delete({ where: { id: table.id } });
      await db.$disconnect();
    }
  },
);
