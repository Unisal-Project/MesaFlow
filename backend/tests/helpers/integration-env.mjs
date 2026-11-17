import { config } from "dotenv";

const result = config({
  path: ".env.test",
  override: true,
});

if (result.error) {
  throw result.error;
}

const database = new URL(process.env.DATABASE_URL);

if (
  database.protocol !== "mysql:" ||
  database.hostname !== "127.0.0.1" ||
  database.port !== "3308" ||
  database.pathname !== "/mesaflow_test"
) {
  throw new Error(
    "Os testes de integração devem utilizar o banco exclusivo de testes.",
  );
}