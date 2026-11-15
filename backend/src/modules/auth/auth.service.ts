import { AppError } from "../../shared/errors/app-errors.js";
import type { UserService } from "../users/user.service.js";
import type { UserRepository } from "../users/repository/user.repository.js";
import type { PasswordHasher } from "../../config/hash/password-hasher.js";
import type { AuthTokenSigner, AuthResult } from "./entity/auth.entity.js";
import type { RegisterDTO } from "./dto/auth.dto.js";
import type { PublicUser } from "../users/entity/user.entity.js";
export class AuthService {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly signToken: AuthTokenSigner,
  ) {}

  async register(data: RegisterDTO): Promise<AuthResult> {
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
      !(await this.passwordHasher.compareHasher(password, user.passwordHash))
    ) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const { passwordHash: _passwordHash, ...publicUser } = user;
    return this.createAuthResult(publicUser);
  }

  /** Troca a senha do próprio usuário; o id vem sempre do JWT. */
  async changePassword(
    userId: bigint,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user?.active) throw new AppError("Usuário inativo", 403);
    // 400 e não 401: senha errada não deve encerrar a sessão no front.
    if (
      !(await this.passwordHasher.compareHasher(
        currentPassword,
        user.passwordHash,
      ))
    ) {
      throw new AppError("Senha atual incorreta", 400);
    }
    if (currentPassword === newPassword) {
      throw new AppError("A nova senha deve ser diferente da atual", 400);
    }
    await this.userRepository.update(userId, {
      passwordHash: await this.passwordHasher.createHasher(newPassword),
    });
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
        { expiresIn: "8h" },
      ),
    };
  }
}
