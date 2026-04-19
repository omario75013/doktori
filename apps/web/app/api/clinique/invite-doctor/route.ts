import { NextResponse } from "next/server";
import { db, clinics, clinicDoctors, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { sendEmail } from "@/lib/email";

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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.toLowerCase().trim();
  if (!emailRegex.test(normalizedEmail)) {
    return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
  }

  const assignedRole = role === "admin" ? "admin" : "member";

  // Fetch clinic info for email templates
  const [clinicInfo] = await db
    .select({ name: clinics.name })
    .from(clinics)
    .where(eq(clinics.id, clinic.id))
    .limit(1);

  const clinicName = clinicInfo?.name ?? "une clinique";

  // Check if doctor exists in the platform
  const [doctor] = await db
    .select({ id: doctors.id, name: doctors.name, email: doctors.email })
    .from(doctors)
    .where(eq(doctors.email, normalizedEmail))
    .limit(1);

  if (!doctor) {
    // Doctor not on Doktori yet — send invitation email with signup link
    const inviteUrl = `https://doktori.tn/inscription?invite=${clinic.id}`;

    void sendEmail({
      to: normalizedEmail,
      subject: `${clinicName} vous invite à rejoindre Doktori`,
      html: `
        <p>Bonjour,</p>
        <p>La clinique <strong>${clinicName}</strong> vous invite à rejoindre Doktori, la plateforme de prise de rendez-vous médicaux en ligne.</p>
        <p>Créez votre compte médecin gratuitement et commencez à recevoir des rendez-vous en ligne :</p>
        <p style="margin: 20px 0;">
          <a href="${inviteUrl}" style="background-color: #0891B2; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Créer mon compte Doktori
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">Ou copiez ce lien : ${inviteUrl}</p>
        <p>L'équipe Doktori</p>
      `,
    }).catch((err) => {
      console.error("[clinic-invite-email]", err);
    });

    return NextResponse.json({ status: "invited", email: normalizedEmail });
  }

  // Doctor exists — check if already in clinic
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

  await db.insert(clinicDoctors).values({
    clinicId: clinic.id,
    doctorId: doctor.id,
    role: assignedRole,
  });

  // Notify the doctor by email — non-blocking
  void sendEmail({
    to: doctor.email,
    subject: `Vous avez été ajouté(e) à ${clinicName} sur Doktori`,
    html: `
      <p>Bonjour Dr. ${doctor.name},</p>
      <p>Vous avez été ajouté(e) en tant que <strong>${assignedRole === "admin" ? "Responsable" : "Membre"}</strong> à la clinique <strong>${clinicName}</strong> sur Doktori.</p>
      <p>Si vous n'avez pas consenti à rejoindre cette clinique ou si vous souhaitez être retiré(e), veuillez contacter le support à <a href="mailto:support@doktori.tn">support@doktori.tn</a>.</p>
      <p>L'équipe Doktori</p>
    `,
  }).catch((err) => {
    console.error("[clinic-add-email]", err);
  });

  return NextResponse.json({
    status: "added",
    doctor: { id: doctor.id, name: doctor.name },
  });
}
