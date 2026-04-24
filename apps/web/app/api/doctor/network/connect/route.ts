import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorConnections, doctorNotifications } from "@doktori/db";
import { and, eq, or } from "drizzle-orm";

const bodySchema = z.object({ addresseeId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const session = { user };
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "addresseeId requis" }, { status: 400 });
  }
  const { addresseeId } = parsed.data;
  if (addresseeId === session.user.id) {
    return NextResponse.json(
      { error: "Impossible de se connecter à soi-même" },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(doctorConnections)
    .where(
      or(
        and(
          eq(doctorConnections.requesterId, session.user.id),
          eq(doctorConnections.addresseeId, addresseeId)
        ),
        and(
          eq(doctorConnections.requesterId, addresseeId),
          eq(doctorConnections.addresseeId, session.user.id)
        )
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ ok: true, connection: existing, already: true });
  }

  const [created] = await db
    .insert(doctorConnections)
    .values({
      requesterId: session.user.id,
      addresseeId,
      status: "pending",
    })
    .returning();

  await db.insert(doctorNotifications).values({
    doctorId: addresseeId,
    type: "connection_request",
    payload: { connectionId: created.id, requesterId: session.user.id },
  });

  return NextResponse.json({ ok: true, connection: created }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const session = { user };

  const rows = await db
    .select()
    .from(doctorConnections)
    .where(
      or(
        eq(doctorConnections.requesterId, session.user.id),
        eq(doctorConnections.addresseeId, session.user.id)
      )
    );

  return NextResponse.json(rows);
}
