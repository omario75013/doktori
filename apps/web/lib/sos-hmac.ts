import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

export function signSosToken(sessionId: string): string {
  return createHmac("sha256", SECRET).update(sessionId).digest("hex");
}

export function verifySosToken(sessionId: string, sig: string): boolean {
  const expected = signSosToken(sessionId);
  if (expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}
