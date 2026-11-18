import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/reports_test";
process.env.JWT_SECRET ??= "reports-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";

const { ReportService } =
  await import("../src/modules/reports/report.service.js");
const { reportRoutes } =
  await import("../src/modules/reports/report.routes.js");
const { errorHandler } = await import("../src/shared/errors/error-handler.js");

const money = (value: string) => ({ toString: () => value });
const item = (name: string, quantity: number, productId = name) => ({
  quantity,
  productId: BigInt(
    [...productId].reduce(
      (sum, char) => sum * 31n + BigInt(char.charCodeAt(0)),
      7n,
    ),
  ),
  product: { name },
});

// Brasil (UTC-3): 02:30Z do dia 08 ainda é dia 07 no horário local.
const attendances = [
  {
    closedAt: new Date("2026-11-07T23:00:00Z"), // 07/11 20:00 local
    serviceFee: money("6.00"),
    payments: [
      { amount: money("36.00"), method: "PIX" },
      { amount: money("30.00"), method: "CASH" },
    ],
    orders: [{ items: [item("Burger", 2)] }],
  },
  {
    closedAt: new Date("2026-11-08T02:30:00Z"), // 07/11 23:30 local
    serviceFee: money("0.00"),
    payments: [{ amount: money("10.00"), method: "PIX" }],
    orders: [{ items: [item("Suco", 1)] }, { items: [item("Burger", 1)] }],
  },
  {
    // 04:30 local: antes da virada das 05:00, ainda é o dia de operação 07/11.
    closedAt: new Date("2026-11-08T07:30:00Z"),
    serviceFee: money("0.00"),
    payments: [{ amount: money("20.00"), method: "PIX" }],
    orders: [{ items: [item("Burger", 2)] }],
  },
  {
    closedAt: new Date("2026-11-08T15:00:00Z"), // 08/11 12:00 local
    serviceFee: money("3.00"),
    payments: [{ amount: money("33.00"), method: "DEBIT_CARD" }],
    orders: [{ items: [item("Burger", 1)] }],
  },
];

function fakeClient() {
  const queries: any[] = [];
  const inRange = (date: Date, where: any) =>
    date >= where.gte && date < where.lt;
  const client: any = {
    attendance: {
      findMany: async ({ where }: any) => {
        queries.push(where);
        return attendances.filter((a) => inRange(a.closedAt, where.closedAt));
      },
    },
    restaurantSettings: {
      findUnique: async () => ({
        timezone: "America/Sao_Paulo",
        dayCutoffHour: 5,
      }),
    },
    order: {
      findMany: async ({ where }: any) =>
        [{ businessDate: new Date("2026-11-08T00:00:00Z") }].filter((o) =>
          inRange(o.businessDate, {
            gte: where.businessDate.gte,
            lt: new Date(where.businessDate.lte.getTime() + 1),
          }),
        ),
    },
    category: { count: async () => 4 },
  };
  return { client, queries };
}

test("agrupa por dia local, soma pagamentos e ordena o ranking", async () => {
  const { client } = fakeClient();
  const report = await new ReportService(client).getReport({
    start: "2026-11-07",
    end: "2026-11-08",
    tzOffset: 180,
  });
  assert.deepEqual(
    report.days.map((day) => day.date),
    ["2026-11-07", "2026-11-08"],
  );
  const [saturday, sunday] = report.days;
  // Receita líquida da taxa: 96 pagos − 6 de taxa. O fechamento das 04:30 de 08/11
  // (antes da virada) entra em 07/11, o dia de operação.
  assert.equal(saturday.revenue, 90);
  assert.equal(saturday.tables, 3);
  assert.equal(saturday.orders, 4);
  assert.equal(saturday.serviceFee, 6);
  assert.deepEqual(saturday.payments, { PIX: 66, CASH: 30 });
  assert.deepEqual(
    saturday.products.map(({ name, quantity }) => ({ name, quantity })),
    [
      { name: "Burger", quantity: 5 },
      { name: "Suco", quantity: 1 },
    ],
  );
  assert.ok(
    saturday.products.every((product) => /^\d+$/.test(product.productId)),
  );
  assert.equal(sunday.revenue, 30);
  assert.equal(sunday.cancellations, 1);
  assert.equal(saturday.cancellations, 0);
  assert.equal(report.activeCategories, 4);
});

