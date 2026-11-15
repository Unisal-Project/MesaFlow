import { useState } from "react";
import { AnimatedTrash } from "@/components/ui/icons/AnimatedTrash";
import { Badge, Button, Switch, TextField } from "@/components";
import { promotionLabel } from "@/utils/promotion";

import { Pencil } from "lucide-react";

import type { AdminProduct } from "../types/product.types";

type ProductRowProps = {
  product: AdminProduct;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateAvailability: (productId: string, available: boolean) => void;
  onEdit: (product: AdminProduct) => void;
  onDelete: (product: AdminProduct) => void;
};

export function ProductRow({
  product,
  onUpdateQuantity,
  onUpdateAvailability,
  onEdit,
  onDelete,
}: ProductRowProps) {
  // Texto em edição; vazio não é salvo e volta ao valor gravado ao sair do campo.
  const [draft, setDraft] = useState<string | null>(null);
  const step = (delta: number) => {
    setDraft(null);
    onUpdateQuantity(product.id, Math.max(0, product.quantity + delta));
  };
  return (
    <article className="product-row">
      <div className="product-identity">
        <span className="product-initial" aria-hidden="true">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" />
          ) : (
            product.name.charAt(0)
          )}
        </span>

        <div>
          <h3>{product.name}</h3>
          <p>{product.category}</p>
        </div>
      </div>

      <strong className="product-price">
        {product.promotion && (
          <s className="product-card-old-price">{product.price}</s>
        )}
        <span>{product.finalPrice}</span>
        {product.promotion && (
          <Badge variant="success">{promotionLabel(product.promotion)}</Badge>
        )}
      </strong>

      <div className="product-controls">
        {product.trackStock ? (
          <div className="product-stock">
            <button
              type="button"
              className="product-stock-step"
              aria-label={`Diminuir estoque de ${product.name}`}
              disabled={product.quantity <= 0}
              onClick={() => step(-1)}
            >
              −
            </button>
            <TextField
              className="product-quantity"
              id={`product-quantity-${product.id}`}
              label="Estoque"
              aria-label={`Estoque de ${product.name}`}
              type="number"
              inputMode="numeric"
              min={0}
              value={draft ?? product.quantity}
              onChange={(event) => {
                setDraft(event.target.value);
                if (event.target.value !== "")
                  onUpdateQuantity(
                    product.id,
                    Math.max(0, Number(event.target.value)),
                  );
              }}
              onBlur={() => setDraft(null)}
            />
            <button
              type="button"
              className="product-stock-step"
              aria-label={`Aumentar estoque de ${product.name}`}
              onClick={() => step(1)}
            >
              +
            </button>
          </div>
        ) : (
          <span className="product-quantity product-quantity--untracked">
            Sem controle
          </span>
        )}

        <Switch
          className={`product-status ${
            product.available ? "is-active" : "is-inactive"
          }`}
          aria-label={`Disponibilidade de ${product.name}`}
          label={product.available ? "Disponível" : "Indisponível"}
          checked={product.available}
          onChange={(event) =>
            onUpdateAvailability(product.id, event.target.checked)
          }
        />

        <Button
          variant="secondary"
          size="small"
          aria-label={`Editar ${product.name}`}
          onClick={() => onEdit(product)}
        >
          Editar <Pencil aria-hidden="true" />
        </Button>

        <button
          type="button"
          className="product-delete-button"
          aria-label={`Excluir ${product.name}`}
          onClick={() => onDelete(product)}
        >
          <AnimatedTrash />
        </button>
      </div>
    </article>
  );
}