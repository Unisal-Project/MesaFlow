import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, n;
const saved = { window: globalThis.window, localStorage: globalThis.localStorage };
const storage = new Map();
const login = (id) => {
  const token = "h." + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + ".s";
  storage.set("mesaflow.session", JSON.stringify({ accessToken: token, user: { id, role: "ADMIN" } }));
};

before(async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  n = await server.ssrLoadModule("/src/hooks/useAttendanceNotifications.ts");
});
after(async () => {
  await server?.close();
  Object.assign(globalThis, saved);
});

const call = { id: "1", status: "WAITER_CALL" };
const closing = { id: "2", status: "CLOSING_REQUESTED" };
const order = { id: "3", status: "NEW_ORDER" };

test("abrir o sino marca tudo como lido: badge zera e os itens continuam", () => {
  login("u-read");
  const list = [call, closing];
  assert.equal(n.unreadNotifications(list).length, 2);
  n.markNotificationsRead(list);
  assert.equal(n.unreadNotifications(list).length, 0);
  assert.equal(n.visibleNotifications(list).length, 2);
  // Notificação nova depois de abrir volta a contar.
  assert.deepEqual(n.unreadNotifications([...list, order]), [order]);
  assert.equal(storage.get("mesaflow.readNotifications.u-read"), JSON.stringify(["WAITER_CALL:1:", "CLOSING_REQUESTED:2:"]) /* chave = status:id:horário (sem horário no fixture) */);
});

test("limpar esconde as atuais, marca pedido como visto e a próxima aparece", () => {
  login("u-clear");
  n.dismissNotifications([call, order]);
  assert.deepEqual(n.visibleNotifications([call, order]), []);
  assert.ok(n.seenOrderIds().has("3"), "NEW_ORDER limpo conta como visto");
  const next = { id: "4", status: "WAITER_CALL" };
  assert.deepEqual(n.visibleNotifications([call, next]), [next]);
  // Poda: limpar de novo só guarda o que está presente.
  n.dismissNotifications([next]);
  assert.equal(storage.get("mesaflow.dismissedNotifications.u-clear"), JSON.stringify(["WAITER_CALL:4:"]));
});

test("lidas/limpas são isoladas por usuário", () => {
  login("u-a");
  n.markNotificationsRead([call]);
  n.dismissNotifications([closing]);
  login("u-b");
  assert.equal(n.unreadNotifications([call]).length, 1);
  assert.equal(n.visibleNotifications([closing]).length, 1);
});

test("storage bloqueado não quebra (fica em memória)", () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  try {
    assert.doesNotThrow(() => n.markNotificationsRead([call]));
    assert.equal(n.unreadNotifications([call]).length, 0);
    assert.doesNotThrow(() => n.dismissNotifications([call]));
    assert.equal(n.visibleNotifications([call]).length, 0);
  } finally {
    globalThis.localStorage = original;
  }
});

test('conta pedida de novo (mesmo atendimento, outro horário) volta a aparecer depois de limpar', () => {
  const first = { id: '12', status: 'CLOSING_REQUESTED', closingRequestedAt: '2026-11-16T01:00:00Z', table: { number: 3 } };
  const again = { ...first, closingRequestedAt: '2026-11-16T02:30:00Z' };
  assert.notEqual(n.notificationKey(first), n.notificationKey(again));
});
