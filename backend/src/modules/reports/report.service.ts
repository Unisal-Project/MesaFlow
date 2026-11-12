import { PrismaConnector } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-errors.js";

const DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS = 366;

export type PaymentMethodCode = "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD";

export interface ReportDay {
  date: string;
  revenue: number;
  orders: number;
  tables: number;
  serviceFee: number;
  cancellations: number;
  payments: Partial<Record<PaymentMethodCode, number>>;
  products: { name: string; quantity: number }[];
}

export interface ReportQuery {
  start: string;
  end: string;
  /** Minutos de Date#getTimezoneOffset do navegador (Brasil: 180). */
  tzOffset: number;
}

/** Dia em construção: valores em centavos para somar sem erro de arredondamento. */
type Bucket = Omit<ReportDay, "revenue" | "serviceFee" | "products"> & {
  ranking: Map<string, number>;
  revenueCents: number;
  feeCents: number;
};

const cents = (value: { toString(): string }) =>
  Math.round(Number(value.toString()) * 100);

/**
 * Relatório de vendas por dia local. O histórico vem de atendimentos
 * fechados, pedidos e pagamentos (regra 21): não há tabela de vendas.
 */
export class ReportService {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}

  async getReport({ start, end, tzOffset }: ReportQuery) {
    const from = this.localMidnight(start, tzOffset);
    const to = new Date(this.localMidnight(end, tzOffset).getTime() + DAY);
    const length = Math.round((to.getTime() - from.getTime()) / DAY);
    if (length < 1) {
      throw new AppError(
        "A data inicial deve ser anterior ou igual à final.",
        400,
      );
    }
    if (length > MAX_DAYS) {
      throw new AppError(`Selecione no máximo ${MAX_DAYS} dias.`, 400);
    }

    // Período anterior de mesmo tamanho, base das variações percentuais.
    const previousFrom = new Date(from.getTime() - length * DAY);
    const [days, previous, activeCategories] = await Promise.all([
      this.aggregate(from, to, tzOffset),
      this.aggregate(previousFrom, from, tzOffset),
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

  private localMidnight(date: string, tzOffset: number) {
    // Meia-noite local = meia-noite UTC do mesmo dia + deslocamento do fuso.
    return new Date(Date.parse(`${date}T00:00:00Z`) + tzOffset * 60_000);
  }

  private dayKey(date: Date, tzOffset: number) {
    return new Date(date.getTime() - tzOffset * 60_000)
      .toISOString()
      .slice(0, 10);
  }

  private async aggregate(from: Date, to: Date, tzOffset: number) {
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
                select: { quantity: true, product: { select: { name: true } } },
              },
            },
          },
        },
      }),
      this.prismaClient.order.findMany({
        where: { status: "CANCELLED", cancelledAt: { gte: from, lt: to } },
        select: { cancelledAt: true },
      }),
    ]);

    // Todos os dias do intervalo aparecem, inclusive os sem venda.
    const byDay = new Map<string, Bucket>();
    for (let time = from.getTime(); time < to.getTime(); time += DAY) {
      const date = this.dayKey(new Date(time), tzOffset);
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
      const day = byDay.get(this.dayKey(attendance.closedAt!, tzOffset));
      if (!day) continue;
      day.tables += 1;
      day.orders += attendance.orders.length;
      day.feeCents += cents(attendance.serviceFee);
      for (const payment of attendance.payments) {
        const value = cents(payment.amount);
        day.revenueCents += value;
        const method = payment.method ?? "CASH";
        day.payments[method] = (day.payments[method] ?? 0) + value / 100;
      }
      for (const order of attendance.orders) {
        for (const item of order.items) {
          const name = item.product.name;
          day.ranking.set(name, (day.ranking.get(name) ?? 0) + item.quantity);
        }
      }
    }
    for (const order of cancelled) {
      const day = byDay.get(this.dayKey(order.cancelledAt!, tzOffset));
      if (day) day.cancellations += 1;
    }

    return [...byDay.values()].map(
      ({ ranking, revenueCents, feeCents, ...day }): ReportDay => ({
        ...day,
        revenue: revenueCents / 100,
        serviceFee: feeCents / 100,
        products: [...ranking]
          .map(([name, quantity]) => ({ name, quantity }))
          .sort((a, b) => b.quantity - a.quantity),
      }),
    );
  }
}
