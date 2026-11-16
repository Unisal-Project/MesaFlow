import { useEffect, useRef } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { AdminWorkspace } from "@/layouts/AdminWorkspace";
import { ClientWorkspace } from "@/layouts/ClientWorkspace";
import MenuPreview from "@/pages/admin/MenuPreview";
import ProductPreview from "@/pages/admin/MenuPreview/ProductPreview";
import {
  BillPreview,
  CartPreview,
  PreviewLayout,
} from "@/pages/admin/MenuPreview/PreviewPages";
import Dashboard from "@/pages/admin/Dashboard";
import Reports from "@/pages/admin/Reports";
import Settings from "@/pages/admin/Settings";
import Products from "@/pages/admin/Products";
import Tables from "@/pages/admin/Table";
import Orders from "@/pages/admin/Order";
import { useTables } from "@/pages/admin/Table/hooks/useTables";
import { useProducts } from "@/pages/admin/Products/hooks/useProducts";
import { useCategories } from "@/pages/admin/Categories/hooks/useCategories";
import { useOrder } from "@/pages/admin/Order/hooks/useOrder";

import { adminPaths } from "./paths";
import type { TablesProps } from "@/pages/admin/Table/types/table.types";

function TableRoute(props: TablesProps) {
  const { search } = useLocation();
  const openedTarget = useRef("");
  const { state } = props;
  useEffect(() => {
    if (openedTarget.current === search) return;
    const params = new URLSearchParams(search);
    const id = params.get("mesa");
    const number = params.get("numero");
    if (!id && !number) { openedTarget.current = search; return; }
    const table = state.tables.find((entry) => id ? entry.id === id : String(entry.number) === number);
    if (!table) return; // O link pode chegar antes de as mesas carregarem.
    openedTarget.current = search;
    state.setSearchQuery("");
    state.setStatusFilter("all");
    state.setSelectedDetail(null);
    state.setSelectedTable(table);
  }, [search, state]);
  return <Tables {...props} />;
}

function OrderRoute({
  state,
  onNavigate,
}: {
  state: ReturnType<typeof useOrder>;
  onNavigate: (id: string) => void;
}) {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const openedId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (openedId.current === orderId) return;
    openedId.current = orderId;
    // O card já selecionou o pedido antes de atualizar a URL. Evita refiltrar
    // a lista depois de calcular a rolagem até o painel de detalhes.
    if (orderId !== undefined && state.selectedOrderId === Number(orderId)) return;
    state.openOrder(orderId === undefined ? undefined : Number(orderId));
  }, [orderId, state]);
  // Durante o carregamento a lista ainda está vazia; não redireciona.
  if (
    !state.loading &&
    orderId !== undefined &&
    !state.orders.some((order) => String(order.id) === orderId)
  ) {
    return <Navigate to="/admin/pedidos" replace />;
  }
  return (
    <Orders
      state={state}
      onNavigate={onNavigate}
      onSelectOrder={(id) =>
        navigate(`/admin/pedidos/${id}`, { state: { preserveScroll: true } })
      }
    />
  );
}

export function AdminRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  // Estado do atendimento sobrevive à troca de rotas dentro do administrativo.
  const tableState = useTables();
  const categoryState = useCategories();
  const productState = useProducts(categoryState.categories);
  // Pedidos mexem no estoque e no atendimento: recarrega mesas e produtos.
  const orderState = useOrder(tableState.tables, productState.products, () => {
    void tableState.reload();
    void productState.reload();
  });
  const isCategories = location.pathname.includes("/categorias");
  const goTo = (id: string) => {
    if (adminPaths[id]) navigate(adminPaths[id]);
  };
  const showOrder = (id?: number) => {
    orderState.openOrder(id);
    navigate(id === undefined ? "/admin/pedidos" : `/admin/pedidos/${id}`);
  };

  return (
    <>
      <Routes>
        {/* Prévia do cardápio como o cliente vê: página cheia, sem sidebar. */}
        <Route element={<ClientWorkspace />}>
          <Route path="ver-cardapio" element={<PreviewLayout />}>
            <Route index element={<MenuPreview />} />
            <Route path="produto/:productId" element={<ProductPreview />} />
            <Route path="carrinho" element={<CartPreview />} />
            <Route path="conta" element={<BillPreview />} />
          </Route>
        </Route>
        <Route element={<AdminWorkspace />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <Dashboard
                orders={orderState.orders}
                tables={tableState.tables}
                loading={orderState.loading || tableState.loading}
                error={orderState.error || tableState.error}
                onRetry={() => {
                  void orderState.reload();
                  void tableState.reload();
                }}
                onNavigate={goTo}
                onViewOrders={() => showOrder()}
                onViewOrder={showOrder}
                onViewReports={() => goTo("reports")}
                onOpenTable={(table) => {
                  // Estado de seleção é compartilhado com a tela Mesas: ela abre já com os detalhes.
                  tableState.setSelectedTable(table);
                  tableState.setSelectedDetail(null);
                  goTo("tables");
                }}
              />
            }
          />
          <Route
            path="pedidos/:orderId?"
            element={<OrderRoute state={orderState} onNavigate={goTo} />}
          />
          <Route
            path="mesas"
            element={
              <TableRoute
                state={tableState}
                orders={orderState.orders}
                onViewOrder={showOrder}
                onLaunchOrder={(tableId) => {
                  orderState.setIsCreatingOrder(true, tableId);
                  navigate(adminPaths.orders);
                }}
                onNavigate={goTo}
              />
            }
          />
          <Route
            path="cardapio/*"
            element={
              <Products
                onNavigate={goTo}
                productState={productState}
                categoryState={categoryState}
                activeTab={location.pathname === adminPaths.promotions ? "promotions" : isCategories ? "categories" : "products"}
                showAllProducts={
                  location.pathname === "/admin/cardapio/produtos"
                }
                showAllCategories={
                  location.pathname === "/admin/cardapio/categorias/todas"
                }
                onSwitchTab={(tab) =>
                  navigate(
                    tab === "promotions" ? adminPaths.promotions : tab === "categories"
                      ? "/admin/cardapio/categorias"
                      : "/admin/cardapio",
                  )
                }
                onShowAllProducts={() => navigate("/admin/cardapio/produtos")}
                onShowAllCategories={() =>
                  navigate("/admin/cardapio/categorias/todas")
                }
                onBackToMenu={() =>
                  navigate(
                    isCategories
                      ? "/admin/cardapio/categorias"
                      : "/admin/cardapio",
                  )
                }
              />
            }
          />
          <Route path="relatorios" element={<Reports onNavigate={goTo} />} />
          <Route
            path="promocoes"
            element={<Navigate to={adminPaths.promotions} replace />}
          />
          <Route
            path="configuracoes"
            element={<Settings onNavigate={goTo} />}
          />
          <Route
            path="*"
            element={<Navigate to="/admin/dashboard" replace />}
          />
        </Route>
      </Routes>
    </>
  );
}
