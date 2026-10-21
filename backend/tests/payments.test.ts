import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { errorHandler } from "../src/shared/errors/error-handler.js";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/payments_test";
process.env.JWT_SECRET ??= "payments-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";
const { PaymentService } =
  await import("../src/modules/payments/payment.service.js");
const { PaymentController } =
  await import("../src/modules/payments/payment.controller.js");
const { PrismaPaymentRepository } =
  await import("../src/modules/payments/repositories/prisma-payment.repository.js");

test("confirming a requested account records its full total and closes the attendance", async () => {
  const repository = {
    confirmFullPayment: async () => ({
      attendanceId: 12n,
      amount: "180.00",
      paidAt: new Date("2026-10-20T20:00:00Z"),
    }),
  };

  const result = await new PaymentService(repository).confirmAttendancePayment(
    12n,
  );

  assert.equal(result.attendanceId, "12");
  assert.equal(result.amount, "180.00");
  assert.equal(result.status, "PAID");
  assert.equal(result.paidAt.toISOString(), "2026-10-20T20:00:00.000Z");
});

test("payment repository settles the attendance in one transaction", async () => {
  let paymentData: any;
  const client: any = {
    $transaction: async (callback: (tx: any) => unknown) => callback(client),
    $queryRaw: async () => undefined,
    attendance: {
      findUnique: async () => ({ id: 12n, status: "CLOSING_REQUESTED" }),
      updateMany: async () => ({ count: 1 }),
    },
    attendanceTotal: {
      findUnique: async () => ({ total: { toString: () => "40.00" } }),
    },
    payment: {
      create: async ({ data }: any) => {
        paymentData = data;
        return { ...data, id: 4n };
      },
    },
  };

  const result = await new PrismaPaymentRepository(client).confirmFullPayment(
    12n,
  );

  assert.equal(result.amount, "40.00");
  assert.equal(result.attendanceId, 12n);
  assert.equal("method" in paymentData, false);
});

test("payment confirmation endpoint accepts a positive attendance id", async () => {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  const controller = new PaymentController({
    confirmAttendancePayment: async (id: bigint) => ({
      attendanceId: id.toString(),
      amount: "180.00",
      status: "PAID",
      paidAt: new Date("2026-10-20T20:00:00Z"),
    }),
  } as any);
  app.post("/attendances/:attendanceId/confirm-payment", (request, reply) =>
    controller.confirm(request, reply),
  );
  try {
    const response = await app.inject({
      method: "POST",
      url: "/attendances/12/confirm-payment",
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().amount, "180.00");
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/attendances/nope/confirm-payment",
        })
      ).statusCode,
      400,
    );
  } finally {
    await app.close();
  }
});
