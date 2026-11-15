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

/** Aberta pelo formulário de produto (origem=produtos) volta aos produtos. */
export function previewBack(searchParams: URLSearchParams) {
  return searchParams.get("origem") === "produtos"
    ? { path: adminPaths.menu, label: "Voltar aos produtos" }
    : { path: adminPaths.dashboard, label: "Voltar ao painel" };
}
