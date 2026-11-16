import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, Login, createHookRunner;
const previousFetch = globalThis.fetch;
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [{ name: "login-controlled-render", enforce: "pre", transform(code, id) {
      if (id.endsWith("/Login/index.tsx") || id.endsWith("/hooks/useDocumentClass.ts"))
        return code.replace('from "react"', 'from "/tests/helpers/hook-runtime.mjs"');
    } }],
  });
  ({ default: Login } = await server.ssrLoadModule("/src/pages/admin/Login/index.tsx"));
  ({ createHookRunner } = await server.ssrLoadModule("/tests/helpers/hook-runtime.mjs"));
});
after(async () => { globalThis.fetch = previousFetch; await server?.close(); });

function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const button = (tree, text) => nodes(tree).find((node) => node.type === "button" && node.props.children === text);

test("recuperação abre no padrão do cadastro e volta ao login sem enviar requisições", async () => {
  let entered = false;
  globalThis.fetch = () => { throw Error("A recuperação visual não deve acessar a API"); };
  const render = createHookRunner(() => Login({ onEnter: () => { entered = true; } }));
  let tree = render();
  button(tree, "Esqueci minha senha").props.onClick(); tree = render();
  assert.equal(nodes(tree).find((node) => node.type === "h2").props.children, "Recuperar senha");
  assert.ok(nodes(tree).some((node) => node.props.label === "E-mail"));
  assert.ok(!nodes(tree).some((node) => node.props.label === "Senha"));
  const submit = nodes(tree).find((node) => node.props.type === "submit");
  assert.equal(submit.props.disabled, true);
  await nodes(tree).find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(entered, false);
  button(tree, "Voltar para entrar").props.onClick(); tree = render();
  assert.ok(nodes(tree).some((node) => node.props.label === "Senha"));
  button(tree, "Criar conta").props.onClick(); tree = render();
  assert.ok(nodes(tree).some((node) => node.props.label === "Seu nome"));
  assert.ok(nodes(tree).some((node) => node.props.label === "Confirmar senha"));
});
