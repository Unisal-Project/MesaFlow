import { formatPrice } from "@/utils/formatPrice";

import type { CartSummaryProps } from "../types/cart.types";

export function CartSummary({ subtotal, serviceFee, total, children }: CartSummaryProps) {
  return (
    <div className="cart-summary">
      <div className="summary-row">
        <span>Subtotal</span>
        <strong>{formatPrice(subtotal)}</strong>
      </div>

      <div className="summary-row">
        <span>Taxa de serviço</span>
        <strong>{formatPrice(serviceFee)}</strong>
      </div>

      <div className="summary-row total">
        <span>Total</span>
        <strong>{formatPrice(total)}</strong>
      </div>
      {children}
    </div>
  );
}