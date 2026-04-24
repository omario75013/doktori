import { authenticator } from "otplib";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

authenticator.options = { window: 1, step: 30 };

const ISSUER = "Doktori";

export function generateSecret(): string {
  return authenticator.generateSecret();
}

export function totpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

/**
 * Generate 10 readable backup codes ("a1b2-c3d4-e5f6") and return both
 * plaintext (to show ONCE to the user) and hashed (to store).
 */
export async function generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
  const plain: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raw = crypto.randomBytes(6).toString("hex");
    plain.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`);
  }
  const hashed = await Promise.all(plain.map((c) => bcrypt.hash(c, 10)));
  return { plain, hashed };
}

export async function verifyBackupCode(
  plain: string,
  storedHashes: string[]
): Promise<number> {
  for (let i = 0; i < storedHashes.length; i++) {
    if (await bcrypt.compare(plain, storedHashes[i])) return i;
  }
  return -1;
}
