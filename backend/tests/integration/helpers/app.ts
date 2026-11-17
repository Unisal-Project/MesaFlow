import { buildApp } from "../../../src/app.js";
import { connectDatabase, disconnectDatabase } from "./database.js";

export async function createTestApp() {
  await connectDatabase();

  try {
    const app = await buildApp(false);

    await app.ready();

    return app;
  } catch (error) {
    await disconnectDatabase();
    throw error;
  }
}
