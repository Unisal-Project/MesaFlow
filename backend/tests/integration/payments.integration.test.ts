import assert from "node:assert/strict";
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
let originalServiceFeeRate: string | undefined;

before(async () => {
  app = await createTestApp();

  const authenticated = await createAuthenticatedUser(app);

  userId = authenticated.user.id;
  headers = authenticated.headers;

  const settings = await db.restaurantSettings.findUniqueOrThrow({
    where: { id: 1 },
  });

  originalServiceFeeRate = settings.serviceFeeRate.toString();

  await db.restaurantSettings.update({
    where: { id: 1 },
    data: { serviceFeeRate: 10 },
  });
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
    if (originalServiceFeeRate !== undefined) {
      await db.restaurantSettings.update({
        where: { id: 1 },
        data: { serviceFeeRate: originalServiceFeeRate },
      });
    }

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

type PaymentInput = {
  method: "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD";
  amount: number;
  receivedAmount?: number;
  processingFee?: number;
};

async function openAttendance() {
  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/tables/by-token/${qrToken}/orders`,
    payload: {
      customerName: "Integration Test Customer",
      items: [
        {
          productId: productId.toString(),
          quantity: 2,
        },
      ],
    },
  });

  assert.equal(response.statusCode, 201, response.body);

  return BigInt(response.json().attendanceId);
}

async function requestClosing() {
  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/tables/by-token/${qrToken}/request-closing`,
  });

  assert.equal(response.statusCode, 200, response.body);
}

async function prepareAttendance() {
  const attendanceId = await openAttendance();

  await requestClosing();

  return attendanceId;
}

function closeAttendance(
  attendanceId: bigint,
  payments: PaymentInput[],
  serviceFeeWaived = false,
) {
  return app.inject({
    method: "POST",
    url: `${BASE_URL}/attendances/${attendanceId}/close`,
    headers,
    payload: {
      serviceFeeWaived,
      payments,
    },
  });
}

function findAttendance(attendanceId: bigint) {
  return db.attendance.findUniqueOrThrow({
    where: { id: attendanceId },
  });
}

function findPayments(attendanceId: bigint) {
  return db.payment.findMany({
    where: { attendanceId },
    orderBy: { id: "asc" },
  });
}

test("closes an attendance with service fee", async () => {
  const attendanceId = await prepareAttendance();

  const response = await closeAttendance(attendanceId, [
    { method: "PIX", amount: 22 },
  ]);

  assert.equal(response.statusCode, 200, response.body);

  const body = response.json();

  assert.equal(Number(body.subtotal), 20);
  assert.equal(Number(body.serviceFee), 2);
  assert.equal(Number(body.total), 22);

  const attendance = await findAttendance(attendanceId);

  assert.equal(attendance.status, "CLOSED");
  assert.equal(Number(attendance.serviceFee), 2);
  assert.equal(attendance.closedById, userId);
  assert.equal(attendance.activeTableId, null);
  assert.ok(attendance.closedAt);

  const payments = await findPayments(attendanceId);

  assert.equal(payments.length, 1);
  assert.equal(payments[0].status, "PAID");
  assert.equal(payments[0].method, "PIX");
  assert.equal(Number(payments[0].amount), 22);
  assert.equal(payments[0].createdById, userId);
});

test("closes an attendance without service fee", async () => {
  const attendanceId = await prepareAttendance();

  const response = await closeAttendance(
    attendanceId,
    [{ method: "PIX", amount: 20 }],
    true,
  );

  assert.equal(response.statusCode, 200, response.body);

  const body = response.json();

  assert.equal(Number(body.subtotal), 20);
  assert.equal(Number(body.serviceFee), 0);
  assert.equal(Number(body.total), 20);

  const attendance = await findAttendance(attendanceId);

  assert.equal(attendance.status, "CLOSED");
  assert.equal(Number(attendance.serviceFee), 0);
});

test("closes an attendance with multiple payment methods", async () => {
  const attendanceId = await prepareAttendance();

  const response = await closeAttendance(attendanceId, [
    { method: "PIX", amount: 12 },
    { method: "CREDIT_CARD", amount: 10 },
  ]);

  assert.equal(response.statusCode, 200, response.body);

  const payments = await findPayments(attendanceId);

  assert.equal(payments.length, 2);
  assert.equal(payments[0].method, "PIX");
  assert.equal(payments[1].method, "CREDIT_CARD");

  assert.equal(
    payments.reduce((total, payment) => {
      return total + Number(payment.amount);
    }, 0),
    22,
  );

  assert.ok(payments.every((payment) => payment.status === "PAID"));
});

