import type { ComponentProps } from "react";
import { RestaurantInfo } from "./RestaurantInfo";
import { ClientHeader } from "./ClientHeader";
import { useClientTable } from "@/contexts/ClientTableContext";

export function ClientTableHeader(props: Omit<ComponentProps<typeof ClientHeader>, "title" | "subtitle" | "cartAction">) {
  const { tableLabel, guestName } = useClientTable();
  return <ClientHeader {...props} cartAction={<RestaurantInfo />} title={tableLabel} subtitle={guestName.trim() || undefined} />;
}
