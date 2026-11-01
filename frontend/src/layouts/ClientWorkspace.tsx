import { Outlet } from "react-router";
import { useDocumentClass } from "@/hooks/useDocumentClass";
import "./clientWorkspace.scss";

export function ClientWorkspace() {
  useDocumentClass("client-workspace-active");
  return (
    <div className="client-workspace">
      <Outlet />
    </div>
  );
}
