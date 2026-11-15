import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { CartProvider } from "@/contexts/CartProvider";
import { ProductDetail } from "@/pages/client/ProductDetail";
import { adminPaths } from "@/routers/paths";
import { fetchCategories, fetchProductsById, type Product } from "@/services/menu.service";
import { PREVIEW_CART_KEY } from "./preview";

type ProductPreviewViewProps = {
  product: Product;
  categoryName: string;
  onBack: () => void;
  onExit: () => void;
};

/**
 * Detalhe do cliente com carrinho isolado: "Adicionar ao pedido" só grava
 * na chave da prévia e volta; nada é enviado à API.
 */
export function ProductPreviewView({ product, categoryName, onBack, onExit }: ProductPreviewViewProps) {
  return (
    <CartProvider storageKey={PREVIEW_CART_KEY}>
      <ProductDetail
        product={product}
        categoryName={categoryName}
        onBack={onBack}
        onAdded={onBack}
        onGoToCart={onExit}
        onNavigate={onExit}
      />
    </CartProvider>
  );
}

export default function ProductPreview() {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const origin = useSearchParams()[0].get("origem");
  const originParam = origin ? `&origem=${encodeURIComponent(origin)}` : "";
  const [loaded, setLoaded] = useState<{ id: string; product: Product; categoryName: string } | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchProductsById(productId, controller.signal), fetchCategories(controller.signal)])
      .then(([product, categories]) => {
        const categoryName = categories.find((item) => item.id === product.categoryId)?.name ?? "";
        setLoaded({ id: productId, product, categoryName });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError({
          id: productId,
          message: reason instanceof Error ? reason.message : "Não foi possível carregar o produto.",
        });
      });
    return () => controller.abort();
  }, [productId]);

  const onBack = () => navigate(`${adminPaths.menuPreview}?produto=${encodeURIComponent(productId)}${originParam}`);
  const onExit = () => navigate(`${adminPaths.menuPreview}${originParam.replace("&", "?")}`);

  if (error?.id === productId) {
    return (
      <div role="alert">
        <p>{error.message}</p>
        <button type="button" onClick={onBack}>Voltar ao cardápio</button>
      </div>
    );
  }
  if (loaded?.id !== productId) return <p role="status">Carregando produto...</p>;
  return <ProductPreviewView product={loaded.product} categoryName={loaded.categoryName} onBack={onBack} onExit={onExit} />;
}
