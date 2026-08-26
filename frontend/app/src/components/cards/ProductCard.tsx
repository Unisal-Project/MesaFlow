import { Button } from "../buttons";
import type { ReactNode } from "react";
type ProductCardProps = { name: string; description: string; price: string; image?: ReactNode; onAdd?: () => void };
export function ProductCard({ name, description, price, image, onAdd }: ProductCardProps) {
  return <article className="product-card">{image ?? <div className="food-photo" aria-hidden="true" />}<div className="card-body"><h3>{name}</h3><p>{description}</p><div className="card-actions"><strong>{price}</strong>{onAdd && <Button size="small" onClick={onAdd}>Adicionar</Button>}</div></div></article>;
}
