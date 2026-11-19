import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import "./unit-env.mjs";

const { parsed = {} } = config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  processEnv: {},
  quiet: true,
});
const password = process.env.TEST_MARIADB_PASSWORD ?? parsed.TEST_MARIADB_PASSWORD;
if (!password) {
  throw new Error("Defina TEST_MARIADB_PASSWORD no .env da raiz.");
}

// O host, a porta e o banco são fixos e correspondem ao Compose de testes.
process.env.DATABASE_URL = `mysql://mesaflow_test:${encodeURIComponent(password)}@127.0.0.1:3308/mesaflow_test`;
process.env.RUN_TABLES_DB_TESTS = "1";
process.env.RUN_WAITER_DB_TESTS = "1";
