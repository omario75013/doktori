import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";

/**
 * Resolve the current staff member (doctor or secretary).
 * Returns the effective cabinet doctorId + the caller's identity.
 *
 * Accepts NextAuth cookie (web) or Bearer JWT (mobile) via requireAuth.
 */
export async function requireStaff(req?: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return { err: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  if (user.role === "doctor") {
    return {
      doctorId: user.id,
      selfType: "doctor" as const,
      selfId: user.id,
    };
  }
  if (user.role === "secretary") {
    const doctorId = (user as { doctorId?: string }).doctorId;
    if (!doctorId) {
      return { err: NextResponse.json({ error: "Accès non autorisé" }, { status: 403 }) };
    }
    return {
      doctorId,
      selfType: "secretary" as const,
      selfId: user.id,
    };
  }
  return { err: NextResponse.json({ error: "Accès non autorisé" }, { status: 403 }) };
}

export function orderPair(
  aType: "doctor" | "secretary",
  aId: string,
  bType: "doctor" | "secretary",
  bId: string
) {
  const keyA = `${aType}:${aId}`;
  const keyB = `${bType}:${bId}`;
  if (keyA < keyB) {
    return { memberAType: aType, memberAId: aId, memberBType: bType, memberBId: bId };
  }
  return { memberAType: bType, memberAId: bId, memberBType: aType, memberBId: aId };
}
