import { classNames } from "../shared/classNames";
export type TableStatusVariant = "free" | "occupied" | "payment";
type TableStatusProps = { variant: TableStatusVariant; children: string };
export function TableStatus({ variant, children }: TableStatusProps) {
  return <div className={classNames("table-chip", variant)}>{children}</div>;
}
