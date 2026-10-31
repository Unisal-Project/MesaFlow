export type UserRole = "ADMIN" | "EMPLOYEE";

export type UserEntity = {
  id: bigint;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserData = {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  active?: boolean;
};

export type PublicUser = Omit<UserEntity, "passwordHash">;

export type RegisterUserInput = Pick<UserEntity, "name" | "email"> & {
  password: string;
};

export type CreateUserInput = RegisterUserInput & {
  role?: UserRole;
  active?: boolean;
};

export type UpdateUserData = Partial<CreateUserData>;
