export interface TableRepository {
    existsById (id: bigint): Promise<boolean>;
}