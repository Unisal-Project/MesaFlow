import { QuantitySelector, TextAreaField } from "@/components";
import { formatPrice } from "@/utils/formatPrice";
import type { CartItemProps } from "../types/cart.types";

export function CartItem({ line, maxQuantity, onUpdateQuantity, onUpdateNotes, onSplitLine, onRemove }: CartItemProps) {
  const unitPrice = Number(line.product.price);
  return (
    <li className="cart-line">
      <div className="cart-line-overview">
        {line.product.imageUrl ? <img className="cart-line-photo" src={line.product.imageUrl} alt={line.product.name} /> : <div className="cart-line-photo" aria-hidden="true" />}
        <div className="cart-line-body">
          <h2>{line.product.name}</h2>
          <p className="cart-line-notes">{line.notes || "Sem observações"}</p>
          <span className="cart-line-quantity">Qtd. {line.quantity}</span>
          <div className="cart-line-actions"><strong>{formatPrice(unitPrice * line.quantity)}</strong>
            <button type="button" className="cart-remove-button" aria-label={`Remover ${line.product.name}`} onClick={() => onRemove(line.id)}>Remover</button>
          </div>
        </div>
      </div>
      <details className="cart-line-editor">
        <summary>Editar item</summary>
        <div className="cart-line-edit-content">
          <TextAreaField id={`cart-notes-${line.id}`} label="Observações" placeholder="Sem observações" value={line.notes} onChange={(event) => onUpdateNotes(line.id, event.target.value)} rows={2} />
          <div className="cart-line-edit-quantity"><span>Quantidade</span><QuantitySelector value={line.quantity} onChange={(quantity) => onUpdateQuantity(line.id, quantity)} min={1} max={maxQuantity} /></div>
          {line.quantity > 1 && <button type="button" className="cart-split-button" onClick={() => onSplitLine(line.id)}>Usar observação diferente para cada unidade</button>}
          <p className="cart-unit-price">{formatPrice(unitPrice)} por unidade</p>
        </div>
      </details>
    </li>
  );
}
