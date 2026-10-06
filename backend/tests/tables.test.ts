import assert from 'node:assert/strict';
import { test } from 'node:test';
import Fastify from 'fastify';
import { TableService } from '../src/modules/tables/table.service.js';
import { TableController } from '../src/modules/tables/table.controller.js';
import { errorHandler } from '../src/shared/errors/error-handler.js';

function fixture(initialStatus?: string) {
  let row = { id: 9007199254740993n, number: 5, name: 'Varanda', active: true, qrToken: 'existing-token' };
  let nextId = 1n;
  let attendances: any[] = initialStatus ? [{ id: nextId++, tableId: row.id, status: initialStatus }] : [];
  let printJobs: any[] = [];
  const present = () => ({ ...row, attendances: attendances.filter((item) => ['OPEN', 'CLOSING_REQUESTED', 'AWAITING_PAYMENT'].includes(item.status)) });
  const repository: any = { restaurantTable: {
    create: async ({ data }: any) => { row = { ...row, ...data }; return row; },
    update: async ({ data }: any) => { row = { ...row, ...data }; return present(); },
    findUnique: async ({ where }: any) => where.id === row.id || where.qrToken === row.qrToken ? present() : null,
    findUniqueOrThrow: async () => present(),
    findMany: async () => [present()],
  },
  attendance: {
    create: async ({ data }: any) => { const item = { ...data, id: nextId++ }; attendances.push(item); return item; },
    updateMany: async ({ where, data }: any) => {
      const item = attendances.find((item) => item.id === where.id && item.status === where.status);
      if (!item) return { count: 0 };
      Object.assign(item, data);
      return { count: 1 };
    },
  },
  printJob: { create: async ({ data }: any) => { printJobs.push(data); return data; } },
  $queryRaw: async () => [{ id: row.id }],
  $transaction: async (callback: any) => {
    const snapshot = structuredClone({ row, attendances, printJobs });
    try { return await callback(repository); }
    catch (error) {
      ({ row, attendances, printJobs } = snapshot);
      throw error;
    }
  },
  };
  const service = new TableService(repository as any, 'https://menu.example');
  return { service, repository, row: () => row, attendances: () => attendances, printJobs: () => printJobs };
}

test('creation assigns unique tokens; editing preserves the QR URL', async () => {
  const { service, row } = fixture();
  const first = await service.createTable({ number: 5, name: 'Varanda', active: true });
  assert.match(row().qrToken, /^[0-9a-f-]{36}$/);
  assert.equal(new URL(first.menuUrl).pathname, '/cardapio');
  assert.equal(new URL(first.menuUrl).searchParams.get('mesa'), row().qrToken);
  const edited = await service.editTable({ id: row().id }, { number: 6, name: 'Jardim', active: true });
  assert.equal(edited.menuUrl, first.menuUrl);
  const second = await service.createTable({ number: 7, name: 'Outra', active: true });
  assert.notEqual(first.menuUrl, second.menuUrl);
});

test('token lookup returns only identity and rejects missing or inactive tables', async () => {
  const { service, row } = fixture();
  assert.deepEqual(await service.getTableByToken('existing-token'), { id: '9007199254740993', number: 5, name: 'Varanda' });
  await assert.rejects(service.getTableByToken('missing'), { statusCode: 404 });
  row().active = false;
  await assert.rejects(service.getTableByToken('existing-token'), { statusCode: 404 });
});

test('listing serializes bigint IDs and derives status from attendance', async () => {
  const { service } = fixture('CLOSING_REQUESTED');
  const tables = await service.getAllTables();
  assert.equal(tables[0].status, 'closing_requested');
  assert.doesNotThrow(() => JSON.stringify(tables));
});

test('table completes the full cycle, keeps its attendance until closing and can reopen', async () => {
  const { service, row, attendances, printJobs } = fixture();
  const params = { id: row().id };
  let current = await service.getTableById(params);
  assert.equal(current.status, 'available');
  assert.equal(current.attendanceId, null);
  for (const status of ['occupied', 'closing_requested', 'awaiting_payment', 'available'] as const) {
    current = await service.changeStatus(params, { status, attendanceId: current.attendanceId ? BigInt(current.attendanceId) : null });
    assert.equal(current.status, status);
    assert.equal((await service.getAllTables())[0].status, status);
    assert.equal((await service.getTableById(params)).status, status);
    assert.equal(current.attendanceId, status === 'available' ? null : '1');
  }
  assert.equal(attendances()[0].status, 'CLOSED');
  assert.ok(attendances()[0].closingRequestedAt instanceof Date);
  assert.ok(attendances()[0].closedAt instanceof Date);
  assert.equal(printJobs().length, 1);
  assert.deepEqual(printJobs()[0], { attendanceId: 1n, type: 'BILL' });
  const reopened = await service.changeStatus(params, { status: 'occupied', attendanceId: null });
  assert.equal(reopened.attendanceId, '2');
});

