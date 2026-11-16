import { Valkey } from "iovalkey";
import { env } from "../../config/env.js";

/** O mínimo que o rate limit usa; facilita trocar por um fake nos testes. */
export type CounterStore = {
  incr(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number, mode: "NX"): Promise<number>;
  pttl(key: string): Promise<number>;
};

/** O limite do login também lê e apaga contadores. */
export type KeyValueStore = CounterStore & {
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
};

/**
 * Cliente Valkey opcional: sem VALKEY_URL fica null (dev, testes, CI).
 * Com o Valkey fora, os comandos falham na hora (sem fila) e quem chama
 * usa o fallback em memória; o boot nunca depende dele.
 */
export function createValkey(url = env.VALKEY_URL): KeyValueStore | null {
  if (!url) return null;
  const client = new Valkey(url, {
    enableOfflineQueue: false,
    commandTimeout: 50,
    connectTimeout: 500,
    maxRetriesPerRequest: 0,
    retryStrategy: (times) => Math.min(times * 200, 5_000),
  });
  let lastWarn = 0;
  // Sem este listener, um erro de conexão viraria exceção não tratada.
  client.on("error", (error: Error) => {
    if (Date.now() - lastWarn < 60_000) return;
    lastWarn = Date.now();
    console.warn(`Valkey indisponível (usando memória): ${error.message}`);
  });
  return client;
}

export const valkey = createValkey();
