import { generateSecret as _generateSecret, generateURI, verifySync } from "otplib";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const ISSUER = "Doktori";

export function generateSecret(): string {
  return _generateSecret();
}

export function totpUri(email: string, secret: string): string {
  return generateURI({
    strategy: "totp",
    issuer: ISSUER,
    label: email,
    secret,
    algorithm: "sha1",
    digits: 6,
    period: 30,
  });
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    const result = verifySync({
      strategy: "totp",
      secret,
      token,
      epochTolerance: 30, // 1 time-step tolerance (±30s)
    });
    return result.valid;
  } catch {
    return false;
  }
}

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
