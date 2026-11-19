import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, before, after, beforeEach, afterEach } from "node:test";
import type { FastifyInstance } from "fastify";

import { createTestApp } from "./helpers/app.js";
import { db, disconnectDatabase, cleanupTable } from "./helpers/database.js";
import {
  createTable,
  createCategory,
  createProduct,
} from "./helpers/fixtures.js";
import { createAuthenticatedUser } from "./helpers/auth.js";

const BASE_URL = "/api/v1";

let app: FastifyInstance;
let userId: bigint;
let tableId: bigint;
let categoryId: bigint;
let productId: bigint;
let qrToken: string;
let headers: { authorization: string };

before(async () => {
  app = await createTestApp();

  const authenticated = await createAuthenticatedUser(app);

  userId = authenticated.user.id;
  headers = authenticated.headers;
});

beforeEach(async () => {
  const table = await createTable();

  tableId = table.id;
  qrToken = table.qrToken;

  const category = await createCategory();
  categoryId = category.id;

  const product = await createProduct(categoryId);
  productId = product.id;
});

afterEach(async () => {
  await cleanupTable(tableId);

  await db.product.delete({
    where: { id: productId },
  });

  await db.category.delete({
    where: { id: categoryId },
  });
});

after(async () => {
  try {
    if (userId !== undefined) {
      await db.user.delete({
        where: { id: userId },
      });
    }
  } finally {
    try {
      await app?.close();
    } finally {
      await disconnectDatabase();
    }
  }
});

function submitOrder(quantity = 2) {
  return app.inject({
    method: "POST",
    url: `${BASE_URL}/tables/by-token/${qrToken}/orders`,
    payload: {
      customerName: "Integration Test Customer",
      items: [
        {
          productId: productId.toString(),
          quantity,
        },
      ],
    },
  });
}

async function openAttendance() {
  const response = await submitOrder();

  assert.equal(response.statusCode, 201, response.body);

  return BigInt(response.json().attendanceId);
}

function requestClosing(token = qrToken) {
  return app.inject({
    method: "POST",
    url: `${BASE_URL}/tables/by-token/${token}/request-closing`,
  });
}

function countBillPrintJobs(attendanceId: bigint) {
  return db.printJob.count({
    where: {
      attendanceId,
      type: "BILL",
    },
  });
}

test("requests attendance closing through QR token", async () => {
  const attendanceId = await openAttendance();

  const response = await requestClosing();

  assert.equal(response.statusCode, 200, response.body);

  assert.deepEqual(response.json(), {
    attendanceId: attendanceId.toString(),
    status: "closing_requested",
  });

  const attendance = await db.attendance.findUniqueOrThrow({
    where: { id: attendanceId },
  });

  assert.equal(attendance.status, "CLOSING_REQUESTED");
  assert.ok(attendance.closingRequestedAt);
  assert.equal(attendance.closedAt, null);
  assert.equal(attendance.activeTableId, tableId);
});

test("creates a bill print job when closing is requested", async () => {
  const attendanceId = await openAttendance();

  assert.equal(await countBillPrintJobs(attendanceId), 0);

  const response = await requestClosing();

  assert.equal(response.statusCode, 200);

  assert.equal(await countBillPrintJobs(attendanceId), 1);
});

test("lists attendances with closing requested", async () => {
  const attendanceId = await openAttendance();

  const closing = await requestClosing();

  assert.equal(closing.statusCode, 200);

  const response = await app.inject({
    method: "GET",
    url: `${BASE_URL}/attendances/closing-requested`,
    headers,
  });

  assert.equal(response.statusCode, 200);

  const attendances = response.json();

  assert.ok(Array.isArray(attendances));

  const attendance = attendances.find(
    (item) => item.id === attendanceId.toString(),
  );

  assert.ok(attendance);
  assert.equal(attendance.status, "CLOSING_REQUESTED");
  assert.equal(attendance.table.id, tableId.toString());
});

test("rejects duplicate closing requests", async () => {
  const attendanceId = await openAttendance();

  const first = await requestClosing();
  const second = await requestClosing();

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 409);

  assert.equal(second.json().message, "A conta desta mesa já foi solicitada.");

  assert.equal(await countBillPrintJobs(attendanceId), 1);
});

