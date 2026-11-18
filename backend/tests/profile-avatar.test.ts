import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import type { UserEntity } from "../src/modules/users/entity/user.entity.js";
import type { UserRepository } from "../src/modules/users/repository/user.repository.js";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/avatar_test";
process.env.JWT_SECRET ??= "avatar-test-secret";
process.env.FRONTEND_URL ??= "http://localhost:5173";

const { registerAuthRoutes } =
  await import("../src/modules/auth/auth.router.js");
const { requireApiAuthentication } =
  await import("../src/shared/api-access.js");
const { setSessionUserLoader } = await import("../src/shared/authenticate.js");
const { errorHandler } = await import("../src/shared/errors/error-handler.js");

test("avatar usa somente o usuário autenticado e preserva a foto anterior se o banco falhar", async () => {
  const users: UserEntity[] = [1n, 2n].map((id) => ({
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    passwordHash: "private",
    role: id === 1n ? "ADMIN" : "EMPLOYEE",
    active: true,
    tokenVersion: 0,
    avatarUrl: `/uploads/products/old-${id}.webp`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  let failSave = false,
    uploads = 0;
  const deleted: string[] = [];
  const repository: UserRepository = {
    create: async () => {
      throw Error("not used");
    },
    findAll: async () => users,
    findById: async (id) => users.find((user) => user.id === id) ?? null,
    findByEmail: async (email) =>
      users.find((user) => user.email === email) ?? null,
    update: async (id, data) => {
      if (failSave) throw Error("save failed");
      const user = users.find((item) => item.id === id)!;
      const { tokenVersion, ...values } = data;
      Object.assign(user, values);
      if (tokenVersion) user.tokenVersion++;
      return user;
    },
  };
  setSessionUserLoader((id) => repository.findById(id));
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(jwt, { secret: "avatar-test-secret" });
  await app.register(multipart, {
    limits: { files: 1, fileSize: 5 * 1024 * 1024 },
  });
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      await registerAuthRoutes(api, {
        repository,
        storage: {
          uploadProductImage: async (file) => {
            assert.equal(file.mimeType, "image/png");
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
  const headers = (id: number) => ({
    authorization: `Bearer ${app.jwt.sign({ id: String(id), email: users[id - 1].email, role: users[id - 1].role, tv: 0 })}`,
  });
  const upload = (id?: number) =>
    app.inject({
      method: "POST",
      url: "/api/v1/auth/me/avatar?userId=1",
      headers: {
        ...(id ? headers(id) : {}),
        "content-type": "multipart/form-data; boundary=avatar",
      },
      payload:
        '--avatar\r\nContent-Disposition: form-data; name="image"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\nphoto\r\n--avatar--\r\n',
    });
  try {
    assert.equal((await upload()).statusCode, 401);
    assert.equal(uploads, 0);
    const result = await upload(2);
    assert.equal(result.statusCode, 200);
    assert.equal(result.json().id, "2");
    assert.equal(result.json().avatarUrl, "/uploads/products/new-1.webp");
    assert.equal(result.json().passwordHash, undefined);
    assert.equal(result.json().tokenVersion, undefined);
    assert.equal(users[0].avatarUrl, "/uploads/products/old-1.webp");
    assert.deepEqual(deleted, ["/uploads/products/old-2.webp"]);
    failSave = true;
    assert.equal((await upload(2)).statusCode, 500);
    assert.equal(users[1].avatarUrl, "/uploads/products/new-1.webp");
    assert.equal(deleted.at(-1), "/uploads/products/new-2.webp");
    users[1].active = false;
    assert.equal((await upload(2)).statusCode, 401);
    assert.equal(uploads, 2);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/auth/me/avatar",
          headers: headers(1),
          payload: {},
        })
      ).statusCode,
      415,
    );
  } finally {
    await app.close();
  }
});
