import type { ReactNode } from "react";
type CartItemProps = { name: string; details: string; subtotal: string; image?: ReactNode; action?: ReactNode };
export function CartItem({ name, details, subtotal, image, action }: CartItemProps) {
  return <article className="cart-item">{image ?? <div className="thumb" aria-hidden="true" />}<div><h3>{name}</h3><p>{details}</p><strong>Subtotal {subtotal}</strong></div>{action}</article>;
}
