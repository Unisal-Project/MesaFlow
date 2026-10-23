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
