export type CategoryInput = {
  name: string;
  description?: string | null;
  active: boolean;
  createdAt?: Date;
  updatedAt: Date;
};

export type CategoryOutput = {
  id: bigint;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryResponse = {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
