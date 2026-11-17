import assert from "node:assert/strict";
import { test, before, after, beforeEach, afterEach } from "node:test";
import type { FastifyInstance } from "fastify";

import { createTestApp } from "./helpers/app.js";
import { db, disconnectDatabase } from "./helpers/database.js";
import { createTable } from "./helpers/fixtures.js";
import { createAuthenticatedUser } from "./helpers/auth.js";

const BASE_URL = "/api/v1/attendances";

let app: FastifyInstance;
let tableId: bigint;
let userId: bigint;
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
});

afterEach(async () => {
  await db.$transaction(async (tx) => {
    await tx.attendance.deleteMany({
      where: { tableId },
    });

    await tx.restaurantTable.delete({
      where: { id: tableId },
    });
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

test("POST /attendances creates an attendance", async () => {
  const response = await app.inject({
    method: "POST",
    url: BASE_URL,
    headers,
    payload: {
      tableId: tableId.toString(),
    },
  });

  assert.equal(response.statusCode, 201);

  const body = response.json();

  assert.equal(body.tableId, tableId.toString());
  assert.equal(body.status, "OPEN");

  const stored = await db.attendance.findUniqueOrThrow({
    where: {
      id: BigInt(body.id),
    },
  });

  assert.equal(stored.tableId, tableId);
  assert.equal(stored.status, "OPEN");
  assert.equal(stored.activeTableId, tableId);
});

test("GET /attendances/:tableId/open returns an open attendance", async () => {
  const attendance = await db.attendance.create({
    data: { tableId },
  });

  const response = await app.inject({
    method: "GET",
    url: `${BASE_URL}/${tableId}/open`,
    headers,
  });

  assert.equal(response.statusCode, 200);

  const body = response.json();

  assert.equal(body.id, attendance.id.toString());
  assert.equal(body.tableId, tableId.toString());
  assert.equal(body.status, "OPEN");
});

test("POST /attendances rejects duplicate attendances", async () => {
  await db.attendance.create({
    data: { tableId },
  });

  const response = await app.inject({
    method: "POST",
    url: BASE_URL,
    headers,
    payload: {
      tableId: tableId.toString(),
    },
  });

  assert.equal(response.statusCode, 409);

  const count = await db.attendance.count({
    where: { tableId },
  });

  assert.equal(count, 1);
});

test("POST /attendances rejects nonexistent tables", async () => {
  const response = await app.inject({
    method: "POST",
    url: BASE_URL,
    headers,
    payload: {
      tableId: "0",
    },
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().message, "Mesa não encontrada");
});

test("GET /attendances/:tableId/open rejects tables without attendance", async () => {
  const response = await app.inject({
    method: "GET",
    url: `${BASE_URL}/${tableId}/open`,
    headers,
  });

  assert.equal(response.statusCode, 404);
});

test("POST /attendances rejects invalid payloads", async () => {
  const response = await app.inject({
    method: "POST",
    url: BASE_URL,
    headers,
    payload: {
      tableId: "invalid",
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().message, "Dados inválidos");

  const count = await db.attendance.count({
    where: { tableId },
  });

  assert.equal(count, 0);
});

test("POST /attendances requires authentication", async () => {
  const response = await app.inject({
    method: "POST",
    url: BASE_URL,
    payload: {
      tableId: tableId.toString(),
    },
  });

  assert.equal(response.statusCode, 401);

  const count = await db.attendance.count({
    where: { tableId },
  });

  assert.equal(count, 0);
});
