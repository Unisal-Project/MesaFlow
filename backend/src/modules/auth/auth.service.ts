import { AppError } from "../../shared/errors/app-errors.js";
import type { UserService } from "../users/user.service.js";
import type { UserRepository } from "../users/repository/user.repository.js";
import type { PasswordHasher } from "../../config/hash/password-hasher.js";
import type { AuthTokenSigner, AuthResult } from "./entity/auth.entity.js";
import type { UpdateProfileDTO, RegisterDTO } from "./dto/auth.dto.js";
import {
  toPublicUser,
  type PublicUser,
  type UserEntity,
} from "../users/entity/user.entity.js";

// Hash bcrypt (custo 12, igual ao real) de uma senha qualquer: o login sem
// usuário compara contra ele e leva o mesmo tempo (sem oráculo de e-mail).
export const DUMMY_PASSWORD_HASH =
  "$2b$12$I/4DcUvL93YZm3tsPCMc9eFTjbLK2N9gFnEAzhZyYHKCaRQK6a9wm";

export class AuthService {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly signToken: AuthTokenSigner,
  ) {}

  async register(data: RegisterDTO): Promise<AuthResult> {
    await this.userService.registerUser(data);
    const user = await this.userRepository.findByEmail(
      data.email.trim().toLowerCase(),
    );
    return this.createAuthResult(user!);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(
      email.trim().toLowerCase(),
    );

    // Sempre roda o bcrypt (mesmo sem usuário) antes de decidir.
    const passwordOk = await this.passwordHasher.compareHasher(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !user.active || !passwordOk) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }
    return this.createAuthResult(user);
  }

  /** Logout real: invalida todos os tokens do usuário. */
  async logout(userId: bigint): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (user) await this.bumpTokenVersion(user);
  }

  /**
   * Troca a senha do próprio usuário (id sempre do JWT). Os tokens antigos
   * deixam de valer; devolve um token novo para esta sessão continuar.
   */
  async changePassword(
    userId: bigint,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult> {
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
    const updated = await this.userRepository.update(userId, {
      passwordHash: await this.passwordHasher.createHasher(newPassword),
      tokenVersion: { increment: 1 },
    });
    return this.createAuthResult(updated);
  }

  async updateProfile(
    userId: bigint,
    data: UpdateProfileDTO,
  ): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user?.active) throw new AppError("Usuário inativo", 403);
    if (data.email !== undefined && data.email !== user.email) {
      if (
        !data.currentPassword ||
        !(await this.passwordHasher.compareHasher(
          data.currentPassword,
          user.passwordHash,
        ))
      ) {
        throw new AppError("Senha atual incorreta", 400);
      }
      const existing = await this.userRepository.findByEmail(data.email);
      if (existing && existing.id !== userId)
        throw new AppError("E-mail já cadastrado", 409);
    }
    const updated = await this.userRepository.update(userId, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
    });
    return toPublicUser(updated);
  }

  private bumpTokenVersion(user: UserEntity) {
    return this.userRepository.update(user.id, {
      tokenVersion: { increment: 1 },
    });
  }

  private createAuthResult(user: UserEntity): AuthResult {
    return {
      user: toPublicUser(user),
      accessToken: this.signToken(
        {
          id: user.id.toString(),
          email: user.email,
          role: user.role,
          tv: user.tokenVersion,
        },
        { expiresIn: "8h" },
      ),
    };
  }
}
