import type { ComponentProps } from "react";
import { RestaurantInfo } from "./RestaurantInfo";
import { ClientHeader } from "./ClientHeader";
import { useClientTable } from "@/contexts/ClientTableContext";
import { usePublicRestaurantSettings } from "@/contexts/restaurant-settings";

export function ClientTableHeader(props: Omit<ComponentProps<typeof ClientHeader>, "title" | "subtitle" | "cartAction">) {
  const { tableLabel, guestName } = useClientTable();
  const settings = usePublicRestaurantSettings();
  const title = tableLabel === "MesaFlow" ? settings?.name?.trim() || "MesaFlow" : tableLabel;
  return <ClientHeader {...props} cartAction={<RestaurantInfo details={settings ?? undefined} />} title={title} subtitle={guestName.trim() || undefined} />;
}
