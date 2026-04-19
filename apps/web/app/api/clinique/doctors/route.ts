import { NextResponse } from "next/server";
import { db, clinics, clinicDoctors, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { sendEmail } from "@/lib/email";

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const rows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
      email: doctors.email,
      photoUrl: doctors.photoUrl,
      role: clinicDoctors.role,
      joinedAt: clinicDoctors.createdAt,
    })
    .from(clinicDoctors)
    .innerJoin(doctors, eq(clinicDoctors.doctorId, doctors.id))
    .where(eq(clinicDoctors.clinicId, clinic.id));

  return NextResponse.json({ doctors: rows });
}

// CONSENT NOTE: Doctors are currently added directly to clinic_doctors without an acceptance step.
// A proper consent flow requires a clinic_invitations table with status (pending|accepted|declined)
// and a doctor-facing acceptance endpoint. This is tracked as a required migration before scaling.
// In the interim, an email notification is sent to the doctor immediately upon addition so they
// are aware and can contact support to be removed if they did not consent.
export async function POST(req: Request) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { email, role } = body as { email?: string; role?: string };

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const assignedRole = role === "admin" ? "admin" : "member";

  // Verify the doctor exists before adding
  const [doctor] = await db
    .select({ id: doctors.id, name: doctors.name, email: doctors.email })
    .from(doctors)
    .where(eq(doctors.email, normalizedEmail))
    .limit(1);

  if (!doctor) {
    return NextResponse.json(
      { error: "Aucun médecin trouvé avec cet email" },
      { status: 404 }
    );
  }

  // Check if already in clinic
  const [existing] = await db
    .select({ id: clinicDoctors.id })
    .from(clinicDoctors)
    .where(
      and(
        eq(clinicDoctors.clinicId, clinic.id),
        eq(clinicDoctors.doctorId, doctor.id)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Ce médecin fait déjà partie de la clinique" },
      { status: 409 }
    );
  }

  // Fetch clinic details for the notification email
  const [clinicInfo] = await db
    .select({ name: clinics.name })
    .from(clinics)
    .where(eq(clinics.id, clinic.id))
    .limit(1);

  const clinicName = clinicInfo?.name ?? "une clinique";

  await db.insert(clinicDoctors).values({
    clinicId: clinic.id,
    doctorId: doctor.id,
    role: assignedRole,
  });

  // Notify the doctor by email — non-blocking so the response is not delayed
  if (doctor.email) {
    void sendEmail({
      to: doctor.email,
      subject: `Vous avez été ajouté(e) à ${clinicName} sur Doktori`,
      html: `
        <p>Bonjour Dr. ${doctor.name},</p>
        <p>Vous avez été ajouté(e) en tant que <strong>${assignedRole}</strong> à la clinique <strong>${clinicName}</strong> sur Doktori.</p>
        <p>Si vous n'avez pas consenti à rejoindre cette clinique ou si vous souhaitez être retiré(e), veuillez contacter le support à <a href="mailto:support@doktori.tn">support@doktori.tn</a>.</p>
        <p>L'équipe Doktori</p>
      `,
    }).catch((err) => {
      console.error("[clinic-invite-email]", err);
    });
  }

  return NextResponse.json({ success: true, doctor: { id: doctor.id, name: doctor.name } });
}
