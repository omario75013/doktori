import { NextRequest, NextResponse } from "next/server";
import { db, patients } from "@doktori/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getPatientFromRequest } from "@/lib/patient-auth";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(72),
});

export async function POST(req: NextRequest) {
  const payload = getPatientFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Mot de passe trop court (min 8 caractères)" },
      { status: 400 },
    );
  }

  const [row] = await db
    .select({ passwordHash: patients.passwordHash })
    .from(patients)
    .where(eq(patients.id, payload.id))
    .limit(1);

  // If user already has a password set, require currentPassword to match.
  if (row?.passwordHash) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ error: "Mot de passe actuel requis" }, { status: 400 });
    }
    const ok = await bcrypt.compare(parsed.data.currentPassword, row.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
    }
  }

  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.update(patients).set({ passwordHash: hash }).where(eq(patients.id, payload.id));

  return NextResponse.json({ ok: true });
}
