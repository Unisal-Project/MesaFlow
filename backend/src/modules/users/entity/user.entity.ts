export type UserRole = "ADMIN" | "EMPLOYEE";

export type UserEntity = {
  id: bigint;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  tokenVersion: number;
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

export type PublicUser = Omit<UserEntity, "passwordHash" | "tokenVersion">;

export const toPublicUser = ({
  passwordHash: _passwordHash,
  tokenVersion: _tokenVersion,
  ...user
}: UserEntity): PublicUser => user;

export type RegisterUserInput = Pick<UserEntity, "name" | "email"> & {
  password: string;
};

export type CreateUserInput = RegisterUserInput & {
  role?: UserRole;
  active?: boolean;
};

export type UpdateUserData = Partial<CreateUserData> & {
  /** Sempre incremento atômico no banco (logout, senha, desativação, perfil). */
  tokenVersion?: { increment: 1 };
};
