import type { CartLine } from "@/contexts/CartContext";
import { formatPrice } from "@/utils/formatPrice";
import { unitPrice } from "@/services/menu.service";

type OrderReviewCardProps = {
  items: CartLine[];
  total: number;
};

export function OrderReviewCard({ items, total }: OrderReviewCardProps) {
  return <section className="confirm-review-card" aria-labelledby="confirm-review-title">
    <h2 id="confirm-review-title">Resumo do pedido</h2>
    <p>Revise os itens antes de enviar.</p>
    <ul>{items.map((line) => <li key={line.id}>
      <div><strong>{line.quantity}x {line.product.name}</strong>{line.notes && <span>{line.notes}</span>}</div>
      <strong>{formatPrice(unitPrice(line.product) * line.quantity)}</strong>
    </li>)}</ul>
    <div className="confirm-review-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
  </section>;
}
