import type { ComponentProps } from "react";
import { ClientHeader } from "./ClientHeader";
import { useClientTable } from "@/contexts/ClientTableContext";

export function ClientTableHeader(props: Omit<ComponentProps<typeof ClientHeader>, "title" | "subtitle">) {
  const { tableLabel, guestName } = useClientTable();
  return <ClientHeader {...props} title={tableLabel} subtitle={guestName.trim() || undefined} />;
}
