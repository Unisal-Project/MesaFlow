import { PrismaConnector } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-errors.js";
import { toBusinessDate } from "../orders/daily-number.js";

const DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS = 366;

/** UNKNOWN: pagamento sem forma registrada (ex.: fechamento pelo QR). */
export type PaymentMethodCode =
  "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "UNKNOWN";

export interface ReportDay {
  date: string;
  revenue: number;
  orders: number;
  tables: number;
  serviceFee: number;
  cancellations: number;
  payments: Partial<Record<PaymentMethodCode, number>>;
  /** Ranking por produto (productId), com o nome atual do produto. */
  products: { productId: string; name: string; quantity: number }[];
}

export interface ReportQuery {
  start: string;
  end: string;
  /**
   * Obsoleto: os dias são dias de operação (fuso e virada de restaurant_settings).
   * Continua aceito para não quebrar clientes antigos, mas é ignorado.
   */
  tzOffset?: number;
}

/** Dia em construção: valores em centavos para somar sem erro de arredondamento. */
type Bucket = Omit<ReportDay, "revenue" | "serviceFee" | "products"> & {
  ranking: Map<bigint, { name: string; quantity: number }>;
  revenueCents: number;
  feeCents: number;
};

const cents = (value: { toString(): string }) =>
  Math.round(Number(value.toString()) * 100);

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);

/**
 * Relatório de vendas por DIA DE OPERAÇÃO (fuso + virada de restaurant_settings,
 * a mesma regra do número do pedido). O histórico vem de atendimentos fechados,
 * pedidos e pagamentos (regra 21): não há tabela de vendas. A conta pertence ao
 * dia de operação em que foi fechada; o cancelamento, ao dia do pedido.
 */
export class ReportService {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}

  async getReport({ start, end }: ReportQuery) {
    const length =
      Math.round(
        (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
          DAY,
      ) + 1;
    if (length < 1) {
      throw new AppError(
        "A data inicial deve ser anterior ou igual à final.",
        400,
      );
    }
    if (length > MAX_DAYS) {
      throw new AppError(`Selecione no máximo ${MAX_DAYS} dias.`, 400);
    }

    const settings = await this.prismaClient.restaurantSettings.findUnique({
      where: { id: 1 },
      select: { timezone: true, dayCutoffHour: true },
    });
    const rules = {
      timezone: settings?.timezone ?? "America/Sao_Paulo",
      cutoffHour: settings?.dayCutoffHour ?? 5,
    };

    // Período anterior de mesmo tamanho, base das variações percentuais.
    const [days, previous, activeCategories] = await Promise.all([
      this.aggregate(start, length, rules),
      this.aggregate(addDays(start, -length), length, rules),
      this.prismaClient.category.count({ where: { active: true } }),
    ]);

    const sum = (list: ReportDay[], key: "revenue" | "orders" | "tables") =>
      list.reduce((total, day) => total + day[key], 0);
    return {
      start,
      end,
      days,
      previous: {
        revenue: sum(previous, "revenue"),
        orders: sum(previous, "orders"),
        tables: sum(previous, "tables"),
      },
      activeCategories,
    };
  }

  private async aggregate(
    start: string,
    length: number,
    rules: { timezone: string; cutoffHour: number },
  ) {
    const end = addDays(start, length - 1);
    // Janela larga em UTC (fuso até ±14 h + virada até 23 h); o dia exato sai de toBusinessDate.
    const from = new Date(Date.parse(`${start}T00:00:00Z`) - DAY);
    const to = new Date(Date.parse(`${end}T00:00:00Z`) + 3 * DAY);
    const [attendances, cancelled] = await Promise.all([
      this.prismaClient.attendance.findMany({
        where: { status: "CLOSED", closedAt: { gte: from, lt: to } },
        select: {
          closedAt: true,
          serviceFee: true,
          payments: {
            where: { status: "PAID" },
            select: { amount: true, method: true },
          },
          orders: {
            where: { status: { not: "CANCELLED" } },
            select: {
              items: {
                select: {
                  quantity: true,
                  productId: true,
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      this.prismaClient.order.findMany({
        where: {
          status: "CANCELLED",
          businessDate: {
            gte: new Date(`${start}T00:00:00Z`),
            lte: new Date(`${end}T00:00:00Z`),
          },
        },
        select: { businessDate: true },
      }),
    ]);

    // Todos os dias do intervalo aparecem, inclusive os sem venda.
    const byDay = new Map<string, Bucket>();
    for (let index = 0; index < length; index++) {
      const date = addDays(start, index);
      byDay.set(date, {
        date,
        orders: 0,
        tables: 0,
        cancellations: 0,
        payments: {},
        ranking: new Map(),
        revenueCents: 0,
        feeCents: 0,
      });
    }

    for (const attendance of attendances) {
      const day = byDay.get(
        toBusinessDate(attendance.closedAt!, rules.timezone, rules.cutoffHour),
      );
      if (!day) continue;
      day.tables += 1;
      day.orders += attendance.orders.length;
      day.feeCents += cents(attendance.serviceFee);
      for (const payment of attendance.payments) {
        const value = cents(payment.amount);
        day.revenueCents += value;
        const method = payment.method ?? "UNKNOWN";
        day.payments[method] = (day.payments[method] ?? 0) + value / 100;
      }
      for (const order of attendance.orders) {
        for (const item of order.items) {
          const entry = day.ranking.get(item.productId);
          if (entry) entry.quantity += item.quantity;
          else
            day.ranking.set(item.productId, {
              name: item.product.name,
              quantity: item.quantity,
            });
        }
      }
    }
    for (const order of cancelled) {
      const day = byDay.get(order.businessDate.toISOString().slice(0, 10));
      if (day) day.cancellations += 1;
    }

    return [...byDay.values()].map(
      ({ ranking, revenueCents, feeCents, ...day }): ReportDay => ({
        ...day,
        // Receita líquida da taxa de serviço (regra 22): a taxa é do
        // garçom/equipe e já aparece em serviceFee.
        revenue: (revenueCents - feeCents) / 100,
        serviceFee: feeCents / 100,
        products: [...ranking]
          .map(([productId, { name, quantity }]) => ({
            productId: productId.toString(),
            name,
            quantity,
          }))
          .sort((a, b) => b.quantity - a.quantity),
      }),
    );
  }
}
