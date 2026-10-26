import assert from "node:assert/strict";
import { test } from "node:test";
import { createUserSchema } from "../src/modules/users/dto/create-user.dto.js";
import { updateUserSchema } from "../src/modules/users/dto/update-user.dto.js";
import { userIdSchema } from "../src/modules/users/dto/user-id.dto.js";

test("create user accepts valid input and rejects raw password hash field", () => {
  assert.equal(
    createUserSchema.parse({
      name: "Ana",
      email: "ana@example.com",
      password: "secret123",
    }).role,
    "EMPLOYEE",
  );
  assert.equal(
    createUserSchema.safeParse({
      name: "Ana",
      email: "ana@example.com",
      password: "secret123",
      passwordHash: "hash",
    }).success,
    false,
  );
});

test("update user accepts partial changes and rejects an empty update", () => {
  assert.deepEqual(updateUserSchema.parse({ active: false }), {
    active: false,
  });
  assert.equal(updateUserSchema.safeParse({}).success, false);
});

test("user id converts a numeric route parameter to bigint", () => {
  assert.equal(userIdSchema.parse({ id: "42" }).id, 42n);
  assert.equal(userIdSchema.safeParse({ id: "abc" }).success, false);
});
