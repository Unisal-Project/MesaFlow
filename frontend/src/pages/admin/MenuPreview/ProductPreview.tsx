import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { ProductDetail } from "@/pages/client/ProductDetail";
import { adminPaths } from "@/routers/paths";
import { fetchCategories, fetchProductsById, type Product } from "@/services/menu.service";
import { previewTarget } from "./preview";

type ProductPreviewViewProps = {
  product: Product;
  categoryName: string;
  onBack: () => void;
  onNavigate: (destination: string) => void;
};

/**
 * Detalhe do cliente dentro do carrinho isolado da prévia (PreviewLayout):
 * "Adicionar ao pedido" só grava no carrinho da prévia e volta; nada vai à API.
 */
export function ProductPreviewView({ product, categoryName, onBack, onNavigate }: ProductPreviewViewProps) {
  return (
    <ProductDetail
      product={product}
      categoryName={categoryName}
      onBack={onBack}
      onAdded={onBack}
      onGoToCart={() => onNavigate("order")}
      onNavigate={onNavigate}
    />
  );
}

export default function ProductPreview() {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const origin = searchParams.get("origem");
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
  const onNavigate = (destination: string) => navigate(previewTarget(destination, searchParams));

  if (error?.id === productId) {
    return (
      <div role="alert">
        <p>{error.message}</p>
        <button type="button" onClick={onBack}>Voltar ao cardápio</button>
      </div>
    );
  }
  if (loaded?.id !== productId) return <p role="status">Carregando produto...</p>;
  return <ProductPreviewView product={loaded.product} categoryName={loaded.categoryName} onBack={onBack} onNavigate={onNavigate} />;
}
