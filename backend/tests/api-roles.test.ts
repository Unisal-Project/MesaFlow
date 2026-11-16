import assert from "node:assert/strict";
import { idFor } from "./helpers/session.js";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { requireApiAuthentication } from "../src/shared/api-access.js";

const adminRoutes = [
  ["POST", "/auth/register", "/auth/register"],
  ["POST", "/categories", "/categories"],
  ["PUT", "/categories/:id", "/categories/1"],
  ["DELETE", "/categories/:id", "/categories/1"],
  ["POST", "/products", "/products"],
  ["PATCH", "/products/:id", "/products/1"],
  ["PATCH", "/products/:id/category", "/products/1/category"],
  ["POST", "/products/:id/image", "/products/1/image"],
  ["DELETE", "/products/:id", "/products/1"],
  ["POST", "/tables", "/tables"],
  ["PUT", "/tables/:id", "/tables/1"],
  ["DELETE", "/tables/:id", "/tables/1"],
  ["POST", "/orders/:id/cancel", "/orders/1/cancel"],
  ["GET", "/attendances/cancelled", "/attendances/cancelled"],
  ["GET", "/reports/sales", "/reports/sales"],
] as const;

const staffRoutes = [
  ["GET", "/tables", "/tables"],
  ["POST", "/orders", "/orders"],
  ["POST", "/attendances/:id/close", "/attendances/1/close"],
] as const;

test("register is not public and EMPLOYEE gets 403 on admin routes", async () => {
  const app = Fastify();
  await app.register(fastifyJwt, { secret: "test-secret" });
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      for (const [method, url] of [...adminRoutes, ...staffRoutes])
        api.route({ method, url, handler: async () => ({ ok: true }) });
    },
    { prefix: "/api/v1" },
  );
  await app.ready();

  const sign = (role: "ADMIN" | "EMPLOYEE") =>
    `Bearer ${app.jwt.sign({ id: idFor(role), email: "x@example.com", role })}`;
  const call = async (method: string, path: string, auth?: string) =>
    (
      await app.inject({
        method: method as "GET",
        url: `/api/v1${path}`,
        headers: auth ? { authorization: auth } : {},
      })
    ).statusCode;

  assert.equal(await call("POST", "/auth/register"), 401);

  for (const [method, , path] of adminRoutes) {
    assert.equal(await call(method, path), 401, `${method} ${path} anon`);
    assert.equal(
      await call(method, path, sign("EMPLOYEE")),
      403,
      `${method} ${path} employee`,
    );
    assert.equal(
      await call(method, path, sign("ADMIN")),
      200,
      `${method} ${path} admin`,
    );
  }
  for (const [method, , path] of staffRoutes)
    assert.equal(
      await call(method, path, sign("EMPLOYEE")),
      200,
      `${method} ${path} employee`,
    );

  await app.close();
});
