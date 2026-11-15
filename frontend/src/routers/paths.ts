export const adminPaths: Record<string, string> = {
  dashboard: "/admin/dashboard",
  orders: "/admin/pedidos",
  tables: "/admin/mesas",
  menu: "/admin/cardapio",
  reports: "/admin/relatorios",
  menuPreview: "/admin/ver-cardapio",
  menuPreviewProduct: "/admin/ver-cardapio/produto",
  settings: "/admin/configuracoes",
};

export const clientPaths: Record<string, string> = {
  home: "/cliente",
  menu: "/cardapio",
  order: "/carrinho",
  bill: "/conta",
  review: "/confirmar-pedido",
};

/** Mantém o token do QR Code e os demais parâmetros ao trocar de tela. */
export function clientTarget(pathname: string, search: string) {
  return { pathname, search };
}
