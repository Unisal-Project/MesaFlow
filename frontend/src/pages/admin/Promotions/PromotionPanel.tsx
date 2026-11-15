import { useEffect, useRef, useState, type RefObject } from "react";
import { X } from "lucide-react";
import { Button, SystemMessage } from "@/components";
import { emptyPromoForm, previewPrice } from "@/utils/promotion";
import { PromotionFields } from "../Products/components/PromotionFields";
import type { usePromotions } from "./hooks/usePromotions";

const money = (value: string) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PromotionPanel({
  state,
  feedbackRef,
}: {
  state: Omit<ReturnType<typeof usePromotions>, "feedbackRef">;
  feedbackRef: RefObject<HTMLDivElement | null>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [initialForm] = useState(() => state.form);
  const close = () => {
    if (state.busy) return;
    if (
      JSON.stringify(initialForm) === JSON.stringify(state.form) ||
      window.confirm("Descartar alterações?")
    ) {
      state.setForm(initialForm);
      state.closePanel();
    }
  };
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLInputElement>("#promotions-promo-value")?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);
  const preview = state.products.filter(
    (product) =>
      state.selected.includes(`p:${product.id}`) ||
      state.selected.includes(`c:${product.categoryId}`),
  );
  const categorySelected = state.selected.some((key) => key.startsWith("c:"));
  return (
    <dialog
      ref={dialogRef}
      className="product-modal product-form-modal promotions-editor"
      aria-labelledby="promotion-panel-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form onSubmit={state.apply} noValidate>
        <header className="product-modal-heading">
          <h2 id="promotion-panel-title">
            Promoção para {state.selected.length}{" "}
            {state.selected.length === 1 ? "item" : "itens"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            aria-label="Fechar painel"
            disabled={state.busy}
            onClick={() => close()}
          >
            <X aria-hidden="true" />
          </Button>
        </header>
        <div className="promotions-editor-body">
          <PromotionFields
            collapsible={false}
            showActive={false}
            idPrefix="promotions"
            value={state.form}
            onChange={state.setForm}
          />
          <section className="promotions-preview" aria-label="Prévia de preços">
            <h3>Prévia de preços</h3>
            {preview.slice(0, 3).map((product) => {
              const own = state.selected.includes(`p:${product.id}`);
              // Datas não escondem o efeito do desconto na prévia de uma promoção agendada.
              const form = {
                ...state.form,
                promoActive: true,
                promoStartsAt: "",
                promoEndsAt: "",
                promoValue: state.form.promoValue.replace(",", "."),
              };
              const final = own
                ? previewPrice(product.price, form).finalPrice
                : product.promotion?.source === "PRODUCT"
                  ? product.finalPrice
                  : previewPrice(product.price, emptyPromoForm, {
                      ...form,
                      promoStartsAt: null,
                      promoEndsAt: null,
                    }).finalPrice;
              return (
                <p key={product.id}>
                  <strong>{product.name}</strong>
                  <span>
                    {money(product.price)} → {money(final ?? product.price)}
                  </span>
                </p>
              );
            })}
            {preview.length > 3 && <p>e mais {preview.length - 3}</p>}
          </section>
          {state.replacedCount > 0 && (
            <p className="promotions-replace" role="status">
              {state.replacedCount}{" "}
              {state.replacedCount === 1
                ? "item já tem promoção e será substituído"
                : "itens já têm promoção e serão substituídos"}
              .
            </p>
          )}
          {categorySelected && (
            <p>
              Produtos com promoção própria mantêm a deles. A promoção da
              categoria vale também para produtos cadastrados depois.
            </p>
          )}
          <div ref={feedbackRef} className="promotions-feedback">
            {state.error && (
              <SystemMessage variant="error">{state.error}</SystemMessage>
            )}
          </div>
        </div>
        <footer className="product-modal-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={state.busy}
            onClick={() => close()}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={state.busy}>
            Aplicar a {state.selected.length}{" "}
            {state.selected.length === 1 ? "item" : "itens"}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
