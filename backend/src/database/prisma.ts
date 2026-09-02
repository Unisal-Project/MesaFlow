import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { env } from "../config/env.js";

const database = new URL(env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: database.hostname,
  port: Number(database.port),
  user: database.username,
  password: database.password,
  database: database.pathname.substring(1), // Remove the leading slash
  allowPublicKeyRetrieval: true, // Allow public key retrieval for MariaDB
});

export const prisma = new PrismaClient({
  adapter,
});
