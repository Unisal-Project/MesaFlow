import { useState } from "react";
import { Menu } from "@/pages/client/Menu";
import { ProductDetail } from "@/pages/client/ProductDetail";
import { Cart } from "@/pages/client/Cart";
import type { Product } from "@/_services/menu.service";

type Screen = "menu" | "product" | "cart";

export function ClientFlow() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");

  function handleSelectProduct(product: Product, categoryName: string) {
    setSelectedProduct(product);
    setSelectedCategoryName(categoryName);
    setScreen("product");
  }

  if (screen === "product" && selectedProduct) {
    return (
      <ProductDetail
        product={selectedProduct}
        categoryName={selectedCategoryName}
        onBack={() => setScreen("menu")}
        onGoToCart={() => setScreen("cart")}
       onAdded={() => setScreen("menu")}
      />
    );
  }

  if (screen === "cart") {
    return (
      <Cart
        onBack={() => setScreen("menu")}
        onGoToMenu={() => setScreen("menu")}
        onOrderConfirmed={() => setScreen("menu")}
      />
    );
  }

  return <Menu onSelectProduct={handleSelectProduct} onOpenCart={() => setScreen("cart")} />;
}