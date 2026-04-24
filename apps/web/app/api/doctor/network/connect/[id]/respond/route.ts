import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorConnections, doctorNotifications } from "@doktori/db";
import { and, eq } from "drizzle-orm";

const bodySchema = z.object({ action: z.enum(["accept", "decline", "block"]) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const session = { user };
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  }

  const [conn] = await db
    .select()
    .from(doctorConnections)
    .where(
      and(
        eq(doctorConnections.id, id),
        eq(doctorConnections.addresseeId, session.user.id)
      )
    )
    .limit(1);

  if (!conn) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  if (parsed.data.action === "accept") {
    await db
      .update(doctorConnections)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(doctorConnections.id, id));
    await db.insert(doctorNotifications).values({
      doctorId: conn.requesterId,
      type: "connection_accepted",
      payload: { connectionId: id, byDoctorId: session.user.id },
    });
  } else if (parsed.data.action === "decline") {
    await db.delete(doctorConnections).where(eq(doctorConnections.id, id));
  } else if (parsed.data.action === "block") {
    await db
      .update(doctorConnections)
      .set({ status: "blocked" })
      .where(eq(doctorConnections.id, id));
  }

  return NextResponse.json({ ok: true });
}
