import { NextResponse } from "next/server";
import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, secretaries, secretarySchedules } from "@doktori/db";
import { and, eq } from "drizzle-orm";

async function ownerCheck(secretaryId: string, req?: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return { err: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  const role = user.role;
  const doctorId =
    role === "doctor" ? user.id : role === "secretary" ? (user as { doctorId?: string }).doctorId : null;
  if (!doctorId) return { err: NextResponse.json({ error: "Accès non autorisé" }, { status: 403 }) };
  const [row] = await db
    .select({ id: secretaries.id })
    .from(secretaries)
    .where(and(eq(secretaries.id, secretaryId), eq(secretaries.doctorId, doctorId)))
    .limit(1);
  if (!row) return { err: NextResponse.json({ error: "Secrétaire introuvable" }, { status: 404 }) };
  return { doctorId, role: role as "doctor" | "secretary", user };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ck = await ownerCheck(id, _req);
  if ("err" in ck) return ck.err;

  const rows = await db
    .select()
    .from(secretarySchedules)
    .where(eq(secretarySchedules.secretaryId, id))
    .orderBy(secretarySchedules.dayOfWeek, secretarySchedules.startTime);

  return NextResponse.json(rows);
}

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  isActive: z.boolean().optional().default(true),
});

const putSchema = z.object({ slots: z.array(slotSchema).max(50) });

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ck = await ownerCheck(id, req);
  if ("err" in ck) return ck.err;
  // Only doctor can edit schedule
  if (ck.role !== "doctor") {
    return NextResponse.json(
      { error: "Seul le médecin peut modifier le planning" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Validate start < end per slot
  for (const s of parsed.data.slots) {
    if (s.startTime >= s.endTime) {
      return NextResponse.json(
        { error: `Fin ≤ début pour jour ${s.dayOfWeek}` },
        { status: 400 }
      );
    }
  }

  // Replace-all strategy
  await db.delete(secretarySchedules).where(eq(secretarySchedules.secretaryId, id));
  if (parsed.data.slots.length > 0) {
    await db.insert(secretarySchedules).values(
      parsed.data.slots.map((s) => ({
        secretaryId: id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime.length === 5 ? s.startTime + ":00" : s.startTime,
        endTime: s.endTime.length === 5 ? s.endTime + ":00" : s.endTime,
        isActive: s.isActive ?? true,
      }))
    );
  }

  return NextResponse.json({ ok: true, count: parsed.data.slots.length });
}
