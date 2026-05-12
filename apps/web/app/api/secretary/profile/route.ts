import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, secretaries } from "@doktori/db";
import { eq } from "drizzle-orm";

async function requireSelfSecretary() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "secretary") {
    return { err: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  return { secretaryId: session.user.id };
}

export async function GET() {
  const auth = await requireSelfSecretary();
  if ("err" in auth) return auth.err;

  const [row] = await db
    .select({
      id: secretaries.id,
      name: secretaries.name,
      email: secretaries.email,
      phone: secretaries.phone,
      dateOfBirth: secretaries.dateOfBirth,
      yearsOfExperience: secretaries.yearsOfExperience,
      hireDate: secretaries.hireDate,
      photoUrl: secretaries.photoUrl,
      bio: secretaries.bio,
      permissions: secretaries.permissions,
      monthlyDayOffAllowance: secretaries.monthlyDayOffAllowance,
      // doctorId so the secretary client can join the waiting-room WS
      // room that's keyed by doctor id.
      doctorId: secretaries.doctorId,
    })
    .from(secretaries)
    .where(eq(secretaries.id, auth.secretaryId))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(row);
}

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    phone: z.string().trim().max(30).optional().nullable(),
    bio: z.string().trim().max(2000).optional().nullable(),
    photoUrl: z.string().url().optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0);

export async function PATCH(req: Request) {
  const auth = await requireSelfSecretary();
  if ("err" in auth) return auth.err;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) update[k] = v;
  }
  await db.update(secretaries).set(update).where(eq(secretaries.id, auth.secretaryId));
  return NextResponse.json({ ok: true });
}
