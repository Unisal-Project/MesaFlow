import type { UserRole } from "../../users/entity/user.entity.js";
import type { PublicUser } from "../../users/entity/user.entity.js";

export type AuthTokenPayload = {
  id: string;
  email: string;
  role: UserRole;
};

export type AuthTokenSigner = (
  payload: AuthTokenPayload,
  options: { expiresIn: "8h" },
) => string;

export type AuthResult = {
  user: PublicUser;
  accessToken: string;
};
