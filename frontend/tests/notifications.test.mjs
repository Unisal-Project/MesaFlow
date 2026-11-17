import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, notifications, toast, runtime, createHookRunner;
const saved = { window: globalThis.window, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, fetch: globalThis.fetch };
const local = new Map(), session = new Map();
const storage = (map) => ({ getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) });
const signIn = (id) => local.set("mesaflow.session", JSON.stringify({ accessToken: `h.${btoa("{}")}.s`, user: { id, role: "ADMIN" } }));

before(async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  globalThis.localStorage = storage(local);
  globalThis.sessionStorage = storage(session);
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [{
      name: "notification-effects",
      enforce: "pre",
      resolveId(id) { if (id === "notification-test-react") return "\0notification-test-react"; },
      load(id) {
        if (id !== "\0notification-test-react") return;
        return `
          import { useRef } from "/tests/helpers/hook-runtime.mjs";
          export { useState, useRef } from "/tests/helpers/hook-runtime.mjs";
          let pending = [];
          const active = new Set();
          export function useEffect(effect, deps) {
            const slot = useRef({});
            if (!slot.current.deps || deps.some((value, i) => !Object.is(value, slot.current.deps[i]))) {
              pending.push(() => {
                slot.current.cleanup?.();
                slot.current.cleanup = effect();
                slot.current.deps = deps;
                active.add(slot.current);
              });
            }
          }
          export function flush() { const effects = pending; pending = []; effects.forEach(effect => effect()); }
          export function cleanup() { active.forEach(slot => slot.cleanup?.()); active.clear(); pending = []; }
        `;
      },
      transform(code, id) {
        if (id.endsWith("/useAttendanceNotifications.ts") || id.endsWith("/NotificationToast.tsx"))
          return code.replace('from "react"', 'from "notification-test-react"');
      },
    }],
  });
  notifications = await server.ssrLoadModule("/src/hooks/useAttendanceNotifications.ts");
  toast = await server.ssrLoadModule("/src/components/domain/notifications/NotificationToast.tsx");
  runtime = await server.ssrLoadModule("notification-test-react");
  ({ createHookRunner } = await server.ssrLoadModule("/tests/helpers/hook-runtime.mjs"));
});
after(async () => { runtime?.cleanup(); await server?.close(); Object.assign(globalThis, saved); });

const closing = { id: "50", status: "CLOSING_REQUESTED", closingRequestedAt: "2026-11-16T15:00:00Z", tableId: "3", table: { id: "3", number: 8 } };

test("destinos usam pedido da conta e ID da mesa, sem confundir com ID da chamada", () => {
  assert.equal(notifications.notificationTarget({ ...closing, orderId: "72" }), "/admin/pedidos/72");
  assert.equal(notifications.notificationTarget(closing), "/admin/mesas?mesa=3");
  assert.equal(notifications.notificationTarget({ ...closing, id: "99", status: "WAITER_CALL" }), "/admin/mesas?mesa=3");
  assert.equal(notifications.notificationTarget({ ...closing, id: "72", status: "NEW_ORDER" }), "/admin/pedidos/72");
  assert.equal(notifications.notificationTarget({ id: "99", status: "WAITER_CALL", table: { number: 8 } }), "/admin/mesas?numero=8");
});

test("avisar uma vez mantém a notificação no sino, inclusive em nova solicitação da mesma conta", () => {
  signIn("toast-user");
  assert.equal(notifications.takeUnannouncedNotifications([closing]).length, 1);
  assert.equal(notifications.takeUnannouncedNotifications([{ ...closing }]).length, 0);
  assert.equal(notifications.visibleNotifications([closing]).length, 1);
  assert.equal(notifications.unreadNotifications([closing]).length, 1);
  assert.equal(notifications.takeUnannouncedNotifications([{ ...closing, closingRequestedAt: "2026-11-16T16:00:00Z" }]).length, 1);
  signIn("other-toast-user");
  assert.equal(notifications.takeUnannouncedNotifications([closing]).length, 1);
});

test("polling associa fechamento ao pedido e mantém tableId da chamada", async () => {
  signIn("polling-user");
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/closing-requested")) return Response.json([closing]);
    if (path.endsWith("/cancelled")) return Response.json([]);
    if (path.endsWith("/waiter-calls")) return Response.json([{ id: "99", tableId: "3", table: { number: 8 }, createdAt: closing.closingRequestedAt }]);
    if (path.endsWith("/orders")) return Response.json([
      { id: "73", status: "CANCELLED", attendance: { id: "50", status: "CLOSING_REQUESTED" } },
      { id: "72", status: "PENDING", attendance: { id: "50", status: "CLOSING_REQUESTED" }, table: closing.table },
    ]);
    throw Error(`Unexpected request: ${url}`);
  };
  const run = createHookRunner(() => notifications.useAttendanceNotifications(true));
  run(); runtime.flush();
  await new Promise((resolve) => setImmediate(resolve));
  const items = run(); runtime.flush();
  assert.equal(items.find((item) => item.status === "CLOSING_REQUESTED").orderId, "72");
  assert.equal(items.find((item) => item.status === "WAITER_CALL").tableId, "3");
  runtime.cleanup();
});

test("aviso some após 7 segundos, sem reiniciar no polling, e pausa durante interação", () => {
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  const timers = new Map(); let nextId = 0, dismissed = 0;
  globalThis.setTimeout = (callback, duration) => { const id = ++nextId; timers.set(id, { callback, duration }); return id; };
  globalThis.clearTimeout = (id) => timers.delete(id);
  try {
    const run = createHookRunner(() => toast.NotificationToast({ item: closing, onDismiss: () => { dismissed++; }, onOpen() {} }));
    let tree = run(); runtime.flush();
    assert.equal(timers.size, 1);
    assert.equal([...timers.values()][0].duration, 3000);
    run(); runtime.flush();
    assert.equal(nextId, 1, "render causado por polling preserva o temporizador");
    tree.props.onMouseEnter(); tree = run(); runtime.flush();
    assert.equal(timers.size, 0);
    tree.props.onMouseLeave(); tree = run(); runtime.flush();
    assert.equal(timers.size, 1);
    [...timers.values()][0].callback();
    tree = run(); runtime.flush();
    assert.equal(dismissed, 0, "aviso permanece montado durante a saída");
    assert.match(tree.props.className, /notification-toast--exiting/);
    assert.equal(tree.props.inert, true);
    const target = {};
    tree.props.onAnimationEnd({ target, currentTarget: target, animationName: "notification-toast-out" });
    assert.equal(dismissed, 1);
    [...timers.values()][0].callback();
    assert.equal(dismissed, 1, "fallback não remove duas vezes após o fim da animação");
  } finally {
    runtime.cleanup();
    globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear;
  }
});
