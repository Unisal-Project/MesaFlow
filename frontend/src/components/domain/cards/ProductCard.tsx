import { Button } from "@/components";
import { Badge } from "@/components/ui/status";
import { classNames } from "@/utils/classNames";
import type { ReactNode } from "react";

type ProductCardProps = {
  name: string;
  description: string;
  price: string;
  image?: ReactNode;
  available?: boolean;
  onAdd?: () => void;
  actionLabel?: string;
};

export function ProductCard({
  name,
  description,
  price,
  image,
  available = true,
   actionLabel = "Adicionar",
  onAdd,
}: ProductCardProps) {
  return (
    <article className={classNames("product-card", !available && "indisponivel")}>
      {image ?? <div className="food-photo" aria-hidden="true" />}
      <div className="card-body">
        <h3>{name}</h3>
        <p>{description}</p>
        <div className="card-actions">
          <strong>{price}</strong>
          {available
            ? onAdd && (
                <Button size="small" onClick={onAdd}>
                   {actionLabel}
                </Button>
              )
            : <Badge variant="error">Indisponível</Badge>}
        </div>
      </div>
    </article>
  );
}