import { fileURLToPath } from "node:url";
import { config } from "dotenv";

if (process.env.NODE_ENV !== "test") {
  config({
    path: fileURLToPath(new URL("../../../.env", import.meta.url)),
    quiet: true,
  });
}

const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not defined.`);
  }
  return value;
};

// Opcional: só valida o formato quando definida.
const optionalRedisUrl = (name: string) => {
  const value = process.env[name];
  if (!value) return undefined;
  if (!/^rediss?:\/\/[^\s]+$/.test(value) || !URL.canParse(value)) {
    throw new Error(`Environment variable ${name} must be a redis:// URL.`);
  }
  return value;
};

// Valores de exemplo/dev conhecidos: aceitos fora de produção, nunca em produção.
const PLACEHOLDER_SECRETS = new Set([
  "change-me",
  "development-only-change-me",
  "replace-with-a-long-random-secret",
  "test-jwt-secret",
  "test-secret",
]);

/** Em produção o JWT_SECRET (HS256) precisa ter >= 32 bytes e não ser exemplo. */
export function checkJwtSecret(secret: string, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv !== "production") return secret;
  if (PLACEHOLDER_SECRETS.has(secret) || Buffer.byteLength(secret) < 32) {
    throw new Error(
      "JWT_SECRET fraco: use pelo menos 32 bytes aleatórios (ex.: openssl rand -base64 48).",
    );
  }
  return secret;
}

export const env = {
  PORT: Number(process.env.PORT ?? 3333),
  JWT_SECRET: checkJwtSecret(getEnv("JWT_SECRET")),
  FRONTEND_URL: getEnv("FRONTEND_URL"),
  DATABASE_URL: getEnv("DATABASE_URL"),
  VALKEY_URL: optionalRedisUrl("VALKEY_URL"),
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || undefined,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || undefined,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || undefined,
};
