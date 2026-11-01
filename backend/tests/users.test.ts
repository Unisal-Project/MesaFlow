import assert from "node:assert/strict";
import { test } from "node:test";
import { updateUserSchema } from "../src/modules/users/dto/update-user.dto.js";
import { userIdSchema } from "../src/modules/users/dto/user-id.dto.js";

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
