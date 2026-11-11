import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, apiRequest, attendance, ApiError;

const previousFetch = globalThis.fetch;
const previousWindow = globalThis.window;

before(async () => {
  globalThis.window = {
    location: { protocol: "http:", hostname: "localhost" },
  };

  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });

  ({ apiRequest, ApiError } = await server.ssrLoadModule(
    "/src/api/client.ts",
  ));

  attendance = await server.ssrLoadModule(
    "/src/services/attendance.service.ts",
  );
});

after(async () => {
  await server?.close();
  globalThis.fetch = previousFetch;
  globalThis.window = previousWindow;
});

test("notificações usam a mesma URL da API e prefixo dos demais services", async () => {
  globalThis.fetch = async (url) => {
    assert.match(url, /\/api\/v1\/attendances\/closing-requested$/);
    assert.ok(!url.includes("undefined"));
    return Response.json([]);
  };
  assert.deepEqual(await attendance.findClosingRequestedAttendances(), []);
});

test("cliente envia JSON e preserva headers fornecidos", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.get("Content-Type"), "application/json");
    assert.equal(options.headers.get("X-Request-ID"), "test");
    assert.equal(options.method, "POST");
    assert.equal(options.body, '{"name":"Mesa"}');
    return Response.json({ id: "1" }, { status: 201 });
  };
  assert.deepEqual(await apiRequest("/tables", {
    method: "POST", headers: { "X-Request-ID": "test" }, body: '{"name":"Mesa"}',
  }), { id: "1" });
});

test("cliente aceita resposta 204 sem tentar interpretar JSON", async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await apiRequest("/tables/1", { method: "DELETE" }), undefined);
});

test("cliente propaga mensagem do backend e trata erro sem JSON", async () => {
  globalThis.fetch = async () => Response.json({ message: "Mesa ocupada" }, { status: 409 });
  await assert.rejects(apiRequest("/tables/1"), /Mesa ocupada/);
  globalThis.fetch = async () => new Response("Bad Gateway", { status: 502 });
  await assert.rejects(apiRequest("/tables/1"), /Não foi possível acessar o servidor/);
});


test("cliente transforma falha de conexão em erro amigável", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  await assert.rejects(
    apiRequest("/tables"),
    /Não foi possível conectar ao servidor/,
  );
});

test("cliente preserva cancelamento de requisição", async () => {
  const abortError = new Error("The operation was aborted");
  abortError.name = "AbortError";

  globalThis.fetch = async () => {
    throw abortError;
  };

  await assert.rejects(
    apiRequest("/tables"),
    (error) => {
      assert.equal(error.name, "AbortError");
      assert.equal(error.message, abortError.message);
      return true;
    },
  );
});

test("cliente aceita resposta em texto simples", async () => {
  globalThis.fetch = async () => {
    return new Response("Operação realizada com sucesso", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  };

  assert.equal(
    await apiRequest("/tables"),
    "Operação realizada com sucesso",
  );
});

test("cliente aceita resposta com JSON inválido como texto", async () => {
  globalThis.fetch = async () => {
    return new Response("{ json inválido", { status: 200 });
  };

  assert.equal(await apiRequest("/tables"), "{ json inválido");
});

test("ApiError disponibiliza status HTTP e dados retornados pela API", async () => {
  const responseData = {
    message: "Mesa ocupada",
    code: "TABLE_OCCUPIED",
  };

  globalThis.fetch = async () => {
    return Response.json(responseData, { status: 409 });
  };

  await assert.rejects(apiRequest("/tables/1"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.name, "ApiError");
    assert.equal(error.message, "Mesa ocupada");
    assert.equal(error.status, 409);
    assert.deepEqual(error.data, responseData);

    return true;
  });
});

test("cliente não define Content-Type automaticamente para FormData", async () => {
  const formData = new FormData();
  formData.append("file", new Blob(["conteúdo"]), "arquivo.txt");

  globalThis.fetch = async (_url, options) => {
    assert.equal(options.body, formData);
    assert.equal(options.headers.has("Content-Type"), false);

    return Response.json({ success: true });
  };

  assert.deepEqual(
    await apiRequest("/uploads", {
      method: "POST",
      body: formData,
    }),
    { success: true },
  );
});
