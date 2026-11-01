import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { requireApiAuthentication } from "../src/shared/api-access.js";

test("API requires JWT except for auth, menu, health and QR token routes", async () => {
  const app = Fastify();
  await app.register(fastifyJwt, { secret: "test-secret" });
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      for (const path of [
        "/health",
        "/auth/login",
        "/auth/register",
        "/categories",
        "/categories/:id",
        "/products",
        "/products/:id",
        "/tables/by-token/:token",
        "/tables/by-token/:token/orders",
        "/tables/by-token/:token/request-closing",
      ]) {
        api.route({
          method:
            path.includes("/orders") ||
            path.includes("request-closing") ||
            path.includes("/auth/")
              ? "POST"
              : "GET",
          url: path,
          handler: async () => ({ ok: true }),
        });
      }
      for (const [method, path] of [
        ["POST", "/categories"],
        ["PATCH", "/products/:id"],
        ["GET", "/tables"],
        ["POST", "/orders"],
        ["GET", "/attendances/:id/open"],
        ["POST", "/attendances/:id/confirm-payment"],
        ["GET", "/users"],
      ] as const)
        api.route({ method, url: path, handler: async () => ({ ok: true }) });
    },
    { prefix: "/api/v1" },
  );
  await app.ready();

  for (const [method, path] of [
    ["GET", "/health"],
    ["POST", "/auth/login"],
    ["POST", "/auth/register"],
    ["GET", "/categories"],
    ["GET", "/categories/1"],
    ["GET", "/products"],
    ["GET", "/products/1"],
    ["GET", "/tables/by-token/abc"],
    ["POST", "/tables/by-token/abc/orders"],
    ["POST", "/tables/by-token/abc/request-closing"],
  ] as const)
    assert.equal(
      (await app.inject({ method, url: `/api/v1${path}` })).statusCode,
      200,
      `${method} ${path}`,
    );

  const token = app.jwt.sign({
    id: "1",
    email: "staff@example.com",
    role: "EMPLOYEE",
  });
  for (const [method, path] of [
    ["POST", "/categories"],
    ["PATCH", "/products/1"],
    ["GET", "/tables"],
    ["POST", "/orders"],
    ["GET", "/attendances/1/open"],
    ["POST", "/attendances/1/confirm-payment"],
    ["GET", "/users"],
  ] as const) {
    assert.equal(
      (await app.inject({ method, url: `/api/v1${path}` })).statusCode,
      401,
      `${method} ${path}`,
    );
    assert.equal(
      (
        await app.inject({
          method,
          url: `/api/v1${path}`,
          headers: { authorization: `Bearer ${token}` },
        })
      ).statusCode,
      200,
      `${method} ${path}`,
    );
  }
  await app.close();
});
