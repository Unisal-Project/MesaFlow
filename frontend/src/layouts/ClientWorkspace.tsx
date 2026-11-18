import { Outlet } from "react-router";
import { useDocumentClass } from "@/hooks/useDocumentClass";
import { RestaurantSettingsProvider } from "@/contexts/RestaurantSettingsProvider";
import "./clientWorkspace.scss";

export function ClientWorkspace() {
  useDocumentClass("client-workspace-active");
  return (
    <div className="client-workspace">
      <RestaurantSettingsProvider><Outlet /></RestaurantSettingsProvider>
    </div>
  );
}
