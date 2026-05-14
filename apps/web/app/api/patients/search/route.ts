import { NextRequest, NextResponse } from "next/server";
import { db, patients } from "@doktori/db";
import { ilike, or } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// GET ?q= — search patients by phone, email, or name substring.
// Accessible to: doctor, lab, admin.
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!["doctor", "lab", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ patients: [] });
  }

  const like = `%${q}%`;

  const rows = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
    })
    .from(patients)
    .where(
      or(
        ilike(patients.phone, like),
        ilike(patients.email, like),
        ilike(patients.name, like),
      ),
    )
    .limit(10);

  return NextResponse.json({ patients: rows });
}
