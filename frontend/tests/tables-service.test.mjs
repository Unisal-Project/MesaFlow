import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, tables;
const previousFetch = globalThis.fetch;
const previousWindow = globalThis.window;
const previousStorage = globalThis.localStorage;

before(async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  tables = await server.ssrLoadModule("/src/services/tables.service.ts");
});
after(async () => {
  await server?.close();
  globalThis.fetch = previousFetch;
  globalThis.window = previousWindow;
  globalThis.localStorage = previousStorage;
});

const input = { number: 3, name: "Varanda", seats: 6, active: true };

test("criar mesa faz POST /tables com a capacidade", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/api\/v1\/tables$/);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), input);
    return Response.json({ id: "9", ...input }, { status: 201 });
  };
  assert.equal((await tables.saveTable(input)).id, "9");
});

test("editar mesa faz PUT /tables/:id", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/tables\/9$/);
    assert.equal(options.method, "PUT");
    return Response.json({ id: "9", ...input });
  };
  await tables.saveTable(input, "9");
});

test("mudar status envia o atendimento atual", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/tables\/9\/status$/);
    assert.equal(options.method, "PATCH");
    assert.deepEqual(JSON.parse(options.body), {
      status: "closing_requested",
      attendanceId: "4",
    });
    return Response.json({});
  };
  await tables.changeTableStatus({ id: "9", attendanceId: "4" }, "closing_requested");
});

test("erro do backend chega com a mensagem original", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { message: "Mesa com histórico de atendimento não pode ser excluída; desative-a" },
      { status: 409 },
    );
  await assert.rejects(tables.removeTable("9"), /histórico de atendimento/);
});
