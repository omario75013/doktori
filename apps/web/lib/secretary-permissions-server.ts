import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, secretaries } from "@doktori/db";
import { eq } from "drizzle-orm";
import { parsePermissions, type Section } from "@/lib/secretary-permissions";

/**
 * Require the current actor (doctor or secretary) has access to a section.
 * Doctors always pass. Secretaries are checked against their permissions JSON.
 */
export async function requireSectionAccess(
  section: Section
): Promise<{ doctorId: string; role: "doctor" | "secretary" } | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (session.user.role === "doctor") {
    return { doctorId: session.user.id, role: "doctor" };
  }
  if (session.user.role === "secretary") {
    const doctorId = session.user.doctorId;
    if (!doctorId) {
      return NextResponse.json({ error: "Secrétaire non associée" }, { status: 403 });
    }
    const [row] = await db
      .select({ permissions: secretaries.permissions })
      .from(secretaries)
      .where(eq(secretaries.id, session.user.id))
      .limit(1);
    if (!row) {
      return NextResponse.json({ error: "Secrétaire introuvable" }, { status: 403 });
    }
    const perms = parsePermissions(row.permissions);
    if (!perms[section]) {
      return NextResponse.json(
        { error: `Permission refusée pour la section ${section}` },
        { status: 403 }
      );
    }
    return { doctorId, role: "secretary" };
  }
  return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
}
