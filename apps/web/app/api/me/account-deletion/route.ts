import { NextRequest, NextResponse } from "next/server";
import { db, accountDeletionRequests } from "@doktori/db";
import { eq, isNull, and, desc } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

// POST /api/me/account-deletion — schedule deletion in 30 days
export async function POST(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Check if there's already a pending request
  const [existing] = await db
    .select()
    .from(accountDeletionRequests)
    .where(
      and(
        eq(accountDeletionRequests.patientId, session.id),
        isNull(accountDeletionRequests.cancelledAt),
        isNull(accountDeletionRequests.executedAt)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Une demande de suppression est déjà en cours" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

  const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [request] = await db
    .insert(accountDeletionRequests)
    .values({
      patientId: session.id,
      reason,
      scheduledAt,
    })
    .returning();

  return NextResponse.json({ request }, { status: 201 });
}

// GET /api/me/account-deletion — get current pending request
export async function GET(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [request] = await db
    .select()
    .from(accountDeletionRequests)
    .where(
      and(
        eq(accountDeletionRequests.patientId, session.id),
        isNull(accountDeletionRequests.cancelledAt),
        isNull(accountDeletionRequests.executedAt)
      )
    )
    .orderBy(desc(accountDeletionRequests.requestedAt))
    .limit(1);

  return NextResponse.json({ request: request ?? null });
}

// DELETE /api/me/account-deletion — cancel pending request
export async function DELETE(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [pending] = await db
    .select()
    .from(accountDeletionRequests)
    .where(
      and(
        eq(accountDeletionRequests.patientId, session.id),
        isNull(accountDeletionRequests.cancelledAt),
        isNull(accountDeletionRequests.executedAt)
      )
    )
    .orderBy(desc(accountDeletionRequests.requestedAt))
    .limit(1);

  if (!pending) {
    return NextResponse.json({ error: "Aucune demande en cours" }, { status: 404 });
  }

  await db
    .update(accountDeletionRequests)
    .set({ cancelledAt: new Date() })
    .where(eq(accountDeletionRequests.id, pending.id));

  return NextResponse.json({ success: true });
}
