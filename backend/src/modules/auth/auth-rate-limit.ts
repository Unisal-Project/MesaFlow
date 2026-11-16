import type { FastifyReply, FastifyRequest } from "fastify";
import { valkey, type CounterStore } from "../../shared/cache/valkey.js";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

/**
 * Limite por IP + rota. Usa o Valkey (compartilhado entre instâncias e
 * reinícios) e cai para o Map em memória se ele não existir ou falhar.
 */
export function createAuthRateLimit(store: CounterStore | null = valkey) {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  let nextCleanup = Date.now() + WINDOW_MS;

  const countInMemory = (key: string, now: number) => {
    if (now >= nextCleanup) {
      for (const [entry, value] of attempts) {
        if (value.resetAt <= now) attempts.delete(entry);
      }
      nextCleanup = now + WINDOW_MS;
    }
    const current = attempts.get(key);
    const next =
      !current || current.resetAt <= now
        ? { count: 1, resetAt: now + WINDOW_MS }
        : { count: current.count + 1, resetAt: current.resetAt };
    attempts.set(key, next);
    return { count: next.count, retryMs: next.resetAt - now };
  };

  const countInValkey = async (key: string) => {
    const count = await store!.incr(key);
    // NX: só a 1ª ocorrência define a janela, e uma chave que ficou sem TTL
    // (PEXPIRE falhou antes) ganha um na próxima tentativa, sem bloquear para sempre.
    await store!.pexpire(key, WINDOW_MS, "NX");
    if (count <= MAX_REQUESTS) return { count, retryMs: WINDOW_MS };
    const ttl = await store!.pttl(key);
    return { count, retryMs: ttl > 0 ? ttl : WINDOW_MS };
  };

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const route = request.routeOptions.url;
    let result: { count: number; retryMs: number };
    try {
      if (!store) throw new Error("Valkey não configurado");
      result = await countInValkey(`mf:v1:ratelimit:${route}:${request.ip}`);
    } catch {
      result = countInMemory(`${request.ip}:${route}`, Date.now());
    }

    if (result.count > MAX_REQUESTS) {
      return reply
        .header("Retry-After", String(Math.ceil(result.retryMs / 1000)))
        .status(429)
        .send({ message: "Muitas tentativas. Tente novamente em um minuto." });
    }
  };
}
