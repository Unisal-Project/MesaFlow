export class TableEntity {
  constructor(
    public readonly id: bigint,
    public number: number,
    public name: string | null,
    public active: boolean,
    public readonly qrToken: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public seats = 4,
  ) {}

  isActive(): boolean {
    return this.active;
  }

  canBeUsed(): boolean {
    return this.isActive();
  }
}
