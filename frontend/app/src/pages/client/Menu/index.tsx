import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { fetchCategories, fetchProducts, type Category, type Product } from "@/_services/menu.service";
import { ClientHeader, CategoryTabs, ProductCard } from "@/components";
import { useCart } from "@/contexts/CartContext";
import "./styles.css";

function formatPrice(price: string) {
  return `R$ ${Number(price).toFixed(2).replace(".", ",")}`;
}

type MenuProps = {
  onSelectProduct: (product: Product, categoryName: string) => void;
  onOpenCart: () => void;
};

export function Menu({ onSelectProduct, onOpenCart }: MenuProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { itemCount } = useCart();

  useEffect(() => {
    async function loadData() {
      const categoriesData = await fetchCategories();
      const productsData = await fetchProducts();

      setCategories(categoriesData);
      setProducts(productsData);
    }
    loadData();
  }, []);

  const filteredProducts =
    activeCategory === "all"
      ? products
      : products.filter((product) => product.categoryId === activeCategory);

  const tabs = [
    { id: "all", label: "Todos" },
    ...categories.map((category) => ({ id: category.id, label: category.name })),
  ];

  function handleSelectProduct(product: Product) {
    const category = categories.find((item) => item.id === product.categoryId);
    onSelectProduct(product, category?.name ?? "");
  }

  return (
    <div>
      <ClientHeader
        title="Cardápio"
        cartAction={
          <button type="button" className="icon-button cart-button" aria-label="Carrinho" onClick={onOpenCart}>
            <ShoppingCart />
            <b>{itemCount}</b>
          </button>
        }
      />
      <CategoryTabs categories={tabs} activeId={activeCategory} onChange={setActiveCategory} />

      {filteredProducts.map((product) => (
        <ProductCard
          key={product.id}
          name={product.name}
          description={product.description ?? ""}
          price={formatPrice(product.price)}
          available={product.available}
          actionLabel="Ver item"
          onAdd={() => handleSelectProduct(product)}
        />
      ))}
    </div>
  );
}