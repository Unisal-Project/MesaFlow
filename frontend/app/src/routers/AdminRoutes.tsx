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
import Dashboard from "@/pages/admin/Dashboard";
import Reports from "@/pages/admin/Reports";
import Products from "@/pages/admin/Products";
import Tables from "@/pages/admin/Table";
import Orders from "@/pages/admin/Order";
import { useTables } from "@/pages/admin/Table/hooks/useTables";
import { useProducts } from "@/pages/admin/Products/hooks/useProducts";
import { useCategories } from "@/pages/admin/Categories/hooks/useCategories";
import { useOrder } from "@/pages/admin/Order/hooks/useOrder";

import { adminPaths } from "./paths";

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
  if (
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
  const orderState = useOrder(tableState.tables);
  const productState = useProducts();
  const categoryState = useCategories(productState.renameProductCategory);
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
        <Route element={<AdminWorkspace />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <Dashboard
                onNavigate={goTo}
                onViewOrders={() => showOrder()}
                onViewOrder={showOrder}
                onViewReports={() => goTo("reports")}
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
              <Tables
                state={tableState}
                orders={orderState.orders}
                onViewOrder={showOrder}
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
                activeTab={isCategories ? "categories" : "products"}
                showAllProducts={
                  location.pathname === "/admin/cardapio/produtos"
                }
                showAllCategories={
                  location.pathname === "/admin/cardapio/categorias/todas"
                }
                onSwitchTab={(tab) =>
                  navigate(
                    tab === "categories"
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
            path="*"
            element={<Navigate to="/admin/dashboard" replace />}
          />
        </Route>
      </Routes>
    </>
  );
}
