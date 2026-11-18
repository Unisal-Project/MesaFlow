import type { Order } from "../../Order/types/order.types";
import { sortOrders } from "../../Order/utils/order.utils";
import type { RestaurantTable } from "../types/table.types";

export function findActiveTableOrder(table: RestaurantTable, orders: Order[]) {
  if (table.status === "available" || !table.attendanceId) return undefined;
  return sortOrders(
    orders.filter(
      (order) =>
        order.status !== "closed" &&
        order.tableId === table.id &&
        (order.attendanceId === undefined ||
          order.attendanceId === table.attendanceId),
    ),
    "newest",
  )[0];
}

export type QrTable = Pick<RestaurantTable, "number" | "menuUrl">;

export const qrLabel = (number: string | number) =>
  `Mesa ${String(number).padStart(2, "0")}`;

/** Copia o QR para um canvas novo com o rótulo escrito embaixo. */
export function withLabel(qr: HTMLCanvasElement, label: string) {
  const band = 48;
  const out = document.createElement("canvas");
  out.width = qr.width;
  out.height = qr.height + band;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(qr, 0, 0);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, out.width / 2, qr.height + band / 2);
  return out;
}

/** Tempo desde a abertura: "Há 45 min" até 59 min; depois "Há 6 h 05". */
export function formatElapsed(minutes: number) {
  const total = Math.max(0, Math.floor(minutes));
  if (total < 60) return `Há ${total} min`;
  return `Há ${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")}`;
}
