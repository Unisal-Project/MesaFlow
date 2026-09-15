import { useEffect, useState } from "react";
import { fetchCategories, fetchProducts, type Category, type Product } from "@/_services/menu.service";
import { ClientHeader } from "@/components";
import { CategoryTabs } from "@/components";
import { ProductCard } from "@/components";

function formatPrice(price: string) {
  return `R$ ${Number(price).toFixed(2).replace(".", ",")}`;
}

export function Menu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    async function loadData() {
      const categoriesData = await fetchCategories();
      const productsData = await fetchProducts();

      setCategories(categoriesData);
      setProducts(productsData);
    }
    loadData();

  }, []);

 const filteredProducts = activeCategory ==="all" ? products:
  products.filter((product)=>product.categoryId=== activeCategory);

  const tabs=[
    {id:"all", label:"Todos"},
    ...categories.map((category)=>({id: category.id, label: category.name })),
  ];

  return(
    <div>
    <ClientHeader title="Cardápio"/>
    <CategoryTabs categories={tabs} activeId={activeCategory} onChange={setActiveCategory}/>

    {filteredProducts.map((product)=>
    <ProductCard
    key={product.id}
    name={product.name}
    description={product.description ?? ""}
    price ={formatPrice(product.price)}
    available={product.available}
    actionLabel="Ver item"
    onAdd={()=>{}}
    />)}
    </div>
  );
}
