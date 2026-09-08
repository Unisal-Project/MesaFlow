import type { Prisma } from "../../../generated/prisma/client.js";

export type ProductInput = {
  categoryId: bigint;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  stockQuantity?: number;
  available?: boolean;
  active?: boolean;
};

export type ProductUpdateInput = {
  categoryId?: bigint;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number;
  stockQuantity?: number;
  available?: boolean;
  active?: boolean;
};

export type ProductOutput = {
  id: bigint;
  categoryId: bigint;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: Prisma.Decimal;
  stockQuantity: number;
  available: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductResponse = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  stockQuantity: number;
  available: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
