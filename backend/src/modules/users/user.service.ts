import { AppError } from "../../shared/errors/app-errors.js";
import type { PasswordHasher } from "../../config/hash/password-hasher.js";
import type { UpdateUserDTO } from "./dto/update-user.dto.js";
import type {
  UserEntity,
  RegisterUserInput,
  PublicUser,
  CreateUserInput,
} from "./entity/user.entity.js";
import type { UserRepository } from "./repository/user.repository.js";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async registerUser(data: RegisterUserInput): Promise<PublicUser> {
    return this.create({
      ...data,
      role: "EMPLOYEE",
      active: true,
    });
  }

  async getUserById(id: bigint): Promise<PublicUser> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    return this.toPublicUser(user);
  }

  async getAllUsers(): Promise<PublicUser[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => this.toPublicUser(user));
  }

  async updateUser(id: bigint, data: UpdateUserDTO): Promise<PublicUser> {
    const { password, email, ...rest } = data;
    const updateData = {
      ...rest,
      ...(email === undefined ? {} : { email: this.normalizeEmail(email) }),
      ...(password === undefined
        ? {}
        : { passwordHash: await this.passwordHasher.createHasher(password) }),
    };

    const user = await this.userRepository.update(id, updateData);
    return this.toPublicUser(user);
  }

  async deleteUser(id: bigint): Promise<void> {
    await this.userRepository.update(id, { active: false });
  }

  private async create(data: CreateUserInput): Promise<PublicUser> {
    const { password, email, ...rest } = data;
    const user = await this.userRepository.create({
      ...rest,
      email: this.normalizeEmail(email),
      passwordHash: await this.passwordHasher.createHasher(password),
    });

    return this.toPublicUser(user);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toPublicUser(user: UserEntity): PublicUser {
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }
}
