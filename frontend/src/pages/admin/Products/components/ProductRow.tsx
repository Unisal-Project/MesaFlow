import { AnimatedTrash } from "@/components/ui/icons/AnimatedTrash";
import { Button, Switch, TextField } from "@/components";

import { Pencil } from "lucide-react";

import type { MockProduct } from "../types/product.types";

type ProductRowProps = {
  product: MockProduct;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onUpdateAvailability: (productId: number, available: boolean) => void;
  onEdit: (product: MockProduct) => void;
  onDelete: (product: MockProduct) => void;
};

export function ProductRow({
  product,
  onUpdateQuantity,
  onUpdateAvailability,
  onEdit,
  onDelete,
}: ProductRowProps) {
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

      <strong className="product-price">{product.price}</strong>

      <div className="product-controls">
        <TextField
          className="product-quantity"
          id={`product-quantity-${product.id}`}
          label="Estoque"
          aria-label={`Estoque de ${product.name}`}
          type="number"
          min={0}
          value={product.quantity}
          onChange={(event) =>
            onUpdateQuantity(
              product.id,
              Math.max(0, Number(event.target.value)),
            )
          }
        />

        <Switch
          className={`product-status ${
            product.available ? "is-active" : "is-inactive"
          }`}
          aria-label={`Disponibilidade de ${product.name}`}
          label={product.available ? "Ativo" : "Inativo"}
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