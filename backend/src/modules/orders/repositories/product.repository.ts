export interface AvailableProduct {
  id: bigint;
  /** Preço a cobrar, já com promoção vigente. */
  price: string;
}

export interface ProductRepository {
  findAvailableByIds(id: bigint[]): Promise<AvailableProduct[]>;
}
