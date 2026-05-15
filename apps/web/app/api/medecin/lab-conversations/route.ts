import { NextRequest, NextResponse } from "next/server";
import { db, labConversations, labs } from "@doktori/db";
import { eq, or, and, desc } from "drizzle-orm";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";

// GET /api/medecin/lab-conversations — list conversations where this doctor is counterpart
export async function GET(req: NextRequest) {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;
  const { doctorId } = actor;

  const rows = await db
    .select()
    .from(labConversations)
    .where(eq(labConversations.counterpartDoctorId, doctorId))
    .orderBy(desc(labConversations.lastMessageAt));

  const enriched = await Promise.all(
    rows.map(async (c) => {
      const [labRow] = await db
        .select({ id: labs.id, name: labs.name })
        .from(labs)
        .where(eq(labs.id, c.labId))
        .limit(1);
      return { ...c, lab: labRow ?? null };
    })
  );

  return NextResponse.json({ conversations: enriched });
}

// POST /api/medecin/lab-conversations — doctor initiates conversation with a lab
export async function POST(req: NextRequest) {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;
  const { doctorId } = actor;

  const body = await req.json() as { labId: string; subject?: string };
  if (!body.labId) {
    return NextResponse.json({ error: "labId requis" }, { status: 400 });
  }

  // Check existing
  const [existing] = await db
    .select({ id: labConversations.id })
    .from(labConversations)
    .where(
      and(
        eq(labConversations.labId, body.labId),
        eq(labConversations.counterpartDoctorId, doctorId)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ conversationId: existing.id, created: false });
  }

  const [created] = await db
    .insert(labConversations)
    .values({
      labId: body.labId,
      counterpartDoctorId: doctorId,
      subject: body.subject ?? null,
    })
    .returning({ id: labConversations.id });

  return NextResponse.json({ conversationId: created.id, created: true }, { status: 201 });
}
