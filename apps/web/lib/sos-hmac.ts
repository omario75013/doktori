import { createHmac } from "node:crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

export function signSosToken(sessionId: string): string {
  return createHmac("sha256", SECRET).update(sessionId).digest("hex");
}

export function verifySosToken(sessionId: string, sig: string): boolean {
  const expected = signSosToken(sessionId);
  return expected === sig;
}
