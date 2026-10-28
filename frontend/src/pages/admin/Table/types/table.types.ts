import type { ComponentProps } from "react";
import type { useTables } from "../hooks/useTables";
import type { Order } from "../../Order/types/order.types";

import type { TableRecord } from "@/services/tables.service";

export type OrderItem = {
  name: string;
  quantity: number;
  price: string;
};

export type RestaurantTable = Omit<TableRecord, "name"> & {
  name: string;
  seats?: number;
  people?: number;
  openedAt?: string;
  closingRequestedAt?: string;
  orderValue?: string;
  order?: OrderItem[];
};

export type TableForm = {
  name: string;
  number: string;
  seats: string;
  active: boolean;
};

export type TablesProps = {
  state: ReturnType<typeof useTables>;
  orders: Order[];
  onViewOrder: (orderId: number) => void;
  onNavigate?: (id: string) => void;
};

export type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];