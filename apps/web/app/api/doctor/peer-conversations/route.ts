import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorConversations, doctorMessages, doctors } from "@doktori/db";
import { and, eq, or, desc, sql } from "drizzle-orm";

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const me = user.id;

  const rows = (await db.execute(sql`
    SELECT
      c.id,
      CASE WHEN c.doctor_a_id = ${me} THEN c.doctor_b_id ELSE c.doctor_a_id END AS "peerId",
      d.name AS "peerName",
      d.photo_url AS "peerPhotoUrl",
      d.specialty AS "peerSpecialty",
      c.last_message_at AS "lastMessageAt",
      (
        SELECT body FROM doctor_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS "lastMessage",
      (
        SELECT count(*)::int FROM doctor_messages m
        WHERE m.conversation_id = c.id
          AND m.read_at IS NULL
          AND m.sender_id <> ${me}
      ) AS "unread"
    FROM doctor_conversations c
    INNER JOIN doctors d
      ON d.id = CASE WHEN c.doctor_a_id = ${me} THEN c.doctor_b_id ELSE c.doctor_a_id END
    WHERE c.doctor_a_id = ${me} OR c.doctor_b_id = ${me}
    ORDER BY c.last_message_at DESC NULLS LAST
  `));

  return NextResponse.json(rows);
}

const createSchema = z.object({ peerId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "peerId requis" }, { status: 400 });
  }
  if (parsed.data.peerId === user.id) {
    return NextResponse.json({ error: "Impossible" }, { status: 400 });
  }

  const [a, b] = pair(user.id, parsed.data.peerId);

  const [existing] = await db
    .select()
    .from(doctorConversations)
    .where(
      and(
        eq(doctorConversations.doctorAId, a),
        eq(doctorConversations.doctorBId, b)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ ok: true, conversation: existing });
  }

  const [created] = await db
    .insert(doctorConversations)
    .values({ doctorAId: a, doctorBId: b })
    .returning();

  return NextResponse.json({ ok: true, conversation: created }, { status: 201 });
}