test('all skipped, repeated and backward transitions are rejected', async () => {
  const states = ['available', 'occupied', 'closing_requested', 'awaiting_payment'] as const;
  const persisted = [undefined, 'OPEN', 'CLOSING_REQUESTED', 'AWAITING_PAYMENT'];
  for (const [index, state] of states.entries()) {
    for (const target of states) {
      if (target === states[(index + 1) % states.length]) continue;
      const { service, row } = fixture(persisted[index]);
      await assert.rejects(service.changeStatus({ id: row().id }, { status: target, attendanceId: index ? 1n : null }), { statusCode: 409 }, `${state} -> ${target}`);
      assert.equal((await service.getTableById({ id: row().id })).status, state);
    }
  }
});

test('inactive and missing tables cannot start; occupied tables cannot be deactivated', async () => {
  const { service, row } = fixture();
  row().active = false;
  await assert.rejects(service.changeStatus({ id: row().id }, { status: 'occupied', attendanceId: null }), { statusCode: 409 });
  await assert.rejects(service.changeStatus({ id: 99n }, { status: 'occupied', attendanceId: null }), { statusCode: 404 });
  for (const status of ['OPEN', 'CLOSING_REQUESTED', 'AWAITING_PAYMENT']) {
    const occupied = fixture(status);
    await assert.rejects(occupied.service.editTable({ id: occupied.row().id }, { number: 5, name: 'Varanda', active: false }), { statusCode: 409 });
  }
});

test('stale attendance, duplicate starts and lost updates return conflicts', async () => {
  const { service, row, repository } = fixture('OPEN');
  await assert.rejects(service.changeStatus({ id: row().id }, { status: 'closing_requested', attendanceId: 99n }), { statusCode: 409 });
  repository.attendance.updateMany = async () => ({ count: 0 });
  await assert.rejects(service.changeStatus({ id: row().id }, { status: 'closing_requested', attendanceId: 1n }), { statusCode: 409 });
  const available = fixture();
  available.repository.attendance.create = async () => { throw { code: 'P2002' }; };
  await assert.rejects(available.service.changeStatus({ id: available.row().id }, { status: 'occupied', attendanceId: null }), { statusCode: 409, message: 'Mesa já possui atendimento em andamento' });
});

test('bill request rolls back if the print job fails', async () => {
  const { service, row, repository, printJobs } = fixture('OPEN');
  repository.printJob.create = async () => { throw new Error('Print queue unavailable'); };
  await assert.rejects(service.changeStatus({ id: row().id }, { status: 'closing_requested', attendanceId: 1n }), /Print queue unavailable/);
  assert.equal((await service.getTableById({ id: row().id })).status, 'occupied');
  assert.equal(printJobs().length, 0);
});

test('HTTP status endpoint validates IDs and bodies and returns serializable state', async () => {
  const { service, row } = fixture();
  const controller = new TableController(service);
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  app.patch('/tables/:id/status', (req, reply) => controller.changeStatus(req, reply));
  const patch = (payload: unknown, id = row().id.toString()) => app.inject({ method: 'PATCH', url: `/tables/${id}/status`, payload });
  try {
    for (const payload of [{}, { status: 'unknown', attendanceId: null }, { status: 'occupied' }, { status: 'occupied', attendanceId: '0' }]) {
      assert.equal((await patch(payload)).statusCode, 400);
    }
    assert.equal((await patch({ status: 'occupied', attendanceId: null }, 'invalid')).statusCode, 400);
    assert.equal((await patch({ status: 'occupied', attendanceId: null }, '999')).statusCode, 404);
    const started = await patch({ status: 'occupied', attendanceId: null });
    assert.equal(started.statusCode, 200);
    assert.equal(started.json().attendanceId, '1');
    assert.equal(started.json().status, 'occupied');
    assert.equal(started.headers['cache-control'], 'no-store');
    assert.equal((await patch({ status: 'occupied', attendanceId: null })).statusCode, 409);
  } finally { await app.close(); }
});

test('HTTP routes return PNG, identity, 404 and validation errors', async () => {
  const { service } = fixture();
  const controller = new TableController(service);
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  app.get('/tables/:id/qrcode', (req, reply) => controller.getQrCode(req, reply));
  app.get('/tables/by-token/:token', (req, reply) => controller.getTableByToken(req, reply));
  try {
    const qr = await app.inject('/tables/9007199254740993/qrcode');
    assert.equal(qr.statusCode, 200);
    assert.equal(qr.headers['content-type'], 'image/png');
    assert.equal(qr.rawPayload.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal((await app.inject('/tables/nope/qrcode')).statusCode, 400);
    assert.equal((await app.inject('/tables/0/qrcode')).statusCode, 400);
    assert.equal((await app.inject('/tables/999/qrcode')).statusCode, 404);
    const identity = await app.inject('/tables/by-token/existing-token');
    assert.equal(identity.statusCode, 200);
    assert.equal(identity.json().number, 5);
    assert.equal(identity.headers['cache-control'], 'no-store');
    assert.equal((await app.inject('/tables/by-token/missing')).statusCode, 404);
  } finally { await app.close(); }
});
