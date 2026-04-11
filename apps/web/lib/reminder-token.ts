import crypto from "node:crypto";

// HMAC-signed stateless token for SMS reminder confirm/cancel links.
// Format: <base64url(uuid_bytes)>.<12-char-hmac>
// No expiry field — reminders are sent the day before, and the endpoint
// also checks that the appointment hasn't started / isn't already cancelled.

const SECRET = process.env.NEXTAUTH_SECRET || process.env.REMINDER_SECRET;

function getSecret(): string {
  if (!SECRET) throw new Error("NEXTAUTH_SECRET is required for reminder tokens");
  return SECRET;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(`reminder:${data}`).digest("base64url").slice(0, 12);
}

function uuidToB64(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  return Buffer.from(hex, "hex").toString("base64url");
}

function b64ToUuid(b64: string): string | null {
  try {
    const hex = Buffer.from(b64, "base64url").toString("hex");
    if (hex.length !== 32) return null;
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return null;
  }
}

export function signReminderToken(appointmentId: string): string {
  const b = uuidToB64(appointmentId);
  return `${b}.${sign(b)}`;
}

export function verifyReminderToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b, sig] = parts;
  const expected = sign(b);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return b64ToUuid(b);
}
