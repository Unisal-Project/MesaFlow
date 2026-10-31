export interface PasswordHasher {
  createHasher(password: string): Promise<string>;

  compareHasher(password: string, passwordHash: string): Promise<boolean>;
}
