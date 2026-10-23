import { AnimatedTrash } from "@/components/ui/icons/AnimatedTrash";
import { Pencil, Tag } from "lucide-react";
import { Button, Switch } from "@/components";


import type { Category } from "../types/category.types";

type CategoryRowProps = {
  category: Category;
  onStatusChange: (categoryId: number, active: boolean) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

export function CategoryRow({
  category,
  onStatusChange,
  onEdit,
  onDelete,
}: CategoryRowProps) {
  return (
    <article className="category-row">
      <div className="category-identity">
        <span className={`category-mark${category.active ? "" : " is-inactive"}`} aria-hidden="true">
          <Tag />
        </span>

        <div>
          <h3>{category.name}</h3>
          <p>{category.description}</p>
        </div>
      </div>

      <div className="category-product-count">
        <strong>{category.productCount}</strong>
        <span>
          {category.productCount === 1 ? "produto" : "produtos"}
        </span>
      </div>

      <div className="category-controls">
        <Switch
          className={`category-status ${
            category.active ? "is-active" : "is-inactive"
          }`}
          aria-label={`Disponibilidade da categoria ${category.name}`}
          label={category.active ? "Ativa" : "Inativa"}
          checked={category.active}
          onChange={(event) =>
            onStatusChange(category.id, event.target.checked)
          }
        />

        <Button
          variant="secondary"
          size="small"
          aria-label={`Editar ${category.name}`}
          onClick={() => onEdit(category)}
        >
          Editar <Pencil aria-hidden="true" />
        </Button>

        <button
          type="button"
          className="category-delete-button"
          aria-label={`Excluir ${category.name}`}
          onClick={() => onDelete(category)}
        >
          <AnimatedTrash />
        </button>
      </div>
    </article>
  );
}