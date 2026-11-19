import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import {
  issuePaymentSession,
  paymentConfirmationRoutes,
} from "../src/modules/payments/payment-confirmation.routes.js";
import { requireApiAuthentication } from "../src/shared/api-access.js";

test("confirmation uses only the signed attendance session and recovers on later reads", async (t) => {
  const app = Fastify();
  t.after(() => app.close());
  await app.register(fastifyJwt, { secret: "test-secret" });
  const reads: bigint[] = [];
  let paid = false;
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      paymentConfirmationRoutes(api, {
        readConfirmation: async (attendanceId) => {
          reads.push(attendanceId);
          return {
            status: paid && attendanceId === 42n ? "confirmed" : "pending",
          };
        },
      });
      api.get("/tables", async () => ({ ok: true }));
    },
    { prefix: "/api/v1" },
  );
  await app.ready();

  const first = issuePaymentSession(app, "42");
  const next = issuePaymentSession(app, "43");
  const read = (token?: string) =>
    app.inject({
      url: "/api/v1/client/payment-confirmation?attendanceId=43&mesa=qr",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  for (const token of [
    undefined,
    "42",
    "qr",
    `${first}invalid`,
    app.jwt.sign({
      id: "42",
      email: "employee@example.test",
      role: "EMPLOYEE",
    }),
    app.jwt.sign(
      {
        purpose: "customer-payment-confirmation",
        attendanceId: "42",
        sessionId: "expired",
      },
      { expiresIn: -1 },
    ),
  ]) {
    assert.equal((await read(token)).statusCode, 403);
  }
  assert.deepEqual(reads, []);
  assert.equal(
    (
      await app.inject({
        url: "/api/v1/tables",
        headers: { authorization: `Bearer ${first}` },
      })
    ).statusCode,
    401,
  );
  assert.deepEqual((await read(first)).json(), { status: "pending" });
  paid = true;
  const recovered = await read(first);
  assert.equal(recovered.headers["cache-control"], "no-store");
  assert.deepEqual(recovered.json(), { status: "confirmed" });
  assert.deepEqual((await read(next)).json(), { status: "pending" });
  assert.deepEqual(reads, [42n, 42n, 43n]);
});
