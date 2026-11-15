import { Badge } from "@/components/ui/status";
import { classNames } from "@/utils/classNames";
import type { ReactNode } from "react";

type ProductCardProps = {
  name: string;
  description: string;
  price: string;
  /** Preço cheio riscado quando há promoção. */
  originalPrice?: string;
  /** Selo da promoção, ex.: "-20%". */
  badge?: string;
  image?: ReactNode;
  available?: boolean;
  unavailableLabel?: string;
  onSelect?: () => void;
  variant?: "default" | "featured";
};

export function ProductCard({
  name,
  description,
  price,
  originalPrice,
  badge,
  image,
  available = true,
  unavailableLabel = "Indisponível",
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
          <strong>
            {originalPrice ? (
              <>
                <s className="product-card-old-price">
                  <span className="sr-only">de </span>
                  {originalPrice}
                </s>{" "}
                <span className="sr-only">por </span>
              </>
            ) : null}
            {price}
          </strong>
          {badge && available && <Badge variant="success">{badge}</Badge>}
          {!available && <Badge variant="error">{unavailableLabel}</Badge>}
        </div>
      </div>
    </article>
  );
}
