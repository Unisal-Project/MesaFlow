import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, useChangePassword, createHookRunner;
const session = JSON.stringify({
  user: { id: "1", name: "Ana", email: "ana@x.com", role: "ADMIN" },
  accessToken: `h.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url")}.s`,
});
const store = new Map();
const previous = {
  fetch: globalThis.fetch,
  window: globalThis.window,
  localStorage: globalThis.localStorage,
};
before(async () => {
  globalThis.window = {
    location: { protocol: "http:", hostname: "localhost", assign() {} },
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
    plugins: [
      {
        name: "controlled-settings-hook-renders",
        enforce: "pre",
        transform(code, id) {
          if (id.endsWith("/Settings/hooks/useChangePassword.ts"))
            return code.replace(
              'from "react"',
              'from "/tests/helpers/hook-runtime.mjs"',
            );
        },
      },
    ],
  });
  ({ useChangePassword } = await server.ssrLoadModule(
    "/src/pages/admin/Settings/hooks/useChangePassword.ts",
  ));
  ({ createHookRunner } = await server.ssrLoadModule(
    "/tests/helpers/hook-runtime.mjs",
  ));
});
after(async () => {
  await server?.close();
  Object.assign(globalThis, previous);
});

const fill = (hook, form) => hook.setForm(form);
const submit = (hook) => hook.submit({ preventDefault() {} });

test("confirmação diferente não envia nada", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(null, { status: 204 });
  };
  const render = createHookRunner(() => useChangePassword());
  fill(render(), {
    currentPassword: "antiga123",
    newPassword: "novaSenha1",
    confirmPassword: "outraSenha1",
  });
  await submit(render());
  const hook = render();
  assert.equal(calls, 0);
  assert.match(hook.error, /confirmação não confere/);
  assert.equal(hook.success, "");
});

test("sucesso chama o service, limpa os campos e mantém a sessão", async () => {
  store.set("mesaflow.session", session);
  let body;
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/auth\/password$/);
    body = JSON.parse(options.body);
    return new Response(null, { status: 204 });
  };
  const render = createHookRunner(() => useChangePassword());
  fill(render(), {
    currentPassword: "antiga123",
    newPassword: "novaSenha1",
    confirmPassword: "novaSenha1",
  });
  await submit(render());
  const hook = render();
  assert.deepEqual(body, {
    currentPassword: "antiga123",
    newPassword: "novaSenha1",
  });
  assert.deepEqual(hook.form, {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  assert.equal(hook.success, "Senha alterada com sucesso");
  assert.equal(hook.error, "");
  assert.equal(store.get("mesaflow.session"), session);
});

test("erro do backend aparece e os campos ficam preenchidos", async () => {
  store.set("mesaflow.session", session);
  globalThis.fetch = async () =>
    Response.json({ message: "Senha atual incorreta" }, { status: 400 });
  const render = createHookRunner(() => useChangePassword());
  const form = {
    currentPassword: "errada",
    newPassword: "novaSenha1",
    confirmPassword: "novaSenha1",
  };
  fill(render(), form);
  await submit(render());
  const hook = render();
  assert.equal(hook.error, "Senha atual incorreta");
  assert.deepEqual(hook.form, form);
  assert.equal(store.get("mesaflow.session"), session);
});
