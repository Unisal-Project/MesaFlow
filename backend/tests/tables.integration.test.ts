import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { TableService } from '../src/modules/tables/table.service.js';

// Execute a partir de backend, usando o banco local já migrado.
test('tables: persisted lifecycle, database uniqueness and concurrent actions', {
  skip: process.env.RUN_TABLES_DB_TESTS !== '1',
}, async () => {
  const { prisma } = await import('../src/database/prisma.js');
  const service = new TableService(prisma, 'http://localhost:5173');
  let tableId: bigint | undefined;
  try {
    const table = await prisma.restaurantTable.create({ data: {
      number: randomInt(2_000_000_000, 4_000_000_000),
      name: 'Teste automatizado de estados',
      qrToken: randomUUID(),
    } });
    tableId = table.id;
    const params = { id: table.id };
    const starts = await Promise.allSettled([
      service.changeStatus(params, { status: 'occupied', attendanceId: null }),
      service.changeStatus(params, { status: 'occupied', attendanceId: null }),
    ]);
    assert.equal(starts.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = starts.find((result) => result.status === 'rejected');
    assert.equal(rejected?.reason.statusCode, 409);
    let current = await service.getTableById(params);
    const attendanceId = BigInt(current.attendanceId!);

    for (const state of ['occupied', 'closing_requested', 'awaiting_payment'] as const) {
      if (state !== 'occupied') current = await service.changeStatus(params, { status: state, attendanceId });
      assert.equal(current.status, state);
      // Nova instância lê o estado persistido, inclusive após aguardar pagamento.
      const reloaded = await new TableService(prisma, 'http://localhost:5173').getTableById(params);
      assert.equal(reloaded.status, state);
      assert.equal(reloaded.attendanceId, attendanceId.toString());
      const stored = await prisma.attendance.findUniqueOrThrow({ where: { id: attendanceId } });
      assert.equal(stored.activeTableId, table.id);
      await assert.rejects(prisma.attendance.create({ data: { tableId: table.id } }), { code: 'P2002' });
      await assert.rejects(service.editTable(params, { name: table.name!, number: table.number, active: false }), { statusCode: 409 });
    }
    assert.equal(await prisma.printJob.count({ where: { attendanceId, type: 'BILL' } }), 1);
    current = await service.changeStatus(params, { status: 'available', attendanceId });
    assert.equal(current.status, 'available');
    assert.equal(current.attendanceId, null);
    const closed = await prisma.attendance.findUniqueOrThrow({ where: { id: attendanceId } });
    assert.equal(closed.status, 'CLOSED');
    assert.equal(closed.activeTableId, null);
    assert.ok(closed.closedAt);
    assert.ok(closed.closingRequestedAt);

    const reopened = await service.changeStatus(params, { status: 'occupied', attendanceId: null });
    assert.notEqual(reopened.attendanceId, attendanceId.toString());
    await assert.rejects(service.changeStatus(params, { status: 'closing_requested', attendanceId }), { statusCode: 409 });
    const newId = BigInt(reopened.attendanceId!);
    const bills = await Promise.allSettled([
      service.changeStatus(params, { status: 'closing_requested', attendanceId: newId }),
      service.changeStatus(params, { status: 'closing_requested', attendanceId: newId }),
    ]);
    assert.equal(bills.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(await prisma.printJob.count({ where: { attendanceId: newId, type: 'BILL' } }), 1);
  } finally {
    try {
      if (tableId !== undefined) {
        await prisma.$transaction(async (tx) => {
          await tx.printJob.deleteMany({ where: { attendance: { tableId } } });
          await tx.attendance.deleteMany({ where: { tableId } });
          await tx.restaurantTable.delete({ where: { id: tableId } });
        });
      }
    } finally { await prisma.$disconnect(); }
  }
});
