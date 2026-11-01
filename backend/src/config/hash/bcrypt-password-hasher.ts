import { PasswordHasher } from "./password-hasher.js";
import { hash, compare } from "bcrypt";

export class BcryptPasswordHasher implements PasswordHasher {
  createHasher(password: string): Promise<string> {
    const passwordHash = hash(password, 12);

    return passwordHash;
  }

  compareHasher(password: string, passwordHash: string): Promise<boolean> {
    const result = compare(password, passwordHash);

    return result;
  }
}
