import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import {
  db,
  clinics,
  clinicDoctors,
  clinicInvitations,
  doctors,
  doctorPractices,
  doctorNotifications,
} from "@doktori/db";
import { eq, and, or, sql } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { sendEmail } from "@/lib/email";
import { logClinicAudit } from "@/lib/audit";

// ── GET /api/clinique/doctors ─────────────────────────────────────────────────
// Returns the list of doctors currently associated with this clinic.

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

  // Attach pending invitation status for doctors already in the list
  const pendingInvites = await db
    .select({ doctorId: clinicInvitations.doctorId, status: clinicInvitations.status })
    .from(clinicInvitations)
    .where(
      and(
        eq(clinicInvitations.clinicId, clinic.id),
        eq(clinicInvitations.status, "pending")
      )
    );

  const pendingSet = new Set(pendingInvites.map((i) => i.doctorId));

  return NextResponse.json({
    doctors: rows.map((r) => ({
      ...r,
      invitationStatus: pendingSet.has(r.id) ? "pending" : "accepted",
    })),
  });
}

// ── POST /api/clinique/doctors ────────────────────────────────────────────────
// Two modes:
//   { mode: "invite", email, role? }   — invite an existing doctor by email
//   { mode: "create", firstName, lastName, email, phone, specialty,
//     consultationFee?, gender? }       — create a brand-new doctor account

export async function POST(req: Request) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = body as Record<string, unknown>;
  const mode = parsed.mode ?? "invite";

  // Fetch clinic info (shared by both modes)
  const [clinicInfo] = await db
    .select({ name: clinics.name, address: clinics.address, city: clinics.city, phone: clinics.phone })
    .from(clinics)
    .where(eq(clinics.id, clinic.id))
    .limit(1);

  if (!clinicInfo) {
    return NextResponse.json({ error: "Clinique introuvable" }, { status: 404 });
  }

  // ─── Mode: invite ────────────────────────────────────────────────────────────
  if (mode === "invite") {
    return handleInvite(clinic.id, clinicInfo, parsed);
  }

  // ─── Mode: create ────────────────────────────────────────────────────────────
  if (mode === "create") {
    return handleCreate(clinic.id, clinicInfo, parsed);
  }

  return NextResponse.json({ error: "Mode invalide (invite | create)" }, { status: 400 });
}

// ── invite handler ────────────────────────────────────────────────────────────

async function handleInvite(
  clinicId: string,
  clinicInfo: { name: string; address: string; city: string; phone: string },
  parsed: Record<string, unknown>
) {
  const email = typeof parsed.email === "string" ? parsed.email.toLowerCase().trim() : null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const assignedRole = parsed.role === "admin" ? "admin" : "member";

  // Look up doctor by email
  const [doctor] = await db
    .select({ id: doctors.id, name: doctors.name, email: doctors.email })
    .from(doctors)
    .where(eq(doctors.email, email))
    .limit(1);

  // Guard: already a member
  if (doctor) {
    const [existing] = await db
      .select({ id: clinicDoctors.id })
      .from(clinicDoctors)
      .where(and(eq(clinicDoctors.clinicId, clinicId), eq(clinicDoctors.doctorId, doctor.id)))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Ce médecin fait déjà partie de la clinique" },
        { status: 409 }
      );
    }

    // Guard: pending invitation already exists
    const [pendingInvite] = await db
      .select({ id: clinicInvitations.id })
      .from(clinicInvitations)
      .where(
        and(
          eq(clinicInvitations.clinicId, clinicId),
          eq(clinicInvitations.doctorId, doctor.id),
          eq(clinicInvitations.status, "pending")
        )
      )
      .limit(1);

    if (pendingInvite) {
      return NextResponse.json(
        { error: "Une invitation est déjà en attente pour ce médecin" },
        { status: 409 }
      );
    }
  }

  const token = randomBytes(24).toString("hex");
  // 30-day expiry
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(clinicInvitations)
    .values({
      clinicId,
      doctorId: doctor?.id ?? null,
      email: doctor ? null : email,
      role: assignedRole,
      status: "pending",
      token,
      expiresAt,
    })
    .returning({ id: clinicInvitations.id });

  // Push a doctor_notifications row for known doctors
  if (doctor) {
    await db
      .insert(doctorNotifications)
      .values({
        doctorId: doctor.id,
        type: "clinic_invitation",
        payload: {
          invitationId: invitation?.id,
          clinicId,
          clinicName: clinicInfo.name,
          token,
        },
      })
      .catch((err: unknown) => {
        console.error("[clinic-invite] doctorNotifications insert failed", err);
      });
  }

  // Email — non-blocking
  const recipientEmail = doctor?.email ?? email;
  const doctorName = doctor?.name ?? "Médecin";
  const inviteLink = doctor
    ? `https://doktori.tn/medecin/invitations/${token}`
    : `https://doktori.tn/inscription?invite=${clinicId}`;

  void sendEmail({
    to: recipientEmail,
    subject: `Invitation à rejoindre ${clinicInfo.name} sur Doktori`,
    html: `
      <p>Bonjour Dr. ${doctorName},</p>
      <p>La clinique <strong>${clinicInfo.name}</strong> vous invite à rejoindre son équipe sur Doktori en tant que <strong>${assignedRole === "admin" ? "Administrateur" : "Membre"}</strong>.</p>
      <p>Consultez et répondez à votre invitation en cliquant ci-dessous :</p>
      <p style="margin:20px 0;">
        <a href="${inviteLink}" style="background:#0d9488;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
          Voir mon invitation
        </a>
      </p>
      <p>Cette invitation expire dans 30 jours.</p>
      <p>L'équipe Doktori</p>
    `,
  }).catch((err: unknown) => {
    console.error("[clinic-invite-email]", err);
  });

  void logClinicAudit({
    clinicId,
    actorType: "clinic",
    actorId: clinicId,
    action: "doctor_invite",
    targetType: "invitation",
    targetId: invitation?.id ?? null,
    metadata: { email, doctorId: doctor?.id ?? null, role: assignedRole },
  });

  return NextResponse.json({ success: true, invitationId: invitation?.id });
}

