/** Promoção da categoria; promoValue já convertido para string. */
export type CategoryPromo = {
  promoType: "PERCENT" | "AMOUNT" | null;
  promoValue: string | null;
  promoActive: boolean;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
};

export class CategoryEntity {
  constructor(
    public readonly id: bigint,
    public name: string,
    public description: string | null,
    public active: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public promo: CategoryPromo,
  ) {}

  isActive(): boolean {
    return this.active;
  }
}
