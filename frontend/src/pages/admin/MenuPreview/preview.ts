import { adminPaths } from "@/routers/paths";

/** Carrinho isolado da prévia; o do cliente ("mesaflow:cart") nunca é tocado. */
export const PREVIEW_CART_KEY = "mesaflow:cart:admin-preview";

export function resetPreviewCart() {
  try {
    localStorage.removeItem(PREVIEW_CART_KEY);
  } catch {
    // Sem armazenamento a prévia continua funcionando.
  }
}

/** Destinos das abas do cliente ("menu" | "order" | "bill") dentro da prévia. */
export function previewTarget(destination: string, searchParams: URLSearchParams) {
  const paths: Record<string, string> = {
    order: adminPaths.menuPreviewCart,
    bill: adminPaths.menuPreviewBill,
  };
  const origin = searchParams.get("origem");
  return `${paths[destination] ?? adminPaths.menuPreview}${origin ? `?origem=${encodeURIComponent(origin)}` : ""}`;
}

/** Aberta pelo formulário de produto (origem=produtos) volta aos produtos. */
export function previewBack(searchParams: URLSearchParams) {
  return searchParams.get("origem") === "produtos"
    ? { path: adminPaths.menu, label: "Voltar aos produtos" }
    : { path: adminPaths.dashboard, label: "Voltar ao painel" };
}
