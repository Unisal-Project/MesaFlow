import { Outlet } from "react-router";
import { useDocumentClass } from "./hooks/useDocumentClass";
import "./adminWorkspace.scss";

export function AdminWorkspace() {
  useDocumentClass("admin-workspace-active");
  return <Outlet />;
}
