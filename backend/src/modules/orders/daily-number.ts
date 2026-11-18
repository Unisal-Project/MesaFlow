import type { Prisma } from "../../generated/prisma/client.js";

const HOUR_MS = 3_600_000;

/**
 * Dia de operação (AAAA-MM-DD): data local no fuso do restaurante, com a
 * virada em `cutoffHour` (03:40 com virada 05:00 ainda é o dia anterior).
 * Nunca usa o fuso do servidor.
 * ponytail: recua `cutoffHour` horas e formata no fuso; num dia com mudança
 * de horário de verão a virada pode andar 1 h (Brasil não tem desde 2019).
 */
export function toBusinessDate(
  now: Date,
  timezone: string,
  cutoffHour: number,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now.getTime() - cutoffHour * HOUR_MS));
}

/**
 * Próximo número do dia, na MESMA transação que cria o pedido: o UPSERT trava
 * a linha do dia até o commit (sem repetição sob concorrência) e o rollback
 * devolve o número. Chame antes de travar produtos (ordem de lock:
 * mesa → atendimento → contador → produtos).
 */
export async function nextDailyNumber(
  tx: Prisma.TransactionClient,
  now = new Date(),
) {
  const settings = await tx.restaurantSettings.findUnique({
    where: { id: 1 },
    select: { timezone: true, dayCutoffHour: true },
  });
  const day = toBusinessDate(
    now,
    settings?.timezone ?? "America/Sao_Paulo",
    settings?.dayCutoffHour ?? 5,
  );
  await tx.$executeRaw`
    INSERT INTO order_daily_counters (business_date, last_number) VALUES (${day}, 1)
    ON DUPLICATE KEY UPDATE last_number = last_number + 1`;
  const [counter] = await tx.$queryRaw<{ last_number: number | bigint }[]>`
    SELECT last_number FROM order_daily_counters WHERE business_date = ${day} FOR UPDATE`;
  return {
    businessDate: new Date(`${day}T00:00:00Z`),
    dailyNumber: Number(counter!.last_number),
  };
}

/** Formato do contrato da API: "2026-11-17". */
export const formatBusinessDate = (date: Date) =>
  date.toISOString().slice(0, 10);
