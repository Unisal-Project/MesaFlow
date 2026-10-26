import { hash } from "bcrypt";
import type { UserRole } from "./entity/user.entity.js";
import { AppError } from "../../shared/errors/app-errors.js";
import type { CreateUserDTO } from "./dto/create-user.dto.js";
import type { UpdateUserDTO } from "./dto/update-user.dto.js";
import type { UserEntity } from "./entity/user.entity.js";
import type { UserRepository } from "./repository/user.repository.js";

export type PublicUser = Omit<UserEntity, "passwordHash">;
export type RegisterUserInput = Pick<UserEntity, "name" | "email"> & {
  password: string;
};

type CreateUserInput = RegisterUserInput & {
  role?: UserRole;
  active?: boolean;
};

const PASSWORD_HASH_ROUNDS = 12;

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(data: CreateUserDTO): Promise<PublicUser> {
    return this.create(data);
  }

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
        : { passwordHash: await hash(password, PASSWORD_HASH_ROUNDS) }),
    };

    const user = await this.userRepository.update(id, updateData);
    return this.toPublicUser(user);
  }

  async deleteUser(id: bigint): Promise<void> {
    await this.userRepository.delete(id);
  }

  private async create(data: CreateUserInput): Promise<PublicUser> {
    const { password, email, ...rest } = data;
    const user = await this.userRepository.create({
      ...rest,
      email: this.normalizeEmail(email),
      passwordHash: await hash(password, PASSWORD_HASH_ROUNDS),
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
