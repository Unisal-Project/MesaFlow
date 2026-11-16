import type { FastifyReply, FastifyRequest } from "fastify";
import {
  valkey,
  type CounterStore,
  type KeyValueStore,
} from "../../shared/cache/valkey.js";

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

const LOGIN_EMAIL_FAILURES = 5;
const LOGIN_EMAIL_WINDOW_MS = 15 * 60_000;
const LOGIN_IP_FAILURES = 30;
const LOGIN_IP_WINDOW_MS = 60_000;

/**
 * Limite do login que conta SÓ FALHAS: 5 por IP+e-mail em 15 min e um teto de
 * 30 por IP em 1 min (varredura de vários e-mails). Login certo não consome e
 * zera as falhas daquele e-mail. Valkey com fallback em memória, como acima.
 */
export function createLoginLimiter(store: KeyValueStore | null = valkey) {
  const memory = new Map<string, { count: number; resetAt: number }>();
  const fromMemory = (key: string, now = Date.now()) => {
    const entry = memory.get(key);
    if (entry && entry.resetAt <= now) memory.delete(key);
    return entry && entry.resetAt > now ? entry : undefined;
  };
  const withStore = async <T>(
    action: (valkey: KeyValueStore) => Promise<T>,
    fallback: () => T,
  ) => {
    try {
      if (!store) throw new Error("Valkey não configurado");
      return await action(store);
    } catch {
      return fallback();
    }
  };

  const failures = (key: string) =>
    withStore(
      async (valkey) => {
        const count = Number((await valkey.get(key)) ?? 0);
        return { count, retryMs: count ? await valkey.pttl(key) : 0 };
      },
      () => {
        const entry = fromMemory(key);
        return {
          count: entry?.count ?? 0,
          retryMs: entry ? entry.resetAt - Date.now() : 0,
        };
      },
    );
  const addFailure = (key: string, windowMs: number) =>
    withStore(
      async (valkey) => {
        await valkey.incr(key);
        await valkey.pexpire(key, windowMs, "NX");
      },
      () => {
        const now = Date.now();
        // Limpeza simples para o Map não crescer sem fim sob varredura.
        if (memory.size > 10_000)
          for (const k of memory.keys()) fromMemory(k, now);
        const entry = fromMemory(key, now);
        memory.set(
          key,
          entry
            ? { ...entry, count: entry.count + 1 }
            : { count: 1, resetAt: now + windowMs },
        );
      },
    );

  const keys = (ip: string, email: string) => ({
    byEmail: `mf:v1:login-fail:${ip}:${email.trim().toLowerCase()}`,
    byIp: `mf:v1:login-fail-ip:${ip}`,
  });

  return {
    /** Milissegundos até liberar, ou 0 se pode tentar. */
    async retryAfterMs(ip: string, email: string) {
      const { byEmail, byIp } = keys(ip, email);
      const [emailFails, ipFails] = [
        await failures(byEmail),
        await failures(byIp),
      ];
      if (emailFails.count >= LOGIN_EMAIL_FAILURES)
        return Math.max(emailFails.retryMs, 1_000);
      if (ipFails.count >= LOGIN_IP_FAILURES)
        return Math.max(ipFails.retryMs, 1_000);
      return 0;
    },
    async fail(ip: string, email: string) {
      const { byEmail, byIp } = keys(ip, email);
      await addFailure(byEmail, LOGIN_EMAIL_WINDOW_MS);
      await addFailure(byIp, LOGIN_IP_WINDOW_MS);
    },
    async succeed(ip: string, email: string) {
      const { byEmail } = keys(ip, email);
      memory.delete(byEmail);
      await withStore(
        (valkey) => valkey.del(byEmail),
        () => 0,
      );
    },
  };
}

export type LoginLimiter = ReturnType<typeof createLoginLimiter>;
