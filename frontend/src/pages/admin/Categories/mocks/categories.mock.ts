import type { Category } from "../types/category.types";

export const initialCategories: Category[] = [
  {
    id: 1,
    name: "Lanches",
    description: "Hambúrgueres, sanduíches e opções rápidas.",
    productCount: 8,
    active: true,
  },
  {
    id: 2,
    name: "Pizzas",
    description: "Pizzas tradicionais e especiais da casa.",
    productCount: 12,
    active: true,
  },
  {
    id: 3,
    name: "Porções",
    description: "Porções para compartilhar e acompanhamentos.",
    productCount: 6,
    active: true,
  },
  {
    id: 4,
    name: "Bebidas",
    description: "Sucos, refrigerantes e outras bebidas.",
    productCount: 10,
    active: true,
  },
  {
    id: 5,
    name: "Sobremesas",
    description: "Doces e sobremesas para finalizar o pedido.",
    productCount: 4,
    active: false,
  },
];