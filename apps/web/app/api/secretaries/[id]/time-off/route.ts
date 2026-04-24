import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, secretaries, secretaryTimeOff } from "@doktori/db";
import { and, eq, desc } from "drizzle-orm";

async function ownerCheck(secretaryId: string) {
  const session = await auth();
  if (!session?.user?.id) return { err: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  const role = session.user.role;
  const doctorId =
    role === "doctor" ? session.user.id : role === "secretary" ? session.user.doctorId : null;
  if (!doctorId) return { err: NextResponse.json({ error: "Accès non autorisé" }, { status: 403 }) };
  const [row] = await db
    .select({ id: secretaries.id })
    .from(secretaries)
    .where(and(eq(secretaries.id, secretaryId), eq(secretaries.doctorId, doctorId)))
    .limit(1);
  if (!row) return { err: NextResponse.json({ error: "Introuvable" }, { status: 404 }) };
  return { doctorId, role: role as "doctor" | "secretary", session, secretaryId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ck = await ownerCheck(id);
  if ("err" in ck) return ck.err;

  const rows = await db
    .select()
    .from(secretaryTimeOff)
    .where(eq(secretaryTimeOff.secretaryId, id))
    .orderBy(desc(secretaryTimeOff.startDate));

  return NextResponse.json(rows);
}

const createSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(500).optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ck = await ownerCheck(id);
  if ("err" in ck) return ck.err;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée" }, { status: 400 });
  }
  if (parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json(
      { error: "La date de fin doit être après le début" },
      { status: 400 }
    );
  }

  const status = ck.role === "doctor" ? "approved" : "pending";

  const [created] = await db
    .insert(secretaryTimeOff)
    .values({
      secretaryId: id,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      reason: parsed.data.reason ?? null,
      status,
      decidedAt: ck.role === "doctor" ? new Date() : null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
