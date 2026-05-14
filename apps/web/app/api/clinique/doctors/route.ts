import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db, clinics, clinicDoctors, clinicInvitations, doctors } from "@doktori/db";
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

  // Look up doctor by email (may be null for off-platform invites)
  const [doctor] = await db
    .select({ id: doctors.id, name: doctors.name, email: doctors.email })
    .from(doctors)
    .where(eq(doctors.email, normalizedEmail))
    .limit(1);

  // Check if already in clinic (only meaningful when doctor is on platform)
  if (doctor) {
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
  }

  // Fetch clinic details for the invitation email
  const [clinicInfo] = await db
    .select({ name: clinics.name, city: clinics.city })
    .from(clinics)
    .where(eq(clinics.id, clinic.id))
    .limit(1);

  const clinicName = clinicInfo?.name ?? "une clinique";

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(clinicInvitations)
    .values({
      clinicId: clinic.id,
      doctorId: doctor?.id ?? null,
      email: doctor ? null : normalizedEmail,
      role: assignedRole,
      status: "pending",
      token,
      expiresAt,
    })
    .returning({ id: clinicInvitations.id });

  // Email the doctor — non-blocking
  const recipientEmail = doctor?.email ?? normalizedEmail;
  const doctorName = doctor?.name ?? "Médecin";
  void sendEmail({
    to: recipientEmail,
    subject: `Invitation à rejoindre ${clinicName} sur Doktori`,
    html: `
      <p>Bonjour Dr. ${doctorName},</p>
      <p>La clinique <strong>${clinicName}</strong> vous invite à rejoindre son équipe sur Doktori en tant que <strong>${assignedRole}</strong>.</p>
      <p>Connectez-vous à votre espace médecin et consultez vos invitations pour accepter ou refuser :</p>
      <p><a href="https://doktori.tn/doctor/clinic-invitations" style="background:#0d9488;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Voir mes invitations</a></p>
      <p>Cette invitation expire dans 7 jours.</p>
      <p>L'équipe Doktori</p>
    `,
  }).catch((err) => {
    console.error("[clinic-invite-email]", err);
  });

  return NextResponse.json({ success: true, invitationId: invitation?.id });
}
