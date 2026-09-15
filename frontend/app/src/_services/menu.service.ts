export type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  stockQuantity: number;
  available: boolean;
  active: boolean;
};

const API_URL = "http://localhost:3333/api/v1";

export async function fetchCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/categories`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar as categorias");
  }

  return response.json();
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${API_URL}/products`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar os produtos");
  }

  return response.json();
}