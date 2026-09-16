export type OrderCatalogProduct = {
  id: number;
  name: string;
  unitPrice: number;
};

export const orderTableOptions = [
  "Balcão",
  ...Array.from(
    { length: 12 },
    (_, index) => `Mesa ${String(index + 1).padStart(2, "0")}`,
  ),
];

export const orderProductCatalog: OrderCatalogProduct[] = [
  { id: 1, name: "X-Burger artesanal", unitPrice: 28.9 },
  { id: 2, name: "Pizza margherita", unitPrice: 44.9 },
  { id: 3, name: "Batata rústica", unitPrice: 18 },
  { id: 4, name: "Suco de laranja", unitPrice: 12 },
  { id: 5, name: "Refrigerante lata", unitPrice: 7 },
  { id: 6, name: "X-Salada", unitPrice: 31.9 },
  { id: 7, name: "Água com gás", unitPrice: 6 },
  { id: 8, name: "Pizza calabresa", unitPrice: 46.9 },
  { id: 9, name: "Refrigerante 1L", unitPrice: 13 },
  { id: 10, name: "Pudim da casa", unitPrice: 14 },
];
