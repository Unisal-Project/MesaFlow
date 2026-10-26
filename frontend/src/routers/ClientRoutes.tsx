import { useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { ClientWorkspace } from "@/layouts/ClientWorkspace";
import { CartProvider } from "@/contexts/CartProvider";
import { useCart } from "@/contexts/useCart";
import { Home } from "@/pages/client/Home";
import { Menu } from "@/pages/client/Menu";
import { Cart } from "@/pages/client/Cart";
import { ProductDetail } from "@/pages/client/ProductDetail";
import { ConfirmOrder } from "@/pages/client/ConfirmOrder";
import { OrderTracking } from "@/pages/client/OrderTracking";
import { TableBill } from "@/pages/client/TableBill";
import { demoCatalog } from "@/data/catalog.mock";
import type { OrderTrackingData } from "@/pages/client/OrderTracking/types/orderTracking.types";

import { clientPaths, clientTarget } from "./paths";

function ProductRoute({
  onNavigate,
  onBack,
  onGoToCart,
}: {
  onNavigate: (destination: string) => void;
  onBack: () => void;
  onGoToCart: () => void;
}) {
  const { productId } = useParams();
  const { search } = useLocation();
  const product = demoCatalog.products.find(
    (product) => product.id === productId,
  );
  if (!product)
    return <Navigate to={{ pathname: "/cardapio", search }} replace />;
  const category = demoCatalog.categories.find(
    (category) => category.id === product.categoryId,
  );
  return (
    <ProductDetail
      product={product}
      categoryName={category?.name ?? ""}
      onNavigate={onNavigate}
      onBack={onBack}
      onAdded={onBack}
      onGoToCart={onGoToCart}
    />
  );
}

function ClientPages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart, itemCount } = useCart();
  const [guestName, setGuestName] = useState("");
  const [nextOrderId, setNextOrderId] = useState(1842);
  const [lastOrder, setLastOrder] = useState<OrderTrackingData | null>(null);
  const goTo = (destination: string) => {
    if (destination === "order") {
      openCart();
      return;
    }
    if (clientPaths[destination])
      navigate(clientTarget(clientPaths[destination], location.search));
  };
  const openCart = () =>
    navigate(clientTarget("/carrinho", location.search), {
      state: { returnPath: location.pathname },
    });
  const sendDemoOrder = (receiveUpdates: boolean) => {
    setLastOrder({ id: nextOrderId, status: "waiting", cartItemCount: 0 });
    setNextOrderId((current) => current + 1);
    clearCart();
    if (receiveUpdates) goTo("status");
  };

  return (
    <Routes>
      <Route element={<ClientWorkspace />}>
        <Route
          path="cliente"
          element={
            <Home
              guestName={guestName}
              onGuestNameChange={setGuestName}
              onExploreMenu={() => goTo("menu")}
              onOpenCart={openCart}
            />
          }
        />
        <Route
          path="cardapio"
          element={
            <Menu
              catalog={demoCatalog}
              onBack={() => goTo("home")}
              onNavigate={goTo}
              onOpenCart={openCart}
              onSelectProduct={(product) =>
                navigate(
                  clientTarget(
                    `/produto/${encodeURIComponent(product.id)}`,
                    location.search,
                  ),
                )
              }
            />
          }
        />
        <Route
          path="produto/:productId"
          element={
            <ProductRoute
              onNavigate={goTo}
              onBack={() => goTo("menu")}
              onGoToCart={openCart}
            />
          }
        />
        <Route
          path="carrinho"
          element={
            <Cart
              onReview={() => goTo("review")}
              onNavigate={goTo}
              allowOrdering={false}
              onBack={() =>
                navigate(
                  clientTarget(
                    location.state?.returnPath ?? "/cardapio",
                    location.search,
                  ),
                )
              }
              onGoToMenu={() => goTo("menu")}
              onOrderConfirmed={() => goTo("menu")}
            />
          }
        />
        <Route
          path="confirmar-pedido"
          element={
            <ConfirmOrder
              orderId={nextOrderId}
              onBack={() => goTo("order")}
              onGoToMenu={() => goTo("menu")}
              onNavigate={goTo}
              onSend={sendDemoOrder}
            />
          }
        />
        <Route
          path="acompanhar"
          element={
            <OrderTracking
              order={
                lastOrder
                  ? { ...lastOrder, cartItemCount: itemCount }
                  : undefined
              }
              onBack={() => goTo("menu")}
              onNavigate={goTo}
            />
          }
        />
        <Route
          path="conta"
          element={<TableBill onBack={() => goTo("menu")} onNavigate={goTo} />}
        />
        <Route
          path="*"
          element={
            <Navigate
              to={{ pathname: "/cardapio", search: location.search }}
              replace
            />
          }
        />
      </Route>
    </Routes>
  );
}

export function ClientRoutes() {
  const { search } = useLocation();
  const tableToken = new URLSearchParams(search).get("mesa")?.trim() ?? "";
  // Um QR de outra mesa não reutiliza o carrinho da mesa anterior.
  return (
    <CartProvider
      key={tableToken}
      storageKey={tableToken ? `mesaflow:cart:${tableToken}` : "mesaflow:cart"}
    >
      <ClientPages />
    </CartProvider>
  );
}