test("rejects closing requests without an open attendance", async () => {
  const response = await requestClosing();

  assert.equal(response.statusCode, 409);

  assert.equal(
    response.json().message,
    "Não há atendimento aberto nesta mesa.",
  );

  assert.equal(
    await db.attendance.count({
      where: { tableId },
    }),
    0,
  );
});

test("rejects closing requests with an invalid QR token", async () => {
  const response = await requestClosing(randomUUID());

  assert.equal(response.statusCode, 404);

  assert.equal(
    response.json().message,
    "QR Code inválido ou mesa indisponível",
  );
});

test("rejects new orders after closing is requested", async () => {
  const attendanceId = await openAttendance();

  const closing = await requestClosing();

  assert.equal(closing.statusCode, 200);

  const response = await submitOrder(3);

  assert.equal(response.statusCode, 409);

  assert.equal(
    response.json().message,
    "Atendimento não está aberto para pedidos.",
  );

  const product = await db.product.findUniqueOrThrow({
    where: { id: productId },
  });

  assert.equal(product.stockQuantity, 98);

  assert.equal(
    await db.order.count({
      where: { attendanceId },
    }),
    1,
  );
});

test("requires authentication to list closing requests", async () => {
  const response = await app.inject({
    method: "GET",
    url: `${BASE_URL}/attendances/closing-requested`,
  });

  assert.equal(response.statusCode, 401);
});

test("requests attendance closing through admin endpoint", async () => {
  const attendanceId = await openAttendance();

  const response = await app.inject({
    method: "PATCH",
    url: `${BASE_URL}/attendances/${attendanceId}/request-closing`,
    headers,
  });

  assert.equal(response.statusCode, 200, response.body);

  const attendance = await db.attendance.findUniqueOrThrow({
    where: { id: attendanceId },
  });

  assert.equal(attendance.status, "CLOSING_REQUESTED");
  assert.ok(attendance.closingRequestedAt);

  assert.equal(await countBillPrintJobs(attendanceId), 1);
});

test("concurrent QR closing requests create only one bill print job", async () => {
  const attendanceId = await openAttendance();

  const responses = await Promise.all([requestClosing(), requestClosing()]);

  const statusCodes = responses
    .map((response) => response.statusCode)
    .sort((a, b) => a - b);

  assert.deepEqual(statusCodes, [200, 409]);

  assert.equal(await countBillPrintJobs(attendanceId), 1);
});

test("recovers the committed receipt with the customer sessions after table reuse", async () => {
  const order = await submitOrder();
  assert.equal(order.statusCode, 201, order.body);
  const { attendanceId, paymentSession } = order.json();

  const closing = await app.inject({
    method: "POST",
    url: `${BASE_URL}/tables/by-token/${qrToken}/request-closing`,
    payload: { attendanceId },
  });
  assert.equal(closing.statusCode, 200, closing.body);
  const closingSession = closing.json().paymentSession;

  const read = (session: string) =>
    app.inject({
      url: `${BASE_URL}/client/payment-confirmation`,
      headers: { authorization: `Bearer ${session}` },
    });
  const close = (amount: number) =>
    app.inject({
      method: "POST",
      url: `${BASE_URL}/attendances/${attendanceId}/close`,
      headers,
      payload: {
        serviceFeeWaived: true,
        payments: [{ method: "PIX", amount }],
      },
    });

  assert.equal((await read(qrToken)).statusCode, 403);
  assert.deepEqual((await read(closingSession)).json(), { status: "pending" });
  assert.equal((await close(19)).statusCode, 409);
  assert.deepEqual((await read(paymentSession)).json(), { status: "pending" });
  const paid = await close(20);
  assert.equal(paid.statusCode, 200, paid.body);

  const replacement = await submitOrder();
  assert.equal(replacement.statusCode, 201, replacement.body);
  assert.notEqual(replacement.json().attendanceId, attendanceId);
  assert.deepEqual((await read(replacement.json().paymentSession)).json(), {
    status: "pending",
  });

  const confirmed = await read(paymentSession);
  assert.equal(confirmed.statusCode, 200, confirmed.body);
  const { status, event } = confirmed.json();
  assert.equal(status, "confirmed");
  assert.equal(event.type, "attendance.payment-confirmed");
  assert.equal(event.attendanceId, attendanceId);
  assert.equal(event.receipt.totalInCents, 2000);
  assert.deepEqual((await read(closingSession)).json(), { status, event });
});
