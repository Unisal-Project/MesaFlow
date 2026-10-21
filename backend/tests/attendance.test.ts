import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import {
  Prisma,
  type Attendance,
  type PrismaClient,
} from "../src/generated/prisma/client.js";
import {
  AttendanceEntity,
  type AttendanceStatus,
} from "../src/modules/attendance/entity/attendance.entity.js";
import { AttendanceService } from "../src/modules/attendance/attendance.service.js";
import type { AttendanceRepository } from "../src/modules/attendance/repositories/attendance.repository.js";
import type { TableRepository } from "../src/modules/tables/repositories/table.repository.js";
import { errorHandler } from "../src/shared/errors/error-handler.js";

// As operações usam doubles; o cliente padrão não acessa o banco nestes testes.
process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/attendance_test";
process.env.JWT_SECRET ??= "attendance-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";
const { PrismaAttendanceRepository } =
  await import("../src/modules/attendance/repositories/prisma-attendance.repository.js");

function record(status: AttendanceStatus = "OPEN"): Attendance {
  const date = new Date("2026-01-01T12:00:00.000Z");
  return {
    id: 9007199254740993n,
    tableId: 9007199254740994n,
    status,
    openedAt: date,
    closingRequestedAt: status === "CLOSING_REQUESTED" ? date : null,
    closedAt: null,
    closedById: null,
    createdAt: date,
    updatedAt: date,
    activeTableId: status === "CANCELLED" ? null : 9007199254740994n,
  };
}

function repositoryWith(client: unknown) {
  return new PrismaAttendanceRepository(client as PrismaClient);
}

test("status lists preserve fields and order while copying domain projections", async () => {
  for (const status of ["CLOSING_REQUESTED", "CANCELLED"] as const) {
    const expected = [
      {
        ...record(status),
        table: { id: 9007199254740994n, number: 5, name: null },
      },
      {
        ...record(status),
        id: 9007199254740995n,
        closedById: 12n,
        table: { id: 9007199254740994n, number: 5, name: "Varanda" },
      },
    ];
    const rows = expected.map((row) => ({
      ...row,
      persistenceOnly: "must not escape",
      table: { ...row.table, qrToken: "must not escape" },
    }));
    const repository = repositoryWith({
      attendance: {
        findMany: async (query: Prisma.AttendanceFindManyArgs) => {
          assert.deepEqual(query.where, { status });
          assert.deepEqual(query.orderBy, { closingRequestedAt: "asc" });
          assert.deepEqual(query.include, {
            table: { select: { id: true, number: true, name: true } },
          });
          return rows;
        },
      },
    });

    const result = await repository.findAllByStatus(status);
    assert.deepEqual(result, expected);
    assert.notEqual(result[0], rows[0]);
    assert.notEqual(result[0].table, rows[0].table);
    result[0].table.name = "Changed";
    result[0].status = "CLOSED";
    assert.equal(rows[0].table.name, null);
    assert.equal(rows[0].status, status);
  }
});

test("empty lists and unexpected persistence errors keep their behavior", async () => {
  const repository = repositoryWith({
    attendance: { findMany: async () => [] },
  });
  assert.deepEqual(await repository.findAllByStatus("CANCELLED"), []);
  const failure = new Error("Database unavailable");
  const failing = repositoryWith({
    attendance: {
      findMany: async () => {
        throw failure;
      },
    },
  });
  await assert.rejects(
    failing.findAllByStatus("CLOSING_REQUESTED"),
    (error) => error === failure,
  );
});

test("single reads, creation and cancellation return entities and preserve null results", async () => {
  const row = record();
  const repository = repositoryWith({
    attendance: {
      findUnique: async ({ where }: Prisma.AttendanceFindUniqueArgs) =>
        where.id === row.id ? row : null,
      findFirst: async ({ where }: Prisma.AttendanceFindFirstArgs) => {
        assert.equal(where?.status, "OPEN");
        return where.tableId === row.tableId ? row : null;
      },
      create: async ({ data }: Prisma.AttendanceCreateArgs) => {
        assert.deepEqual(data, { tableId: row.tableId });
        return row;
      },
      update: async ({ where, data }: Prisma.AttendanceUpdateArgs) => {
        assert.deepEqual(where, { id: row.id });
        assert.deepEqual(data, { status: "CANCELLED" });
        return record("CANCELLED");
      },
    },
  });

  for (const result of [
    await repository.findById(row.id),
    await repository.findOpenByTableId(row.tableId),
    await repository.create(row.tableId),
  ]) {
    assert.ok(result instanceof AttendanceEntity);
    assert.equal(result.isOpen(), true);
    assert.equal(result.canReceiveOrders(), true);
    assert.equal(result.id, row.id);
    assert.equal("activeTableId" in result, false);
  }
  const cancelled = await repository.requestCancelled(row.id);
  assert.ok(cancelled instanceof AttendanceEntity);
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.canReceiveOrders(), false);
  assert.equal(await repository.findById(99n), null);
  assert.equal(await repository.findOpenByTableId(99n), null);
});

test("attendance totals keep decimal precision and missing totals remain null", async () => {
  const row = record();
  const repository = repositoryWith({
    attendanceTotal: {
      findUnique: async ({ where }: Prisma.AttendanceTotalFindUniqueArgs) =>
        where.attendanceId === row.id
          ? {
              attendanceId: row.id,
              tableId: row.tableId,
              status: row.status,
              total: new Prisma.Decimal("9007199254740993.12"),
            }
          : null,
    },
  });
  assert.deepEqual(await repository.findTotalByAttendanceId(row.id), {
    attendanceId: row.id,
    tableId: row.tableId,
    status: "OPEN",
    total: "9007199254740993.12",
  });
  assert.equal(await repository.findTotalByAttendanceId(99n), null);
});

