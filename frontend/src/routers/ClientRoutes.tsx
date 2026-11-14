import { useState, useEffect } from "react";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";

import {
  fetchCategories,
  fetchProductsById,
  type Category,
  type Product,
} from "@/services/menu.service";

import { ClientWorkspace } from "@/layouts/ClientWorkspace";

import { ClientTableProvider, useClientTable } from "@/contexts/ClientTableContext";

import { CartProvider } from "@/contexts/CartProvider";

import { Home } from "@/pages/client/Home";
import { Menu } from "@/pages/client/Menu";
import { Cart } from "@/pages/client/Cart";
import { ProductDetail } from "@/pages/client/ProductDetail";
import { ConfirmOrder } from "@/pages/client/ConfirmOrder";
import { Orders } from "@/pages/client/Orders";
import { TableBill } from "@/pages/client/TableBill";

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

  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      setIsLoading(true);
      setError(null);
      setProduct(null);
      setCategory(null);

      if (!productId) {
        setError("Produto inválido.");
        setIsLoading(false);
        return;
      }

      try {
        const [productData, categoriesData] = await Promise.all([
          fetchProductsById(productId, controller.signal),
          fetchCategories(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        const productCategory = categoriesData.find(
          (item) => item.id === productData.categoryId
        );

        setProduct(productData);
        setCategory(productCategory ?? null);
      } catch (reason) {
        if (controller.signal.aborted) return;

        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar o produto."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => controller.abort();
  }, [productId]);

  if (isLoading) {
    return <p role="status">Carregando produto...</p>;
  }

  if (error || !product) {
    return (
      <div role="alert">
        <p>{error ?? "Produto não encontrado."}</p>
        <button type="button" onClick={onBack}>
          Voltar ao cardápio
        </button>
      </div>
    );
  }

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
  const { guestName, setGuestName } = useClientTable();
  const tableToken =
  new URLSearchParams(location.search).get("mesa")?.trim() ?? "";
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
              tableToken={tableToken}
              customerName={guestName}
              onBack={() => goTo("order")}
              onGoToMenu={() => goTo("menu")}
              onNavigate={goTo}
            />
          }
        />
        <Route 
          path="pedidos" 
          element={
            <Orders 
              tableToken={tableToken} 
              onNavigate={goTo} 
            />
          } 
        />
        <Route
          path="conta"
          element={
            <TableBill 
              tableToken={tableToken}
              onBack={() => goTo("menu")} 
              onNavigate={goTo} 
            />
          }
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
      <ClientTableProvider key={tableToken} token={tableToken}>
        <ClientPages />
      </ClientTableProvider>
    </CartProvider>
  );
}
