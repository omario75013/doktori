import "server-only";
import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";

export type CallerType = "doctor" | "secretary" | "patient";

export async function resolveCaller(
  req?: NextRequest
): Promise<
  | { err: NextResponse }
  | { type: CallerType; id: string; doctorId: string | null }
> {
  const user = await requireAuth(req);
  if (!user) {
    return { err: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  const role = user.role;
  if (role === "doctor") {
    return { type: "doctor", id: user.id, doctorId: user.id };
  }
  if (role === "secretary") {
    const doctorId = (user as { doctorId?: string }).doctorId ?? null;
    if (!doctorId) return { err: NextResponse.json({ error: "Secrétaire non associée" }, { status: 403 }) };
    return { type: "secretary", id: user.id, doctorId };
  }
  if (role === "patient") {
    return { type: "patient", id: user.id, doctorId: null };
  }
  return { err: NextResponse.json({ error: "Accès non autorisé" }, { status: 403 }) };
}
