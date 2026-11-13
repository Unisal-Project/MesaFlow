import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
let server, service;
const previousFetch = globalThis.fetch;
const previousStorage = globalThis.sessionStorage;
before(async () => {
  globalThis.sessionStorage = { getItem: () => "admin-token" };
  server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, ws: false }, optimizeDeps: { noDiscovery: true } });
  service = await server.ssrLoadModule("/src/services/waiter-calls.service.ts");
});
after(async () => {
  await server?.close();
  globalThis.fetch = previousFetch;
  globalThis.sessionStorage = previousStorage;
});

test("chamar garçom usa token codificado, aguarda API e não envia alterações de pedidos", async () => {
  let finish;
  const response = new Promise(resolve => { finish = resolve; });
  let confirmed = false;
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/tables\/by-token\/a%2Bb%2Fc\/call-waiter$/);
    assert.equal(options.method, "POST");
    assert.equal(options.body, undefined);
    return response;
  };
  const pending = service.callWaiter("a+b/c").then(result => { confirmed = true; return result; });
  await Promise.resolve();
  assert.equal(confirmed, false);
  finish(Response.json({ id: "1", status: "PENDING" }));
  assert.equal((await pending).status, "PENDING");
  assert.equal(confirmed, true);
});

test("falha da API, conexão e token ausente não viram sucesso", async () => {
  globalThis.fetch = async () => Response.json({ message: "QR Code inválido ou mesa indisponível" }, { status: 404 });
  await assert.rejects(service.callWaiter("invalid"), /QR Code inválido/);
  globalThis.fetch = async () => { throw Error("offline"); };
  await assert.rejects(service.callWaiter("valid"), /Não foi possível conectar/);
  globalThis.fetch = async () => { assert.fail("token ausente não deve consultar a API"); };
  await assert.rejects(service.callWaiter(""), /Mesa não identificada/);
});

test("listagem e atendimento de chamadas enviam JWT do admin", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.get("Authorization"), "Bearer admin-token");
    if (url.endsWith("/waiter-calls")) return Response.json([]);
    assert.match(url, /\/waiter-calls\/1\/attend$/);
    assert.equal(options.method, "PATCH");
    return Response.json({ id: "1", status: "ATTENDED" });
  };
  assert.deepEqual(await service.fetchWaiterCalls(), []);
  assert.equal((await service.attendWaiterCall("1")).status, "ATTENDED");
  globalThis.fetch = async () => Response.json({ message: "Token inválido" }, { status: 401 });
  await assert.rejects(service.attendWaiterCall("1"), /Token inválido/);
});
