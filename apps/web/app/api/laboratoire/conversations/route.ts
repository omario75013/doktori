import { NextRequest, NextResponse } from "next/server";
import { db, labConversations, labs, doctors } from "@doktori/db";
import { eq, and, or, desc } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

// GET /api/laboratoire/conversations — list for current lab
export async function GET(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const rows = await db
    .select()
    .from(labConversations)
    .where(eq(labConversations.labId, labId))
    .orderBy(desc(labConversations.lastMessageAt));

  // Enrich with counterpart info
  const enriched = await Promise.all(
    rows.map(async (c) => {
      let counterpart: { kind: string; id: string; name: string } | null = null;
      if (c.counterpartLabId) {
        const [l] = await db.select({ id: labs.id, name: labs.name }).from(labs).where(eq(labs.id, c.counterpartLabId)).limit(1);
        if (l) counterpart = { kind: "lab", id: l.id, name: l.name };
      } else if (c.counterpartDoctorId) {
        const [d] = await db.select({ id: doctors.id, name: doctors.name }).from(doctors).where(eq(doctors.id, c.counterpartDoctorId)).limit(1);
        if (d) counterpart = { kind: "doctor", id: d.id, name: d.name };
      }
      return { ...c, counterpart };
    })
  );

  return NextResponse.json({ conversations: enriched });
}

// POST /api/laboratoire/conversations — create or return existing
export async function POST(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const body = await req.json() as {
    counterpartType: "lab" | "doctor";
    counterpartId: string;
    subject?: string;
  };

  if (!body.counterpartType || !body.counterpartId) {
    return NextResponse.json({ error: "counterpartType + counterpartId requis" }, { status: 400 });
  }

  // Check existing
  const existing = await db
    .select({ id: labConversations.id })
    .from(labConversations)
    .where(
      and(
        eq(labConversations.labId, labId),
        body.counterpartType === "lab"
          ? eq(labConversations.counterpartLabId, body.counterpartId)
          : eq(labConversations.counterpartDoctorId, body.counterpartId)
      )
    )
    .limit(1);

  if (existing[0]) {
    return NextResponse.json({ conversationId: existing[0].id, created: false });
  }

  const [created] = await db
    .insert(labConversations)
    .values({
      labId,
      counterpartLabId: body.counterpartType === "lab" ? body.counterpartId : null,
      counterpartDoctorId: body.counterpartType === "doctor" ? body.counterpartId : null,
      subject: body.subject ?? null,
    })
    .returning({ id: labConversations.id });

  return NextResponse.json({ conversationId: created.id, created: true }, { status: 201 });
}
