import { Button, Radio, SystemMessage } from "@/components";
import { Trash } from "lucide-react";
import { useState } from "react";

import type { AdminProduct } from "../../Products/types/product.types";
import type { Category, CategoryProductMove } from "../types/category.types";

type DeleteCategoryModalProps = {
  category: Category | null;
  /** Todas as categorias; a própria é removida das opções de destino. */
  categories: { id: string; name: string }[];
  /** Produtos visíveis (ativos) cuja categoria principal é a excluída. */
  products: AdminProduct[];
  onClose: () => void;
  onConfirm: (moveTo?: string, moves?: CategoryProductMove[], deleteProducts?: boolean) => void;
  error?: string;
  busy?: boolean;
};

export function DeleteCategoryModal({
  category,
  categories,
  products,
  onClose,
  onConfirm,
  error,
  busy,
}: DeleteCategoryModalProps) {
  const options = categories.filter((item) => item.id !== category?.id);
  const [mode, setMode] = useState(options.length ? "move" : "delete");
  const [moveAll, setMoveAll] = useState("");
  const [targets, setTargets] = useState<Record<string, string>>({});
  if (!category) return null;

  const hasProducts = products.length > 0;
  const ready = products.every((product) => targets[product.id]);

  const warning = `⚠️ Atenção: ${products.length === 1 ? "o 1 produto desta categoria será excluído" : `os ${products.length} produtos desta categoria serão excluídos`} do cardápio. O histórico de pedidos e os relatórios são mantidos. Esta ação não pode ser desfeita.`;
  const confirm = () => {
    if (busy) return;
    if (!hasProducts) return onConfirm();
    if (mode === "delete") {
      if (window.confirm(warning)) onConfirm(undefined, [], true);
      return;
    }
    if (!ready) return;
    onConfirm(moveAll || targets[products[0].id], products.map(product => ({ product, categoryId: targets[product.id] })));
  };

  return (
    <div
      className="category-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="category-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-category-title"
        aria-describedby="delete-category-description"
      >
        <div className="category-delete-dialog-icon" aria-hidden="true">
          <Trash />
        </div>

        <h2 id="delete-category-title">Excluir categoria?</h2>

        <p id="delete-category-description">
          {hasProducts
            ? `“${category.name}” tem ${products.length} ${products.length === 1 ? "produto" : "produtos"}. Escolha mover ou excluir os produtos do cardápio.`
            : `“${category.name}” será excluída.`}
        </p>

        {hasProducts && <fieldset className="category-delete-modes"><legend>O que fazer com os produtos?</legend>
          <Radio name="category-delete-mode" label="Mover os produtos para…" checked={mode === "move"} disabled={busy || !options.length} onChange={() => setMode("move")} />
          <Radio name="category-delete-mode" label="Excluir a categoria e os produtos dela" checked={mode === "delete"} disabled={busy} onChange={() => setMode("delete")} />
        </fieldset>}
        {hasProducts && mode === "delete" && <SystemMessage variant="warning">{warning}</SystemMessage>}

        {hasProducts && mode === "move" && options.length > 0 && (
          <div className="category-delete-moves">
            <label>
              <span>Mover todos para…</span>
              <select
                value={moveAll}
                onChange={(event) => {
                  const id = event.target.value;
                  setMoveAll(id);
                  setTargets(
                    Object.fromEntries(products.map((p) => [p.id, id])),
                  );
                }}
              >
                <option value="">Selecione</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <ul>
              {products.map((product) => (
                <li key={product.id}>
                  <label>
                    <span>{product.name}</span>
                    <select
                      aria-label={`Nova categoria de ${product.name}`}
                      value={targets[product.id] ?? ""}
                      onChange={(event) =>
                        setTargets((current) => ({
                          ...current,
                          [product.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p role="alert">{error}</p>}

        <footer>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            type="button"
            variant="danger"
            loading={busy}
            disabled={hasProducts && mode === "move" && (!options.length || !ready)}
            onClick={confirm}
          >
            {hasProducts ? mode === "delete" ? "Excluir categoria e produtos" : "Mover e excluir" : "Excluir"}
          </Button>
        </footer>
      </section>
    </div>
  );
}
