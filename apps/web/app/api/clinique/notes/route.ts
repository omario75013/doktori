import { NextResponse } from "next/server";
import { z } from "zod";
import { db, clinicNotes } from "@doktori/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";

const createSchema = z.object({
  title: z.string().max(255).optional(),
  body: z.string().min(1),
  pinned: z.boolean().optional(),
});

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const notes = await db
    .select()
    .from(clinicNotes)
    .where(eq(clinicNotes.clinicId, clinic.id))
    .orderBy(
      desc(sql`${clinicNotes.pinned}::int`),
      desc(clinicNotes.createdAt)
    );

  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const { title, body: noteBody, pinned } = parsed.data;

  const [note] = await db
    .insert(clinicNotes)
    .values({
      clinicId: clinic.id,
      authorType: "clinic",
      title: title ?? null,
      body: noteBody,
      pinned: pinned ?? false,
    })
    .returning();

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "note.create",
    targetType: "note",
    targetId: note?.id ?? null,
  });

  return NextResponse.json({ note }, { status: 201 });
}
