import type {
  UserEntity,
  CreateUserData,
  UpdateUserData,
} from "../entity/user.entity.js";

export interface UserRepository {
  create(data: CreateUserData): Promise<UserEntity>;

  findById(id: bigint): Promise<UserEntity | null>;

  findByEmail(email: string): Promise<UserEntity | null>;

  findAll(): Promise<UserEntity[]>;

  update(id: bigint, data: UpdateUserData): Promise<UserEntity>;
}
