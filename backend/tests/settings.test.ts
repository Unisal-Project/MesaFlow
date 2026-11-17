import assert from "node:assert/strict";
import "./helpers/session.js";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { errorHandler } from "../src/shared/errors/error-handler.js";
import { requireApiAuthentication } from "../src/shared/api-access.js";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/settings_test";
process.env.JWT_SECRET ??= "settings-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";

const initial = {
  serviceFeeRate: 10,
  name: null,
  address: null,
  openingHours: null,
  contact: null,
  dayCutoffHour: 5,
};

test("settings: dados públicos sem taxa, GET autenticado, PUT só ADMIN e validação estrita", async () => {
  const { registerSettingsRoutes } =
    await import("../src/modules/settings/settings.routes.js");
  let saved = { ...initial } as {
    serviceFeeRate: number;
    name: string | null;
    address: string | null;
    openingHours: string | null;
    contact: string | null;
    dayCutoffHour: number;
  };
  let writes = 0;
  let adminActive = true;
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(fastifyJwt, { secret: "settings-test-secret" });
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      await registerSettingsRoutes(api, {
        userRepository: {
          findById: async () =>
            ({ id: 1n, role: "ADMIN", active: adminActive }) as any,
        },
        repository: {
          get: async () => saved,
          save: async (data) => {
            writes++;
            // Omitido mantém a virada salva (como o repositório Prisma).
            saved = {
              ...data,
              dayCutoffHour: data.dayCutoffHour ?? saved.dayCutoffHour,
            };
            return saved;
          },
        },
      });
    },
    { prefix: "/api/v1" },
  );
  const employee = {
    authorization: `Bearer ${app.jwt.sign({ id: "2", email: "e@x.com", role: "EMPLOYEE" })}`,
  };
  const admin = {
    authorization: `Bearer ${app.jwt.sign({ id: "1", email: "a@x.com", role: "ADMIN" })}`,
  };
  try {
    const publicResponse = await app.inject({ url: "/api/v1/settings/public" });
    assert.equal(publicResponse.statusCode, 200);
    assert.deepEqual(publicResponse.json(), {
      name: null,
      address: null,
      openingHours: null,
      contact: null,
    });
    assert.equal(
      (await app.inject({ url: "/api/v1/settings" })).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/v1/settings",
          payload: initial,
        })
      ).statusCode,
      401,
    );
    assert.deepEqual(
      (await app.inject({ url: "/api/v1/settings", headers: employee })).json(),
      initial,
    );
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/v1/settings",
          headers: employee,
          payload: initial,
        })
      ).statusCode,
      403,
    );
    assert.equal(writes, 0);
    for (const rate of [0, 5, 10, 12.34, 20]) {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/settings",
        headers: admin,
        payload: {
          serviceFeeRate: rate,
          name: "  Mesa Flow  ",
          address: " ",
          openingHours: "  18h–23h ",
          contact: null,
        },
      });
      assert.equal(response.statusCode, 200, response.body);
      assert.deepEqual(response.json(), {
        serviceFeeRate: rate,
        name: "Mesa Flow",
        address: null,
        openingHours: "18h–23h",
        contact: null,
        dayCutoffHour: 5,
      });
    }
    const cutoff = await app.inject({
      method: "PUT",
      url: "/api/v1/settings",
      headers: admin,
      payload: { ...initial, dayCutoffHour: 0 },
    });
    assert.equal(cutoff.json().dayCutoffHour, 0);
    for (const payload of [
      { ...initial, serviceFeeRate: -1 },
      { ...initial, serviceFeeRate: 21 },
      { ...initial, serviceFeeRate: 1.234 },
      { ...initial, serviceFeeRate: "5" },
      { ...initial, extra: true },
      { ...initial, name: "x".repeat(121) },
      { ...initial, address: "x".repeat(256) },
      { ...initial, openingHours: "x".repeat(256) },
      { ...initial, contact: "x".repeat(121) },
      { ...initial, dayCutoffHour: 24 },
      { ...initial, dayCutoffHour: -1 },
      { ...initial, dayCutoffHour: 4.5 },
    ])
      assert.equal(
        (
          await app.inject({
            method: "PUT",
            url: "/api/v1/settings",
            headers: admin,
            payload,
          })
        ).statusCode,
        400,
      );
    assert.equal(writes, 6); // 5 taxas + virada do dia
    adminActive = false;
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/v1/settings",
          headers: admin,
          payload: initial,
        })
      ).statusCode,
      403,
    );
    assert.equal(writes, 6); // 5 taxas + virada do dia
    assert.equal(
      "serviceFeeRate" in
        (await app.inject({ url: "/api/v1/settings/public" })).json(),
      false,
    );
  } finally {
    await app.close();
  }
});
