import { Badge } from "@/components/ui/status";
import { classNames } from "@/utils/classNames";
import type { ReactNode } from "react";

type ProductCardProps = {
  name: string;
  description: string;
  price: string;
  image?: ReactNode;
  available?: boolean;
  onSelect?: () => void;
  variant?: "default" | "featured";
};

export function ProductCard({
  name,
  description,
  price,
  image,
  available = true,
  onSelect,
  variant = "default",
}: ProductCardProps) {
  return (
    <article className={classNames("product-card", variant === "featured" && "product-card--featured", !available && "indisponivel")}>
      {available && onSelect && (
        <button
          type="button"
          className="product-card-select"
          aria-label={`Ver item: ${name}`}
          onClick={onSelect}
        />
      )}
      {image ?? <div className="food-photo" aria-hidden="true" />}
      <div className="card-body">
        <h3>{name}</h3>
        <p>{description}</p>
        <div className="card-actions">
          <strong>{price}</strong>
          {!available && <Badge variant="error">Indisponível</Badge>}
        </div>
      </div>
    </article>
  );
}
