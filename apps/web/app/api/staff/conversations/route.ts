import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db, staffConversations, doctors, secretaries, staffMessages } from "@doktori/db";
import { and, eq, or, desc, isNull, ne, sql } from "drizzle-orm";
import { requireStaff, orderPair } from "@/lib/staff-context";

export async function GET(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;

  // All conversations where caller is a member and scoped to same doctor cabinet
  const rows = (await db.execute(sql`
    SELECT
      c.id,
      c.doctor_id      AS "doctorId",
      c.last_message_at AS "lastMessageAt",
      c.member_a_type  AS "memberAType",
      c.member_a_id    AS "memberAId",
      c.member_b_type  AS "memberBType",
      c.member_b_id    AS "memberBId",
      (SELECT body FROM staff_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC LIMIT 1) AS "lastMessage",
      (SELECT count(*)::int FROM staff_messages m
        WHERE m.conversation_id = c.id
          AND m.read_at IS NULL
          AND NOT (m.sender_type = ${ctx.selfType} AND m.sender_id = ${ctx.selfId})
      ) AS "unread"
    FROM staff_conversations c
    WHERE c.doctor_id = ${ctx.doctorId}
      AND (
        (c.member_a_type = ${ctx.selfType} AND c.member_a_id = ${ctx.selfId})
        OR
        (c.member_b_type = ${ctx.selfType} AND c.member_b_id = ${ctx.selfId})
      )
    ORDER BY c.last_message_at DESC NULLS LAST
  `)) as unknown as Array<{
    id: string;
    doctorId: string;
    lastMessageAt: string | null;
    memberAType: "doctor" | "secretary";
    memberAId: string;
    memberBType: "doctor" | "secretary";
    memberBId: string;
    lastMessage: string | null;
    unread: number;
  }>;

  // Enrich with peer identity + photo/name
  const peerDoctorIds = new Set<string>();
  const peerSecretaryIds = new Set<string>();
  for (const r of rows) {
    const peerIsA = !(r.memberAType === ctx.selfType && r.memberAId === ctx.selfId);
    const peerType = peerIsA ? r.memberAType : r.memberBType;
    const peerId = peerIsA ? r.memberAId : r.memberBId;
    if (peerType === "doctor") peerDoctorIds.add(peerId);
    else peerSecretaryIds.add(peerId);
  }

  const doctorMap = new Map<string, { name: string; photoUrl: string | null }>();
  if (peerDoctorIds.size > 0) {
    const list = await db
      .select({ id: doctors.id, name: doctors.name, photoUrl: doctors.photoUrl })
      .from(doctors);
    for (const d of list) {
      if (peerDoctorIds.has(d.id))
        doctorMap.set(d.id, { name: d.name, photoUrl: d.photoUrl });
    }
  }
  const secMap = new Map<string, { name: string; photoUrl: string | null }>();
  if (peerSecretaryIds.size > 0) {
    const list = await db
      .select({ id: secretaries.id, name: secretaries.name, photoUrl: secretaries.photoUrl })
      .from(secretaries);
    for (const s of list) {
      if (peerSecretaryIds.has(s.id))
        secMap.set(s.id, { name: s.name, photoUrl: s.photoUrl });
    }
  }

  const enriched = rows.map((r) => {
    const peerIsA = !(r.memberAType === ctx.selfType && r.memberAId === ctx.selfId);
    const peerType = peerIsA ? r.memberAType : r.memberBType;
    const peerId = peerIsA ? r.memberAId : r.memberBId;
    const info =
      peerType === "doctor" ? doctorMap.get(peerId) : secMap.get(peerId);
    return {
      id: r.id,
      peerType,
      peerId,
      peerName: info?.name ?? "Inconnu",
      peerPhotoUrl: info?.photoUrl ?? null,
      lastMessage: r.lastMessage,
      lastMessageAt: r.lastMessageAt,
      unread: Number(r.unread ?? 0),
    };
  });

  return NextResponse.json(enriched);
}

const createSchema = z.object({
  peerType: z.enum(["doctor", "secretary"]),
  peerId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "peerType / peerId requis" }, { status: 400 });
  }

  // Validate peer belongs to same cabinet
  if (parsed.data.peerType === "doctor") {
    if (parsed.data.peerId !== ctx.doctorId) {
      return NextResponse.json({ error: "Médecin inconnu" }, { status: 403 });
    }
  } else {
    const [s] = await db
      .select({ id: secretaries.id })
      .from(secretaries)
      .where(
        and(eq(secretaries.id, parsed.data.peerId), eq(secretaries.doctorId, ctx.doctorId))
      )
      .limit(1);
    if (!s) return NextResponse.json({ error: "Secrétaire inconnue" }, { status: 403 });
  }
  if (parsed.data.peerType === ctx.selfType && parsed.data.peerId === ctx.selfId) {
    return NextResponse.json({ error: "Impossible" }, { status: 400 });
  }

  const pair = orderPair(ctx.selfType, ctx.selfId, parsed.data.peerType, parsed.data.peerId);

  const [existing] = await db
    .select()
    .from(staffConversations)
    .where(
      and(
        eq(staffConversations.doctorId, ctx.doctorId),
        eq(staffConversations.memberAType, pair.memberAType),
        eq(staffConversations.memberAId, pair.memberAId),
        eq(staffConversations.memberBType, pair.memberBType),
        eq(staffConversations.memberBId, pair.memberBId)
      )
    )
    .limit(1);

  if (existing) return NextResponse.json({ ok: true, conversation: existing });

  const [created] = await db
    .insert(staffConversations)
    .values({ doctorId: ctx.doctorId, ...pair })
    .returning();
  return NextResponse.json({ ok: true, conversation: created }, { status: 201 });
}
