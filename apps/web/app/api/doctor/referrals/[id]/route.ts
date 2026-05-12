import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, patientReferrals, doctorNotifications } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// PATCH /api/doctor/referrals/[id]
// Receiving doctor accepts / declines / completes a patient referral.
// Authorization: only the `to_doctor_id` of the referral can transition it.
// Each transition writes a doctor_notifications row back to the sender so
// the originating doctor sees the response in their bell.

const schema = z.object({
  action: z.enum(["accept", "decline", "complete"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  }

  const [ref] = await db
    .select()
    .from(patientReferrals)
    .where(
      and(
        eq(patientReferrals.id, id),
        eq(patientReferrals.toDoctorId, user.id),
      ),
    )
    .limit(1);
  if (!ref) {
    return NextResponse.json({ error: "Référencement introuvable" }, { status: 404 });
  }

  // Map action → next status. Guard against double-acting on a closed row.
  const nextStatus =
    parsed.data.action === "accept"
      ? "accepted"
      : parsed.data.action === "decline"
        ? "declined"
        : "completed";
  if (
    (parsed.data.action === "accept" && ref.status !== "pending") ||
    (parsed.data.action === "decline" && ref.status !== "pending") ||
    (parsed.data.action === "complete" && ref.status !== "accepted")
  ) {
    return NextResponse.json(
      { error: "Transition non autorisée depuis le statut actuel" },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(patientReferrals)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(patientReferrals.id, id))
    .returning();

  // Notify the originating doctor.
  try {
    await db.insert(doctorNotifications).values({
      doctorId: ref.fromDoctorId,
      type:
        nextStatus === "accepted"
          ? "referral_accepted"
          : nextStatus === "declined"
            ? "referral_declined"
            : "referral_completed",
      payload: {
        referralId: id,
        byDoctorId: user.id,
        patientId: ref.patientId,
      },
    });
  } catch (e) {
    console.error("[referrals/[id]] notify failed", e);
  }

  return NextResponse.json({ ok: true, referral: updated });
}
