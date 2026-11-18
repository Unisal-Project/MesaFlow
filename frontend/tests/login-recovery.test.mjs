import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, Login, createHookRunner;
const previousFetch = globalThis.fetch;
const previousInput = globalThis.HTMLInputElement;
before(async () => {
  globalThis.HTMLInputElement = class {};
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
after(async () => { globalThis.fetch = previousFetch; globalThis.HTMLInputElement = previousInput; await server?.close(); });

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

test("cadastro mostra os requisitos e impede senha que não os atende", async () => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw Error("não deve enviar senha fraca"); };
  const render = createHookRunner(() => Login({ onEnter() {} }));
  let tree = render();
  button(tree, "Criar conta").props.onClick(); tree = render();
  const password = () => nodes(render()).find(node => node.props?.id === "login-password");
  const submit = () => nodes(render()).find(node => node.props?.type === "submit");
  password().props.onChange({ target: { value: "senha123" } });
  assert.equal(submit().props.disabled, true);
  await nodes(render()).find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(requests, 0);
  assert.ok(nodes(render()).some(node => node.props?.role === "alert"));
  password().props.onChange({ target: { value: "Minha@123" } });
  assert.equal(submit().props.disabled, false);
  assert.equal(password().props.autoComplete, "new-password");
  assert.equal(password().props["aria-describedby"], "login-password-strength");
});

test("nova tela contém senha e confirmação, mostra força e ainda não envia alterações", async () => {
  let returned = false, entered = false;
  globalThis.fetch = async () => { assert.fail("tela de redefinição ainda não deve acessar a API"); };
  const render = createHookRunner(() => Login({ initialMode: "reset", onEnter: () => { entered = true; }, onReturnToLogin: () => { returned = true; } }));
  const tree = render();
  assert.equal(nodes(tree).find(node => node.type === "h2").props.children, "Crie sua nova senha");
  assert.ok(nodes(tree).some(node => node.props?.label === "Nova senha"));
  assert.ok(nodes(tree).some(node => node.props?.label === "Confirmar senha"));
  assert.ok(!nodes(tree).some(node => node.props?.label === "E-mail"));
  assert.ok(nodes(tree).some(node => node.props?.id === "login-password-strength"));
  await nodes(tree).find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(entered, false);
  assert.equal(nodes(tree).find(node => node.props?.type === "submit").props.disabled, true);
  button(tree, "Voltar para entrar").props.onClick();
  assert.equal(returned, true);
});

test("indicador vai de fraca a forte, lista requisitos e aceita símbolos diferentes", async () => {
  const { passwordStrength } = await server.ssrLoadModule("/src/utils/password-strength.ts");
  assert.equal(passwordStrength("").level, "empty");
  assert.equal(passwordStrength("abc").label, "Fraca");
  assert.equal(passwordStrength("senha123").label, "Média");
  for (const password of ["Minha@123", "Minha!123", "MINHA@123a"]) {
    const strength = passwordStrength(password);
    assert.equal(strength.label, "Forte");
    assert.equal(strength.valid, true);
    assert.equal(strength.requirements.every(item => item.met), true);
  }
  for (const password of ["curtA1!", "somenteletras", "MINHA@123", "Minha 123", "Minha@123".repeat(20)]) {
    assert.equal(passwordStrength(password).valid, false);
  }
});
