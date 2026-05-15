import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, clinicInvitations, clinicDoctors, clinics, doctorPractices } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { auth } from "@/lib/auth";
import { rejectClinicDoctor } from "@/lib/clinic-doctor-guard";
import { logClinicAudit } from "@/lib/audit";

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
  // Clinic-created doctors cannot accept other clinic invitations
  const session = await auth();
  const clinicRejection = rejectClinicDoctor(session);
  if (clinicRejection) return clinicRejection;

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

  let practiceId: string | null = null;

  if (action === "accept") {
    // Upsert clinic_doctors membership
    await db
      .insert(clinicDoctors)
      .values({
        clinicId: invitation.clinicId,
        doctorId,
        role: invitation.role,
      })
      .onConflictDoNothing();

    // Auto-create doctor_practices row if none exists for this (doctor, clinic) pair
    const [existingPractice] = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(
        and(
          eq(doctorPractices.doctorId, doctorId),
          eq(doctorPractices.clinicId, invitation.clinicId)
        )
      )
      .limit(1);

    if (existingPractice) {
      practiceId = existingPractice.id;
    } else {
      // Fetch clinic details for the practice row
      const [clinicInfo] = await db
        .select({ name: clinics.name, address: clinics.address, city: clinics.city, phone: clinics.phone })
        .from(clinics)
        .where(eq(clinics.id, invitation.clinicId))
        .limit(1);

      if (clinicInfo) {
        const [practice] = await db
          .insert(doctorPractices)
          .values({
            doctorId,
            clinicId: invitation.clinicId,
            name: clinicInfo.name,
            address: clinicInfo.address,
            city: clinicInfo.city,
            phone: clinicInfo.phone ?? "",
            isPrimary: false,
            isActive: true,
            kind: "clinic",
            photos: [],
          })
          .returning({ id: doctorPractices.id });

        practiceId = practice?.id ?? null;
      }
    }

    void logClinicAudit({
      clinicId: invitation.clinicId,
      actorType: "doctor",
      actorId: doctorId,
      action: "doctor_join",
      targetType: "clinic",
      targetId: invitation.clinicId,
      metadata: { invitationId: invitation.id, practiceId },
    });
  } else {
    void logClinicAudit({
      clinicId: invitation.clinicId,
      actorType: "doctor",
      actorId: doctorId,
      action: "doctor_decline",
      targetType: "invitation",
      targetId: invitation.id,
    });
  }

  return NextResponse.json({ invitation: updated, practiceId });
}