// ── create handler ────────────────────────────────────────────────────────────

async function handleCreate(
  clinicId: string,
  clinicInfo: { name: string; address: string; city: string; phone: string },
  parsed: Record<string, unknown>
) {
  const firstName = typeof parsed.firstName === "string" ? parsed.firstName.trim() : "";
  const lastName = typeof parsed.lastName === "string" ? parsed.lastName.trim() : "";
  const email = typeof parsed.email === "string" ? parsed.email.toLowerCase().trim() : "";
  const phone = typeof parsed.phone === "string" ? parsed.phone.trim() : "";
  const specialty = typeof parsed.specialty === "string" ? parsed.specialty.trim() : "";
  const consultationFee =
    typeof parsed.consultationFee === "number" ? Math.round(parsed.consultationFee * 1000) : null;
  const gender = typeof parsed.gender === "string" ? parsed.gender : null;

  if (!firstName || !lastName || !email || !phone || !specialty) {
    return NextResponse.json(
      { error: "Champs requis : firstName, lastName, email, phone, specialty" },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  // Email uniqueness check
  const [existing] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Un médecin avec cet email existe déjà" },
      { status: 409 }
    );
  }

  // Generate temp password + hash
  const tempPassword = randomBytes(8).toString("hex"); // 16 hex chars
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  // Build slug: firstname-lastname + random suffix for uniqueness
  const slugBase = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slugSuffix = randomBytes(3).toString("hex");
  const slug = `${slugBase}-${slugSuffix}`;

  const fullName = `Dr. ${firstName} ${lastName}`;

  // Create doctor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertValues: any = {
    name: fullName,
    slug,
    email,
    passwordHash,
    phone,
    specialty,
    city: clinicInfo.city,
    address: clinicInfo.address,
    consultationFee,
    verificationStatus: "approved", // clinic vouches
    emailVerified: true,
    createdByClinicId: clinicId,
  };

  const [newDoctor] = await db
    .insert(doctors)
    .values(insertValues)
    .returning({ id: doctors.id });

  if (!newDoctor) {
    return NextResponse.json({ error: "Échec de la création" }, { status: 500 });
  }

  const doctorId = newDoctor.id;

  // Link to clinic
  await db
    .insert(clinicDoctors)
    .values({ clinicId, doctorId, role: "member" })
    .onConflictDoNothing();

  // Create clinic practice row
  const [practice] = await db
    .insert(doctorPractices)
    .values({
      doctorId,
      clinicId,
      name: clinicInfo.name,
      address: clinicInfo.address,
      city: clinicInfo.city,
      phone: clinicInfo.phone,
      isPrimary: true,
      isActive: true,
      kind: "clinic",
      photos: [],
    })
    .returning({ id: doctorPractices.id });

  // Send welcome email with temp password — non-blocking
  void sendEmail({
    to: email,
    subject: `Bienvenue sur Doktori — votre compte médecin a été créé`,
    html: `
      <p>Bonjour ${fullName},</p>
      <p>La clinique <strong>${clinicInfo.name}</strong> a créé votre compte médecin sur Doktori.</p>
      <p>Vos identifiants de connexion provisoires :</p>
      <ul>
        <li><strong>Email :</strong> ${email}</li>
        <li><strong>Mot de passe provisoire :</strong> <code>${tempPassword}</code></li>
      </ul>
      <p>Connectez-vous et changez votre mot de passe dès que possible :</p>
      <p style="margin:20px 0;">
        <a href="https://doktori.tn/login" style="background:#0d9488;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
          Se connecter
        </a>
      </p>
      <p>L'équipe Doktori</p>
    `,
  }).catch((err: unknown) => {
    console.error("[clinic-create-doctor-email]", err);
  });

  void logClinicAudit({
    clinicId,
    actorType: "clinic",
    actorId: clinicId,
    action: "doctor_create",
    targetType: "doctor",
    targetId: doctorId,
    metadata: { email, firstName, lastName, specialty },
  });

  return NextResponse.json({
    success: true,
    doctorId,
    practiceId: practice?.id,
    tempPasswordSent: true,
  });
}
