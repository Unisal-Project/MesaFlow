import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, auth, apiRequest;
const store = new Map();
const redirects = [];
const previousFetch = globalThis.fetch;
const previousWindow = globalThis.window;
const previousStorage = globalThis.localStorage;

const jwt = (exp) =>
  `h.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.s`;
const nowSec = () => Math.floor(Date.now() / 1000);
const user = { id: "1", name: "Ana", email: "ana@x.com", role: "ADMIN" };

before(async () => {
  globalThis.window = {
    location: {
      protocol: "http:",
      hostname: "localhost",
      assign: (url) => redirects.push(url),
    },
  };
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  auth = await server.ssrLoadModule("/src/services/auth.service.ts");
  ({ apiRequest } = await server.ssrLoadModule("/src/api/client.ts"));
});
after(async () => {
  await server?.close();
  globalThis.fetch = previousFetch;
  globalThis.window = previousWindow;
  globalThis.localStorage = previousStorage;
});
beforeEach(() => {
  store.clear();
  redirects.length = 0;
});

test("login envia credenciais e salva a sessão", async () => {
  const token = jwt(nowSec() + 3600);
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/api\/v1\/auth\/login$/);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), {
      email: "ana@x.com",
      password: "segredo123",
    });
    return Response.json({ user, accessToken: token });
  };
  await auth.login("ana@x.com", "segredo123");
  assert.equal(auth.getToken(), token);
  assert.equal(auth.getSession().user.name, "Ana");
});

test("login com senha errada propaga a mensagem e não redireciona", async () => {
  auth.logout();
  store.set(
    "mesaflow.session",
    JSON.stringify({ user, accessToken: jwt(nowSec() + 3600) }),
  );
  globalThis.fetch = async () =>
    Response.json({ message: "E-mail ou senha inválidos" }, { status: 401 });
  await assert.rejects(auth.login("ana@x.com", "x"), /E-mail ou senha inválidos/);
  assert.deepEqual(redirects, []);
});

test("cadastro envia apenas name, email e password", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/auth\/register$/);
    assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(), [
      "email",
      "name",
      "password",
    ]);
    return Response.json({ user, accessToken: jwt(nowSec() + 3600) }, { status: 201 });
  };
  await auth.register("Ana", "ana@x.com", "segredo123");
  assert.ok(auth.getSession());
});

test("token expirado invalida a sessão", () => {
  store.set(
    "mesaflow.session",
    JSON.stringify({ user, accessToken: jwt(nowSec() - 10) }),
  );
  assert.equal(auth.getSession(), null);
  assert.equal(store.has("mesaflow.session"), false);
});

test("sessão corrompida é tratada como deslogado", () => {
  store.set("mesaflow.session", "{nao-e-json");
  assert.equal(auth.getSession(), null);
});

test("requisições autenticadas levam o Bearer token", async () => {
  const token = jwt(nowSec() + 3600);
  store.set("mesaflow.session", JSON.stringify({ user, accessToken: token }));
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.get("Authorization"), `Bearer ${token}`);
    return Response.json([]);
  };
  await apiRequest("/tables");
});

test("401 fora de /auth encerra a sessão e volta ao login", async () => {
  store.set(
    "mesaflow.session",
    JSON.stringify({ user, accessToken: jwt(nowSec() + 3600) }),
  );
  globalThis.fetch = async () => Response.json({}, { status: 401 });
  await assert.rejects(apiRequest("/tables"));
  assert.equal(auth.getSession(), null);
  assert.deepEqual(redirects, ["/login"]);
});
