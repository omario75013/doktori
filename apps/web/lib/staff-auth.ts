import { verify } from "jsonwebtoken";
import { NextRequest } from "next/server";

export type StaffPayload =
  | { id: string; role: "doctor"; name?: string; doctorId?: never; clinicId?: never }
  | { id: string; role: "secretary"; name?: string; doctorId: string; clinicId: string | null }
  | { id: string; role: "admin" }
  | { id: string; role: "clinic" };

/**
 * Extract a staff user from a Bearer JWT on the request. Returns null if the
 * token is missing, invalid, or not a staff role. Mirrors `patient-auth.ts`.
 *
 * Mobile (and any non-browser client) authenticates against `/api/auth/staff-login`
 * to get this JWT; web keeps using NextAuth cookies.
 */
export function getStaffFromRequest(req: NextRequest | Request): StaffPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const payload = verify(token, process.env.NEXTAUTH_SECRET!) as StaffPayload;
    if (!payload || typeof payload !== "object") return null;
    if (!["doctor", "secretary", "admin", "clinic"].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}
