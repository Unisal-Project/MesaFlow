import { compare } from "bcrypt";
import type { UserRole } from "../users/entity/user.entity.js";
import { AppError } from "../../shared/errors/app-errors.js";
import type { UserService } from "../users/user.service.js";
import type { UserRepository } from "../users/repository/user.repository.js";
import type { PublicUser, RegisterUserInput } from "../users/user.service.js";

export type AuthTokenPayload = {
  id: string;
  email: string;
  role: UserRole;
};

export type AuthTokenSigner = (
  payload: AuthTokenPayload,
  options: { expiresIn: "15m" },
) => string;

export type AuthResult = {
  user: PublicUser;
  accessToken: string;
};

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly signToken: AuthTokenSigner,
  ) {}

  async register(data: RegisterUserInput): Promise<AuthResult> {
    const user = await this.userService.registerUser(data);
    return this.createAuthResult(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(
      email.trim().toLowerCase(),
    );

    if (
      !user ||
      !user.active ||
      !(await compare(password, user.passwordHash))
    ) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const { passwordHash: _passwordHash, ...publicUser } = user;
    return this.createAuthResult(publicUser);
  }

  private createAuthResult(user: PublicUser): AuthResult {
    return {
      user,
      accessToken: this.signToken(
        {
          id: user.id.toString(),
          email: user.email,
          role: user.role,
        },
        { expiresIn: "15m" },
      ),
    };
  }
}
