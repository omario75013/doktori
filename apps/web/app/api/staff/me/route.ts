import { NextResponse, NextRequest } from "next/server";
import { db, secretaries } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/staff-context";
import { parsePermissions, type SecretaryPermissions } from "@/lib/secretary-permissions";

export async function GET(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;

  if (ctx.selfType === "doctor") {
    // Doctors have all permissions
    const allTrue = Object.fromEntries(
      [
        "agenda", "patients", "patientsCreate", "patientsEdit", "patientsDelete",
        "rendezVous", "rendezVousCreate", "rendezVousEdit", "rendezVousCancel",
        "messagerie", "wallet", "factures", "motifs", "cabinets", "teleconsult",
      ].map((k) => [k, true])
    ) as SecretaryPermissions;
    return NextResponse.json({ role: "doctor", permissions: allTrue });
  }

  const [row] = await db
    .select({ permissions: secretaries.permissions })
    .from(secretaries)
    .where(eq(secretaries.id, ctx.selfId))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    role: "secretary",
    permissions: parsePermissions(row.permissions),
  });
}