test("pagamento sem forma registrada é agrupado como UNKNOWN, não como dinheiro", async () => {
  const { client } = fakeClient();
  client.attendance.findMany = async () => [
    {
      closedAt: new Date("2026-11-07T15:00:00Z"),
      serviceFee: money("2.00"),
      payments: [
        { amount: money("22.00"), method: null },
        { amount: money("5.00"), method: "CASH" },
      ],
      orders: [{ items: [item("Suco", 1)] }],
    },
  ];
  const report = await new ReportService(client).getReport({
    start: "2026-11-07",
    end: "2026-11-07",
    tzOffset: 180,
  });
  const [day] = report.days;
  assert.deepEqual(day.payments, { UNKNOWN: 22, CASH: 5 });
  assert.equal(day.revenue, 25);
  assert.equal(day.serviceFee, 2);
});

test("dias sem venda aparecem zerados e o período anterior é comparável", async () => {
  const { client, queries } = fakeClient();
  const report = await new ReportService(client).getReport({
    start: "2026-11-09",
    end: "2026-11-10",
    tzOffset: 180,
  });
  assert.deepEqual(
    report.days.map((day) => [day.date, day.revenue]),
    [
      ["2026-11-09", 0],
      ["2026-11-10", 0],
    ],
  );
  // Período anterior: 07 e 08/11, mesmo tamanho do selecionado.
  assert.deepEqual(report.previous, { revenue: 120, orders: 5, tables: 4 });
  // Janela larga em UTC (a data exata vem do dia de operação): 1 dia antes do início.
  assert.equal(
    queries[1].closedAt.gte.toISOString(),
    "2026-11-06T00:00:00.000Z",
  );
});

test("rota valida datas, intervalo e exige o formato AAAA-MM-DD", async () => {
  const { client } = fakeClient();
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(reportRoutes, { service: new ReportService(client) });

  const ok = await app.inject(
    "/reports/sales?start=2026-11-07&end=2026-11-08&tzOffset=180",
  );
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().days.length, 2);

  const inverted = await app.inject(
    "/reports/sales?start=2026-11-08&end=2026-11-07",
  );
  assert.equal(inverted.statusCode, 400);

  const tooLong = await app.inject(
    "/reports/sales?start=2024-01-01&end=2026-01-01",
  );
  assert.equal(tooLong.statusCode, 400);
  assert.match(tooLong.json().message, /no máximo 366 dias/);

  const badFormat = await app.inject(
    "/reports/sales?start=07/11/2026&end=2026-11-08",
  );
  assert.equal(badFormat.statusCode, 400);
  await app.close();
});

test("B14: ranking agrupa por productId (nomes iguais ficam separados) e usa o nome atual", async () => {
  const { client } = fakeClient();
  client.attendance.findMany = async () => [
    {
      closedAt: new Date("2026-11-07T15:00:00Z"),
      serviceFee: money("0.00"),
      payments: [{ amount: money("10.00"), method: "PIX" }],
      orders: [
        {
          items: [
            item("X-Salada", 2, "novo"),
            item("X-Salada", 1, "antigo"),
            item("X-Salada", 3, "novo"),
          ],
        },
      ],
    },
  ];
  const report = await new ReportService(client).getReport({
    start: "2026-11-07",
    end: "2026-11-07",
  });
  assert.deepEqual(
    report.days[0].products.map(({ name, quantity }) => [name, quantity]),
    [
      ["X-Salada", 5],
      ["X-Salada", 1],
    ],
  );
});

test("virada configurada em 0 muda o dia de operação do fechamento", async () => {
  const { client } = fakeClient();
  client.restaurantSettings.findUnique = async () => ({
    timezone: "America/Sao_Paulo",
    dayCutoffHour: 0,
  });
  client.attendance.findMany = async () => [
    {
      // 04:30 local de 08/11: com virada 00:00 já é o dia 08.
      closedAt: new Date("2026-11-08T07:30:00Z"),
      serviceFee: money("0.00"),
      payments: [{ amount: money("20.00"), method: "PIX" }],
      orders: [],
    },
  ];
  const report = await new ReportService(client).getReport({
    start: "2026-11-07",
    end: "2026-11-08",
  });
  assert.deepEqual(
    report.days.map((day) => [day.date, day.revenue]),
    [
      ["2026-11-07", 0],
      ["2026-11-08", 20],
    ],
  );
});
