import type { MockProduct, NewProductForm } from "../types/product.types";

export const emptyProductForm: NewProductForm = {
  name: "",
  quantity: "0",
  price: "",
  observation: "",
  category: "",
  imageUrl: "",
  available: true,
};

export const productCategories = [
  "Lanches",
  "Pizzas",
  "Porções",
  "Bebidas",
  "Sobremesas",
];

export const initialProducts: MockProduct[] = [
  {
    id: 1,
    name: "X-Burger artesanal",
    category: "Lanches",
    price: "R$ 28,90",
    quantity: 18,
    available: true,
  },
  {
    id: 2,
    name: "Pizza margherita",
    category: "Pizzas",
    price: "R$ 44,90",
    quantity: 12,
    available: true,
  },
  {
    id: 3,
    name: "Batata rústica",
    category: "Porções",
    price: "R$ 18,00",
    quantity: 0,
    available: false,
  },
  {
    id: 4,
    name: "Suco de laranja",
    category: "Bebidas",
    price: "R$ 12,00",
    quantity: 24,
    available: true,
  },
];