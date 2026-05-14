import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, clinicInvitations, clinicDoctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

const bodySchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.role !== "doctor") {
    return NextResponse.json({ error: "Accès réservé aux médecins" }, { status: 403 });
  }

  const { id } = await params;
  const doctorId = user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const { action } = parsed.data;

  // Fetch invitation — must belong to this doctor and be pending
  const [invitation] = await db
    .select()
    .from(clinicInvitations)
    .where(
      and(
        eq(clinicInvitations.id, id),
        eq(clinicInvitations.doctorId, doctorId),
        eq(clinicInvitations.status, "pending")
      )
    )
    .limit(1);

  if (!invitation) {
    return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
  }

  // Check not expired
  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Cette invitation a expiré" }, { status: 410 });
  }

  const newStatus = action === "accept" ? "accepted" : "declined";

  const [updated] = await db
    .update(clinicInvitations)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(clinicInvitations.id, id))
    .returning();

  if (action === "accept") {
    // Insert into clinic_doctors (ignore conflict — idempotent)
    await db
      .insert(clinicDoctors)
      .values({
        clinicId: invitation.clinicId,
        doctorId,
        role: invitation.role,
      })
      .onConflictDoNothing();
  }

  return NextResponse.json({ invitation: updated });
}
