export interface AvailableProduct{
    id: bigint;
    price: string;
}

export interface ProductRepository{
    findAvailableByIds(id: bigint[]): Promise<AvailableProduct[]>;
}