test("calculates change for cash payments", async () => {
  const attendanceId = await prepareAttendance();

  const response = await closeAttendance(attendanceId, [
    {
      method: "CASH",
      amount: 22,
      receivedAmount: 50,
    },
  ]);

  assert.equal(response.statusCode, 200, response.body);

  const [payment] = await findPayments(attendanceId);

  assert.equal(Number(payment.amount), 22);
  assert.equal(Number(payment.receivedAmount), 50);
  assert.equal(Number(payment.changeAmount), 28);
});

test("rejects payments with an incorrect total", async () => {
  const attendanceId = await prepareAttendance();

  const response = await closeAttendance(attendanceId, [
    { method: "PIX", amount: 15 },
  ]);

  assert.equal(response.statusCode, 409);

  const attendance = await findAttendance(attendanceId);

  assert.equal(attendance.status, "CLOSING_REQUESTED");
  assert.equal(attendance.closedAt, null);
  assert.equal(attendance.activeTableId, tableId);

  assert.equal((await findPayments(attendanceId)).length, 0);
});

test("rejects invalid payment data", async () => {
  const attendanceId = await prepareAttendance();

  const response = await closeAttendance(attendanceId, [
    { method: "PIX", amount: -22 },
  ]);

  assert.equal(response.statusCode, 400);

  assert.equal((await findPayments(attendanceId)).length, 0);
});

test("rejects closing an attendance without consumption", async () => {
  const attendance = await db.attendance.create({
    data: { tableId },
  });

  const response = await closeAttendance(attendance.id, [
    { method: "PIX", amount: 10 },
  ]);

  assert.equal(response.statusCode, 409);

  assert.equal((await findAttendance(attendance.id)).status, "OPEN");

  assert.equal((await findPayments(attendance.id)).length, 0);
});

test("rejects duplicate attendance closing", async () => {
  const attendanceId = await prepareAttendance();

  const payments: PaymentInput[] = [{ method: "PIX", amount: 22 }];

  const first = await closeAttendance(attendanceId, payments);
  const second = await closeAttendance(attendanceId, payments);

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 409);

  assert.equal((await findPayments(attendanceId)).length, 1);
});

test("requires authentication to close an attendance", async () => {
  const attendanceId = await prepareAttendance();

  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/attendances/${attendanceId}/close`,
    payload: {
      payments: [{ method: "PIX", amount: 22 }],
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal((await findPayments(attendanceId)).length, 0);
});

test("concurrent closing requests register only one payment", async () => {
  const attendanceId = await prepareAttendance();

  const payments: PaymentInput[] = [{ method: "PIX", amount: 22 }];

  const responses = await Promise.all([
    closeAttendance(attendanceId, payments),
    closeAttendance(attendanceId, payments),
  ]);

  const statusCodes = responses
    .map((response) => response.statusCode)
    .sort((a, b) => a - b);

  assert.deepEqual(statusCodes, [200, 409]);

  assert.equal((await findPayments(attendanceId)).length, 1);

  assert.equal((await findAttendance(attendanceId)).status, "CLOSED");
});

test("confirms payment for a requested attendance", async () => {
  const attendanceId = await prepareAttendance();

  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/attendances/${attendanceId}/confirm-payment`,
    headers,
  });

  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().status, "PAID");
  assert.equal(Number(response.json().amount), 20);

  const attendance = await findAttendance(attendanceId);

  assert.equal(attendance.status, "CLOSED");
  assert.equal(attendance.activeTableId, null);

  const payments = await findPayments(attendanceId);

  assert.equal(payments.length, 1);
  assert.equal(payments[0].status, "PAID");
});

test("reopens a closed attendance and cancels its payments", async () => {
  const attendanceId = await prepareAttendance();

  const closing = await closeAttendance(attendanceId, [
    { method: "PIX", amount: 22 },
  ]);

  assert.equal(closing.statusCode, 200);

  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/attendances/${attendanceId}/reopen`,
    headers,
  });

  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().refundedPayments, 1);

  const attendance = await findAttendance(attendanceId);

  assert.equal(attendance.status, "OPEN");
  assert.equal(attendance.closedAt, null);
  assert.equal(attendance.closedById, null);
  assert.equal(attendance.activeTableId, tableId);
  assert.equal(Number(attendance.serviceFee), 0);

  const payments = await findPayments(attendanceId);

  assert.equal(payments.length, 1);
  assert.equal(payments[0].status, "CANCELLED");
});
