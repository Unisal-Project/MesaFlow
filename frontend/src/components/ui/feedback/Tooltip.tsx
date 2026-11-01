import type { ReactNode } from "react";
type TooltipProps = { label: string; children: ReactNode };
/** O CSS existente exibe a dica usando o atributo `data-tooltip`. */
export function Tooltip({ label, children }: TooltipProps) {
  return <span className="tooltip-demo" data-tooltip={label}>{children}</span>;
}
