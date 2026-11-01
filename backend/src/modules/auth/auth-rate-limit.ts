import type { FastifyReply, FastifyRequest } from "fastify";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

export function createAuthRateLimit() {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  let nextCleanup = Date.now() + WINDOW_MS;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const now = Date.now();
    if (now >= nextCleanup) {
      for (const [key, value] of attempts) {
        if (value.resetAt <= now) attempts.delete(key);
      }
      nextCleanup = now + WINDOW_MS;
    }
    const key = `${request.ip}:${request.routeOptions.url}`;
    const current = attempts.get(key);
    const next =
      !current || current.resetAt <= now
        ? { count: 1, resetAt: now + WINDOW_MS }
        : { count: current.count + 1, resetAt: current.resetAt };
    attempts.set(key, next);

    if (next.count > MAX_REQUESTS) {
      return reply
        .header("Retry-After", String(Math.ceil((next.resetAt - now) / 1000)))
        .status(429)
        .send({ message: "Muitas tentativas. Tente novamente em um minuto." });
    }
  };
}
