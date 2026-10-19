export class CategoryEntity {
  constructor(
    public readonly id: bigint,
    public name: string,
    public description: string | null,
    public active: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  isActive(): boolean{
    return this.active
  }
}
