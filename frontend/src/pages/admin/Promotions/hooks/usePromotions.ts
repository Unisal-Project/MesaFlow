import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  applyPromotions,
  fetchCategories,
  fetchProducts,
  type Category,
  type Product,
} from "@/services/menu.service";
import {
  emptyPromoForm,
  toPromoInput,
  type PromoForm,
} from "@/utils/promotion";
import { promotionStatus } from "../promotionStatus";

const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Não foi possível acessar o servidor";

/** Chave de seleção: produto e categoria podem ter o mesmo id. */
export type ItemKey = `p:${string}` | `c:${string}`;

export function usePromotions() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<ItemKey[]>([]);
  const [form, setForm] = useState<PromoForm>({
    ...emptyPromoForm,
    promoActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error || notice)
      feedbackRef.current?.scrollIntoView({ block: "center" });
  }, [error, notice]);

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      const [productList, categoryList] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);
      setProducts(productList);
      setCategories(categoryList);
    } catch (err) {
      setLoadError(message(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  const toggle = (key: ItemKey) => {
    setNotice("");
    setError("");
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const selectAll = (keys: ItemKey[]) => {
    setNotice("");
    setError("");
    setSelected((current) => [...new Set([...current, ...keys])]);
  };

  const ids = (prefix: "p:" | "c:") =>
    selected.filter((key) => key.startsWith(prefix)).map((key) => key.slice(2));

  // Itens selecionados que já têm promoção própria: "Aplicar" sobrescreve.
  const replacedCount =
    products.filter(
      (item) => selected.includes(`p:${item.id}`) && promotionStatus(item),
    ).length +
    categories.filter(
      (item) => selected.includes(`c:${item.id}`) && promotionStatus(item),
    ).length;

  async function send(
    body: Parameters<typeof applyPromotions>[0],
    done: string,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await applyPromotions(body);
      const count = result.products + result.categories;
      setNotice(`${done} ${count} ${count === 1 ? "item" : "itens"}.`);
      setPanelOpen(false);
      setSelected([]);
      await reload();
    } catch (err) {
      // O backend grava tudo ou nada; a mensagem dele explica o motivo.
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (error) feedbackRef.current?.scrollIntoView({ block: "center" });
    if (!selected.length)
      return setError("Selecione ao menos um produto ou categoria.");
    // Sem tipo/valor o lote gravaria nulos e APAGARIA as promoções selecionadas;
    // para desligar existe "Pausar", que preserva a configuração.
    if (!form.promoType || !form.promoValue.trim()) {
      setError("Informe o desconto.");
      if (typeof document !== "undefined")
        document.getElementById("promotions-promo-value")?.focus();
      return;
    }
    if (
      event.currentTarget?.reportValidity &&
      !event.currentTarget.reportValidity()
    )
      return;
    void send(
      {
        productIds: ids("p:"),
        categoryIds: ids("c:"),
        // Desconto em R$ aceita vírgula.
        ...toPromoInput({
          ...form,
          promoActive: true,
          promoValue: form.promoValue.trim().replace(",", "."),
        }),
      },
      "Promoção aplicada a",
    );
  };

  const pause = () => {
    if (error) feedbackRef.current?.scrollIntoView({ block: "center" });
    if (!selected.length)
      return setError("Selecione ao menos um produto ou categoria.");
    void send(
      { productIds: ids("p:"), categoryIds: ids("c:"), promoActive: false },
      "Promoção pausada a",
    );
  };

  const removePromotion = () => {
    if (busy || !replacedCount) return;
    if (
      !window.confirm(
        `Remover a promoção de ${replacedCount} ${replacedCount === 1 ? "item" : "itens"}? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    void send(
      {
        productIds: products
          .filter(
            (item) =>
              selected.includes(`p:${item.id}`) && promotionStatus(item),
          )
          .map((item) => item.id),
        categoryIds: categories
          .filter(
            (item) =>
              selected.includes(`c:${item.id}`) && promotionStatus(item),
          )
          .map((item) => item.id),
        promoActive: false,
        promoType: null,
        promoValue: null,
        promoStartsAt: null,
        promoEndsAt: null,
      },
      "Promoção removida de",
    );
  };

  const selectedItems = [
    ...products.filter((item) => selected.includes(`p:${item.id}`)),
    ...categories.filter((item) => selected.includes(`c:${item.id}`)),
  ];
  const saved = selectedItems[0];
  const now = new Date();
  const hasExpired = selectedItems.some(
    (item) =>
      promotionStatus(item, now) === "paused" &&
      !!item.promoEndsAt &&
      new Date(item.promoEndsAt) <= now,
  );
  const allPaused =
    selectedItems.length === selected.length &&
    !!saved &&
    !hasExpired &&
    selectedItems.every((item) => promotionStatus(item, now) === "paused");
  const sameValues =
    !!saved &&
    selectedItems.every(
      (item) =>
        item.promoType === saved.promoType &&
        Number(item.promoValue) === Number(saved.promoValue) &&
        (item.promoStartsAt ?? null) === (saved.promoStartsAt ?? null) &&
        (item.promoEndsAt ?? null) === (saved.promoEndsAt ?? null),
    );
  const canResume = allPaused && sameValues;
  const resumeHint = hasExpired
    ? "Promoção encerrada: defina novas datas"
    : allPaused && !sameValues
      ? "Retome um item por vez"
      : "";
  const resume = () => {
    if (!canResume) return;
    void send(
      {
        productIds: ids("p:"),
        categoryIds: ids("c:"),
        promoActive: true,
        promoType: saved.promoType!,
        promoValue: Number(saved.promoValue),
        promoStartsAt: saved.promoStartsAt ?? null,
        promoEndsAt: saved.promoEndsAt ?? null,
      },
      "Promoção retomada a",
    );
  };

  return {
    panelOpen,
    openPanel: () => {
      setError("");
      setNotice("");
      setPanelOpen(true);
    },
    closePanel: () => {
      setPanelOpen(false);
      setError("");
    },
    canResume,
    resumeHint,
    resume,
    loadError,
    products,
    categories,
    selected,
    toggle,
    selectAll,
    clearSelection: () => {
      setSelected([]);
      setNotice("");
      setError("");
    },
    feedbackRef,
    form,
    setForm,
    replacedCount,
    apply,
    pause,
    removePromotion,
    loading,
    busy,
    error,
    notice,
    reload,
  };
}
