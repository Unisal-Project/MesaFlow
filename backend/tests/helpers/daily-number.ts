/**
 * Completa um Prisma fake com o que nextDailyNumber usa: contador do dia
 * (sempre 1 aqui) e o eco de dailyNumber/businessDate no pedido criado.
 * O comportamento real (concorrência, rollback) é testado no MariaDB.
 */
export function withDailyNumber<T extends Record<string, any>>(client: T): T {
  const raw = client.$queryRaw;
  const fake: any = client;
  fake.$executeRaw = async () => 1;
  fake.restaurantSettings ??= { findUnique: async () => null };
  fake.$queryRaw = async (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.join("").includes("order_daily_counters")
      ? [{ last_number: 1 }]
      : raw?.(parts, ...values);
  const create = fake.order?.create;
  if (create)
    fake.order.create = async (args: any) => ({
      businessDate: args.data.businessDate,
      dailyNumber: args.data.dailyNumber,
      ...(await create(args)),
    });
  return client;
}
