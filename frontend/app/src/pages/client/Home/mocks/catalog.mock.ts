import type { MenuCatalog } from "../../Menu/types/menu.types";

export const demoCatalog: MenuCatalog = {
  categories: [
    { id: "pratos", name: "Pratos", description: null, active: true },
    { id: "bebidas", name: "Bebidas", description: null, active: true },
    { id: "sobremesas", name: "Sobremesas", description: null, active: true },
  ],
  products: [
    { id: "demo-risoto", categoryId: "pratos", name: "Risoto de cogumelos", description: "Arroz arbóreo, parmesão, cogumelos frescos e ervas.", imageUrl: null, price: "48.90", stockQuantity: 18, available: true, active: true },
    { id: "demo-nhoque", categoryId: "pratos", name: "Nhoque artesanal", description: "Nhoque de batata com molho de tomate assado e manjericão.", imageUrl: null, price: "39.90", stockQuantity: 15, available: true, active: true },
    { id: "demo-pudim", categoryId: "sobremesas", name: "Pudim de doce de leite", description: "Pudim cremoso com calda dourada e flor de sal.", imageUrl: null, price: "22.90", stockQuantity: 12, available: true, active: true },
    { id: "demo-burger", categoryId: "pratos", name: "Burger da casa", description: "Pão, hambúrguer artesanal, queijo e salada.", imageUrl: null, price: "28.90", stockQuantity: 12, available: true, active: true },
    { id: "demo-batata", categoryId: "pratos", name: "Batata rústica", description: "Batatas douradas com ervas da casa.", imageUrl: null, price: "18.00", stockQuantity: 15, available: true, active: true },
    { id: "demo-suco", categoryId: "bebidas", name: "Suco natural", description: "Suco de laranja preparado na hora.", imageUrl: null, price: "12.00", stockQuantity: 24, available: true, active: true },
  ],
};
