import { PrismaConnector } from "../../database/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";

type ConfirmationRow = {
  status: string;
  paymentId: bigint | null;
  total: Prisma.Decimal | null;
  paidAt: Date | null;
  tableNumber: number;
  restaurantName: string | null;
  timeZone: string | null;
};

export async function readPaymentConfirmation(attendanceId: bigint) {
  // Uma única leitura mantém conta e pagamentos no mesmo snapshot, inclusive
  // quando uma reabertura ou um novo fechamento ocorre simultaneamente.
  const [row] = await PrismaConnector.$queryRaw<ConfirmationRow[]>`
    SELECT a.status, MIN(p.id) AS paymentId, SUM(p.amount) AS total,
      MAX(p.paid_at) AS paidAt, t.number AS tableNumber,
      s.name AS restaurantName, s.timezone AS timeZone
    FROM attendances a
    JOIN restaurant_tables t ON t.id = a.table_id
    LEFT JOIN restaurant_settings s ON s.id = 1
    LEFT JOIN payments p ON p.attendance_id = a.id AND p.status = 'PAID'
      AND p.paid_at IS NOT NULL AND a.status = 'CLOSED'
    WHERE a.id = ${attendanceId}
    GROUP BY a.status, t.number, s.name, s.timezone
  `;

  if (!row || row.status === "CANCELLED") return { status: "unavailable" };
  if (!row.paymentId || !row.total || !row.paidAt) return { status: "pending" };

  return {
    status: "confirmed",
    event: {
      type: "attendance.payment-confirmed",
      id: `attendance.payment-confirmed:${row.paymentId}`,
      attendanceId: attendanceId.toString(),
      receipt: {
        totalInCents: Math.round(Number(row.total) * 100),
        tableNumber: String(row.tableNumber),
        paidAt: row.paidAt.toISOString(),
        restaurantName: row.restaurantName || "MesaFlow",
        timeZone: row.timeZone || "America/Sao_Paulo",
      },
    },
  };
}
