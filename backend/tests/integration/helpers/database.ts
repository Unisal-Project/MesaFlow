import { PrismaConnector } from "../../../src/database/prisma.js";

export const db = PrismaConnector;

export async function connectDatabase() {
  const database = new URL(process.env.DATABASE_URL ?? "");

  if (
    process.env.NODE_ENV !== "test" ||
    database.protocol !== "mysql:" ||
    database.hostname !== "127.0.0.1" ||
    database.port !== "3308" ||
    database.pathname !== "/mesaflow_test"
  ) {
    throw new Error("Invalid integration test environment.");
  }

  await db.$connect();
}

export async function disconnectDatabase() {
  await db.$disconnect();
}
