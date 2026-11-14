import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server, identity;
const previousStorage = globalThis.sessionStorage;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, ws: false }, optimizeDeps: { noDiscovery: true } });
  identity = await server.ssrLoadModule("/src/contexts/ClientTableContext.tsx");
});
after(async () => { await server?.close(); globalThis.sessionStorage = previousStorage; });

test("identificação usa número real com dois dígitos e ignora nome administrativo", () => {
  assert.equal(identity.tableLabel({ id: "uuid", number: 1, name: "Varanda" }), "Mesa 01");
  assert.equal(identity.tableLabel({ id: "uuid", number: 123, name: null }), "Mesa 123");
});

test("nome persiste por token, inclusive em nova leitura após navegação ou F5", () => {
  const values = new Map();
  globalThis.sessionStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  identity.storeCustomerName("mesa-a", "Ana");
  assert.equal(identity.readCustomerName("mesa-a"), "Ana");
  assert.equal(identity.readCustomerName("mesa-b"), "");
  identity.storeCustomerName("mesa-b", "Bruno");
  identity.storeCustomerName("mesa-a", "");
  assert.equal(identity.readCustomerName("mesa-a"), "");
  assert.equal(identity.readCustomerName("mesa-b"), "Bruno");
  assert.equal(identity.readCustomerName(""), "");
});

test("armazenamento indisponível não interrompe o fluxo", () => {
  globalThis.sessionStorage = { getItem() { throw Error(); }, setItem() { throw Error(); } };
  assert.equal(identity.readCustomerName("mesa-a"), "");
  assert.doesNotThrow(() => identity.storeCustomerName("mesa-a", "Ana"));
});

test("acesso direto aguarda consulta sem exibir UUID nem liberar telas dependentes", () => {
  const html = renderToStaticMarkup(createElement(identity.ClientTableProvider, { token: "uuid-secreto" }, "Cardápio"));
  assert.match(html, /Identificando sua mesa/);
  assert.doesNotMatch(html, /uuid-secreto|Cardápio/);
});
