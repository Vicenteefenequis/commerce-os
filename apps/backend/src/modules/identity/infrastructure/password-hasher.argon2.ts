import * as argon2 from "argon2";
import type { PasswordHasherPort } from "../domain/ports.js";

export class Argon2PasswordHasher implements PasswordHasherPort {
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword);
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, plainPassword);
    } catch {
      return false;
    }
  }
}
