import assert from "node:assert/strict";
import "./helpers/session.js";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { errorHandler } from "../src/shared/errors/error-handler.js";
import { requireApiAuthentication } from "../src/shared/api-access.js";
import type { RestaurantSettings } from "../src/modules/settings/repository/settings.repository.js";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/settings_test";
process.env.JWT_SECRET ??= "settings-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";

const initial = {
  serviceFeeRate: 10,
  name: null,
  address: null,
  openingHours: null,
  contact: null,
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
          saveBannerImage: async () => saved,
          get: async () => saved,
          save: async (data) => {
            writes++;
            saved = data;
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
      });
    }
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
    assert.equal(writes, 5);
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
    assert.equal(writes, 5);
    assert.equal(
      "serviceFeeRate" in
        (await app.inject({ url: "/api/v1/settings/public" })).json(),
      false,
    );
  } finally {
    await app.close();
  }
});

test("banner: upload só por admin ativo, imagem pública e rollback preserva banner anterior", async () => {
  const { registerSettingsRoutes } =
    await import("../src/modules/settings/settings.routes.js");
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(fastifyJwt, { secret: "settings-test-secret" });
  await app.register(multipart, {
    limits: { files: 1, fileSize: 5 * 1024 * 1024 },
  });
  let saved: RestaurantSettings = {
    ...initial,
    name: "Bistrô da Praça",
    bannerImageUrl: "/uploads/products/old.webp",
  };
  let active = true,
    failSave = false,
    uploads = 0;
  const deleted: string[] = [];
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      await registerSettingsRoutes(api, {
        userRepository: {
          findById: async () => ({ id: 1n, role: "ADMIN", active }) as any,
        },
        repository: {
          get: async () => saved,
          save: async (data) => {
            saved = { ...saved, ...data };
            return saved;
          },
          saveBannerImage: async (url) => {
            if (failSave) throw Error("save failed");
            saved = { ...saved, bannerImageUrl: url };
            return saved;
          },
        },
        storage: {
          uploadProductImage: async (file) => {
            assert.equal(file.mimeType, "image/png");
            assert.equal(file.buffer.toString(), "image-bytes");
            return `/uploads/products/new-${++uploads}.webp`;
          },
          delete: async (url) => {
            deleted.push(url);
          },
        },
      });
    },
    { prefix: "/api/v1" },
  );
  const admin = {
    authorization: `Bearer ${app.jwt.sign({ id: "1", email: "admin@example.com", role: "ADMIN" })}`,
  };
  const employee = {
    authorization: `Bearer ${app.jwt.sign({ id: "2", email: "employee@example.com", role: "EMPLOYEE" })}`,
  };
  const upload = (headers: Record<string, string> = admin) =>
    app.inject({
      method: "POST",
      url: "/api/v1/settings/banner",
      headers: {
        ...headers,
        "content-type": "multipart/form-data; boundary=banner",
      },
      payload:
        '--banner\r\nContent-Disposition: form-data; name="image"; filename="banner.png"\r\nContent-Type: image/png\r\n\r\nimage-bytes\r\n--banner--\r\n',
    });
  try {
    assert.equal((await upload({})).statusCode, 401);
    assert.equal((await upload(employee)).statusCode, 403);
    assert.equal(uploads, 0);
    assert.equal((await upload()).statusCode, 200);
    const info = (await app.inject({ url: "/api/v1/settings/public" })).json();
    assert.equal(info.name, "Bistrô da Praça");
    assert.equal(info.bannerImageUrl, "/uploads/products/new-1.webp");
    assert.equal("serviceFeeRate" in info, false);
    assert.deepEqual(deleted, ["/uploads/products/old.webp"]);
    failSave = true;
    assert.equal((await upload()).statusCode, 500);
    assert.equal(saved.bannerImageUrl, "/uploads/products/new-1.webp");
    assert.equal(deleted.at(-1), "/uploads/products/new-2.webp");
    active = false;
    assert.equal((await upload()).statusCode, 403);
    assert.equal(uploads, 2);
  } finally {
    await app.close();
  }
});
