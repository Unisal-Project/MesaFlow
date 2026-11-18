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

const LOGIN_EMAIL_ATTEMPTS = 5;
const LOGIN_EMAIL_WINDOW_MS = 15 * 60_000;
const LOGIN_IP_ATTEMPTS = 30;
const LOGIN_IP_WINDOW_MS = 60_000;

/**
 * Limite do login contado NA CHEGADA, antes do bcrypt, com incremento atômico
 * (INCR no Valkey; no Map em memória o incremento é síncrono, sem await entre
 * ler e somar). Assim uma rajada paralela não passa toda do limite.
 * - por IP: 30 tentativas/min de qualquer tipo (protege a CPU);
 * - por IP+e-mail: 5 em 15 min; o login certo apaga esse contador, então
 *   só as falhas "ficam" no limite do e-mail.
 */
export function createLoginLimiter(store: KeyValueStore | null = valkey) {
  const memory = new Map<string, { count: number; resetAt: number }>();

  const hitInMemory = (key: string, windowMs: number) => {
    const now = Date.now();
    // Limpeza simples para o Map não crescer sem fim sob varredura.
    if (memory.size > 10_000)
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    const entry = memory.get(key);
    const next =
      entry && entry.resetAt > now
        ? { count: entry.count + 1, resetAt: entry.resetAt }
        : { count: 1, resetAt: now + windowMs };
    memory.set(key, next);
    return { count: next.count, retryMs: next.resetAt - now };
  };

  /** Soma 1 e devolve quanto falta para liberar se passou de `max` (0 = ok). */
  const hit = async (key: string, windowMs: number, max: number) => {
    let result: { count: number; retryMs: number };
    try {
      if (!store) throw new Error("Valkey não configurado");
      const count = await store.incr(key);
      await store.pexpire(key, windowMs, "NX");
      const ttl = count > max ? await store.pttl(key) : windowMs;
      result = { count, retryMs: ttl > 0 ? ttl : windowMs };
    } catch {
      result = hitInMemory(key, windowMs);
    }
    return result.count > max ? Math.max(result.retryMs, 1_000) : 0;
  };

  const keys = (ip: string, email: string) => ({
    byEmail: `mf:v1:login-attempt:${ip}:${email.trim().toLowerCase()}`,
    byIp: `mf:v1:login-attempt-ip:${ip}`,
  });

  return {
    /** Conta a tentativa; devolve ms até liberar (0 = pode testar a senha). */
    async attempt(ip: string, email: string) {
      const { byEmail, byIp } = keys(ip, email);
      return Math.max(
        await hit(byIp, LOGIN_IP_WINDOW_MS, LOGIN_IP_ATTEMPTS),
        await hit(byEmail, LOGIN_EMAIL_WINDOW_MS, LOGIN_EMAIL_ATTEMPTS),
      );
    },
    /** Login certo: o limite por e-mail volta a zero (o por IP continua). */
    async succeed(ip: string, email: string) {
      const { byEmail } = keys(ip, email);
      memory.delete(byEmail);
      try {
        await store?.del(byEmail);
      } catch {
        // Valkey fora: a chave expira sozinha.
      }
    },
  };
}

export type LoginLimiter = ReturnType<typeof createLoginLimiter>;
