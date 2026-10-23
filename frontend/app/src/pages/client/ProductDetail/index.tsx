import { ChevronLeft, ShoppingCart } from "lucide-react";
import { ClientHeader, QuantitySelector, TextAreaField, Button } from "@/components";
import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { useProductDetail } from "./hooks/useProductDetail";
import type { ProductDetailProps } from "./types/productDetail.types";
import { formatPriceMenu } from "@/utils/formatPrice";
import "./styles.scss";

export function ProductDetail({ product, categoryName, onBack, onAdded, onGoToCart, onNavigate }: ProductDetailProps) {
  const { itemCount, quantity, setQuantity, notes, setNotes, maxQuantity, handleAdd } = useProductDetail(product, onAdded);
  const table = new URLSearchParams(window.location.search).get("mesa")?.trim() || "12";
  const tableLabel = /^mesa\s/i.test(table) ? table : `Mesa ${table}`;

  return (
    <div className="product-detail-page">
      <ClientHeader title="MesaFlow" subtitle={tableLabel}
        backAction={<button type="button" className="product-detail-back" aria-label="Voltar" onClick={onBack}><ChevronLeft aria-hidden="true" /></button>}
        cartAction={<button type="button" className="product-detail-cart" aria-label={`Carrinho, ${itemCount} ${itemCount === 1 ? "item" : "itens"}`} onClick={onGoToCart}>
          <ShoppingCart aria-hidden="true" /><span aria-hidden="true">{itemCount}</span>
        </button>} />
      <div className="product-detail-hero">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div aria-hidden="true" />}
      </div>
      <main className="product-detail-content">
        {categoryName && <span className="product-detail-category"><span aria-hidden="true" />{categoryName}</span>}
        <h1>{product.name}</h1>
        <p className="product-detail-description">{product.description}</p>
        <strong className="product-detail-price">{formatPriceMenu(product.price)}</strong>
        <TextAreaField id="product-notes" label="Observações" placeholder="Ex.: sem cebola, molho à parte" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <div className="product-detail-quantity-row">
          <span>Quantidade</span>
          <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={maxQuantity} size="large" />
        </div>
        {maxQuantity === 0 && <p className="product-detail-stock-warning" role="status">Sem estoque disponível para este item.</p>}
        <Button className="add-to-order-button" onClick={handleAdd} disabled={maxQuantity === 0}>Adicionar ao pedido</Button>
      </main>
      <ClientTabBar onMenu={onBack} onOrder={onGoToCart} onNavigate={onNavigate} />
    </div>
  );
}