for (const failPrintJob of [false, true]) {
  test(`closing and BILL print job share a transaction (${failPrintJob ? "rollback" : "success"})`, async () => {
    let row = record();
    const requestedAt = new Date("2026-01-01T13:00:00.000Z");
    const jobs: { attendanceId: bigint; type: string }[] = [];
    const failure = new Error("Print queue unavailable");
    const repository = repositoryWith({
      $transaction: async (callback: (tx: unknown) => Promise<Attendance>) => {
        const snapshot = { ...row };
        const tx = {
          attendance: {
            update: async ({ where, data }: Prisma.AttendanceUpdateArgs) => {
              assert.deepEqual(where, { id: row.id });
              assert.deepEqual(data, {
                status: "CLOSING_REQUESTED",
                closingRequestedAt: requestedAt,
              });
              row = {
                ...row,
                status: "CLOSING_REQUESTED",
                closingRequestedAt: requestedAt,
              };
              return row;
            },
          },
          printJob: {
            create: async ({
              data,
            }: {
              data: { attendanceId: bigint; type: string };
            }) => {
              assert.equal(row.status, "CLOSING_REQUESTED");
              if (failPrintJob) throw failure;
              jobs.push(data);
            },
          },
        };
        try {
          return await callback(tx);
        } catch (error) {
          row = snapshot;
          jobs.length = 0;
          throw error;
        }
      },
    });

    if (failPrintJob) {
      await assert.rejects(
        repository.requestClosing(row.id, requestedAt),
        (error) => error === failure,
      );
      assert.equal(row.status, "OPEN");
      assert.equal(row.closingRequestedAt, null);
      assert.deepEqual(jobs, []);
    } else {
      const result = await repository.requestClosing(row.id, requestedAt);
      assert.ok(result instanceof AttendanceEntity);
      assert.equal(result.status, "CLOSING_REQUESTED");
      assert.equal(result.closingRequestedAt, requestedAt);
      assert.deepEqual(jobs, [{ attendanceId: row.id, type: "BILL" }]);
    }
  });
}

test("service keeps closing and cancellation guards with repository interfaces", async () => {
  const row = record();
  const entity = new AttendanceEntity(
    row.id,
    row.tableId,
    row.status,
    row.openedAt,
    null,
    null,
    null,
    row.createdAt,
    row.updatedAt,
  );
  const unexpected = async (): Promise<never> => {
    throw new Error("Unexpected repository call");
  };
  const repository: AttendanceRepository = {
    findById: async () => entity,
    findOpenByTableId: unexpected,
    create: unexpected,
    findTotalByAttendanceId: unexpected,
    requestClosing: unexpected,
    requestCancelled: unexpected,
    findAllByStatus: unexpected,
  };
  const tables: TableRepository = {
    existsById: unexpected,
    create: unexpected,
    findById: unexpected,
    findAll: unexpected,
    delete: unexpected,
    findByToken: unexpected,
    findByIdWithAttendance: unexpected,
    findAllWithAttendance: unexpected,
    updateWithAttendanceCheck: unexpected,
    changeStatusTransaction: unexpected,
  };
  const service = new AttendanceService(repository, tables);
  for (const status of [
    "CLOSING_REQUESTED",
    "CLOSED",
    "CANCELLED",
    "AWAITING_PAYMENT",
  ] as const) {
    entity.status = status;
    await assert.rejects(service.requestClosing(row.id), {
      statusCode: 409,
      message: "Apenas atendimentos abertos podem solicitar fechamento",
    });
    await assert.rejects(service.requestCancelled(row.id), {
      statusCode: 409,
      message: "Apenas atendimentos abertos podem solicitar cancelamento",
    });
  }
  repository.findById = async () => null;
  await assert.rejects(service.requestClosing(row.id), {
    statusCode: 404,
    message: "Atendimento não encontrado",
  });
  await assert.rejects(service.requestCancelled(row.id), {
    statusCode: 404,
    message: "Atendimento não encontrado",
  });
});

test("actual listing routes retain their complete HTTP response contracts", async (t) => {
  const repository = repositoryWith({
    attendance: {
      findMany: async ({ where }: { where: { status: AttendanceStatus } }) => [
        {
          ...record(where.status),
          table: { id: 9007199254740994n, number: 5, name: null },
        },
      ],
    },
  });
  // Encaminha a instância criada pela Factory ao repository com cliente simulado.
  const findAll = repository.findAllByStatus.bind(repository);
  t.mock.method(
    PrismaAttendanceRepository.prototype,
    "findAllByStatus",
    findAll,
  );
  const { attendanceRoutes } =
    await import("../src/modules/attendance/attendance.routes.js");
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(attendanceRoutes);
  try {
    for (const [path, status] of [
      ["closing-requested", "CLOSING_REQUESTED"],
      ["cancelled", "CANCELLED"],
    ] as const) {
      const response = await app.inject(`/attendances/${path}`);
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), [
        {
          id: "9007199254740993",
          tableId: "9007199254740994",
          status,
          openedAt: "2026-01-01T12:00:00.000Z",
          closingRequestedAt:
            status === "CLOSING_REQUESTED" ? "2026-01-01T12:00:00.000Z" : null,
          closedAt: null,
          closedById: null,
          createdAt: "2026-01-01T12:00:00.000Z",
          updatedAt: "2026-01-01T12:00:00.000Z",
          activeTableId: status === "CANCELLED" ? null : "9007199254740994",
          table: { id: "9007199254740994", number: 5, name: null },
        },
      ]);
    }
  } finally {
    await app.close();
  }
});
