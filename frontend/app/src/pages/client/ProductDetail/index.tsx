import { useState, useEffect } from "react";
import { ChevronLeft, ShoppingCart, Menu as MenuIcon, Clock, ReceiptText } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { QuantitySelector, TextAreaField, Button } from "@/components";
import type { Product } from "@/_services/menu.service";
import "./styles.css";

type ProductDetailProps = {
  product: Product;
  categoryName: string;
  onBack: () => void;
  onAdded: () => void;
  onGoToCart: () => void;
};

function formatPrice(price: string) {
  return `R$ ${Number(price).toFixed(2).replace(".", ",")}`;
}

export function ProductDetail({ product, categoryName, onBack, onAdded, onGoToCart }: ProductDetailProps) {
  const { itemCount, items, addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const existingLine = items.find((line) => line.product.id === product.id);
    setQuantity(existingLine?.quantity ?? 1);
    setNotes(existingLine?.notes ?? "");
  }, [product.id]);

  const quantityReservedElsewhere = items
    .filter((line) => line.product.id === product.id && line.notes !== notes)
    .reduce((sum, line) => sum + line.quantity, 0);
  const maxQuantity = Math.max(0, product.stockQuantity - quantityReservedElsewhere);

  function handleAdd() {
    addItem(product, quantity, notes);
    onAdded();
  }

  return (
    <div className="product-detail-page">
      <header className="product-detail-header">
        <button type="button" className="icon-button" aria-label="Voltar" onClick={onBack}>
          <ChevronLeft />
        </button>

        <div>
          <strong>MesaFlow</strong>
          <span>Detalhes do produto</span>
        </div>

        <button type="button" className="icon-button cart-button" aria-label="Carrinho" onClick={onGoToCart}>
          <ShoppingCart />
          <b>{itemCount}</b>
        </button>
      </header>

      <main className="product-detail-content">
        {product.imageUrl ? (
          <img className="product-photo" src={product.imageUrl} alt={product.name} />
        ) : (
          <div className="product-photo" aria-hidden="true" />
        )}

        <span className="category-tag">
          <span className="dot" aria-hidden="true" />
          {categoryName}
        </span>

        <h1>{product.name}</h1>
        <p className="product-description">{product.description}</p>
        <strong className="product-price">{formatPrice(product.price)}</strong>

        <TextAreaField
          label="Observações"
          placeholder="Ex.: sem cebola, molho à parte"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <div className="quantity-row">
          <span>Quantidade</span>
          <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={maxQuantity} size="large" />
        </div>

        {maxQuantity === 0 && <p className="stock-warning">Sem estoque disponível pra esse item.</p>}

        <Button className="add-to-order-button" onClick={handleAdd} disabled={maxQuantity === 0}>
          Adicionar ao pedido
        </Button>
      </main>

      <nav className="bottom-navigation" aria-label="Navegação principal">
        <button type="button" className="active" onClick={onBack}><MenuIcon /><span>Cardápio</span></button>
        <button type="button" onClick={onGoToCart}><ShoppingCart /><span>Pedido</span></button>
        <button type="button"><Clock /><span>Status</span></button>
        <button type="button"><ReceiptText /><span>Conta</span></button>
      </nav>
    </div>
  );
}