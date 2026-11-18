import assert from "node:assert/strict";
import { idFor } from "./helpers/session.js";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/reopen_test";
process.env.JWT_SECRET ??= "reopen-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";
const { PrismaPaymentRepository } =
  await import("../src/modules/payments/repositories/prisma-payment.repository.js");
const { requireApiAuthentication } =
  await import("../src/shared/api-access.js");
const { ReportService } =
  await import("../src/modules/reports/report.service.js");

function fakeClient(status: string, other: unknown = null) {
  const calls: any = { payments: null, attendance: null, locks: 0 };
  const client: any = {
    $transaction: async (callback: (tx: any) => unknown) => callback(client),
    $queryRaw: async () => {
      calls.locks++;
      return [{ status }];
    },
    attendance: {
      findUnique: async () => ({ tableId: 3n }),
      findFirst: async () => other,
      update: async ({ data }: any) => (calls.attendance = data),
    },
    payment: {
      updateMany: async (args: any) => {
        calls.payments = args;
        return { count: 2 };
      },
    },
  };
  return { client, calls };
}

test("reabrir estorna os pagamentos (CANCELLED) e volta a conta a OPEN", async () => {
  const { client, calls } = fakeClient("CLOSED");
  const result = await new PrismaPaymentRepository(client).reopen(12n);
  assert.deepEqual(result, { attendanceId: 12n, refundedPayments: 2 });
  assert.equal(calls.locks, 2); // mesa → atendimento
  assert.deepEqual(calls.payments, {
    where: { attendanceId: 12n, status: "PAID" },
    data: { status: "CANCELLED" },
  });
  assert.equal(calls.attendance.status, "OPEN");
  assert.equal(calls.attendance.closedAt, null);
  assert.equal(calls.attendance.closedById, null);
  assert.equal(calls.attendance.serviceFee, "0.00");
});

test("reabrir recusa conta não fechada e mesa com outra conta ativa", async () => {
  for (const status of ["OPEN", "CLOSING_REQUESTED", "CANCELLED"]) {
    const { client, calls } = fakeClient(status);
    await assert.rejects(new PrismaPaymentRepository(client).reopen(12n), {
      statusCode: 409,
    });
    assert.equal(calls.payments, null);
  }
  const { client, calls } = fakeClient("CLOSED", { id: 99n });
  await assert.rejects(new PrismaPaymentRepository(client).reopen(12n), {
    statusCode: 409,
    message: "A mesa já tem outra conta aberta.",
  });
  assert.equal(calls.payments, null);
});

test("reabrir conta é só ADMIN", async () => {
  const app = Fastify();
  await app.register(fastifyJwt, { secret: "test-secret" });
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      api.post("/attendances/:attendanceId/reopen", async () => ({ ok: true }));
    },
    { prefix: "/api/v1" },
  );
  await app.ready();
  const call = (role: "ADMIN" | "EMPLOYEE") =>
    app.inject({
      method: "POST",
      url: "/api/v1/attendances/1/reopen",
      headers: {
        authorization: `Bearer ${app.jwt.sign({ id: idFor(role), email: "a@b.c", role })}`,
      },
    });
  try {
    assert.equal((await call("EMPLOYEE")).statusCode, 403);
    assert.equal((await call("ADMIN")).statusCode, 200);
  } finally {
    await app.close();
  }
});

test("relatório só soma pagamentos PAID de contas CLOSED (estornos ficam fora)", async () => {
  let where: any;
  const client: any = {
    attendance: {
      findMany: async (args: any) => {
        where = args;
        return [];
      },
    },
    restaurantSettings: { findUnique: async () => null },
    order: { findMany: async () => [] },
    category: { count: async () => 0 },
  };
  await new ReportService(client).getReport({
    start: "2026-11-07",
    end: "2026-11-07",
    tzOffset: 180,
  });
  assert.equal(where.where.status, "CLOSED");
  assert.deepEqual(where.select.payments.where, { status: "PAID" });
});
