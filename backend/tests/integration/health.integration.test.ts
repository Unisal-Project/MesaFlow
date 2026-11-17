import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestApp } from "./helpers/app.js";
import { disconnectDatabase } from "./helpers/database.js";

test("GET /health returns application status", async () => {
  const app = await createTestApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: "ok",
    });
  } finally {
    try {
      await app.close();
    } finally {
      await disconnectDatabase();
    }
  }
});
