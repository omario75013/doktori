import { NextRequest, NextResponse } from "next/server";
import {
  db,
  doctors,
  clinics,
  labs,
  labUsers,
  secretaries,
  staffPasswordResetTokens,
} from "@doktori/db";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { sendEmail } from "@/lib/email";
import { buildStaffPasswordResetEmail } from "@/emails/templates";

type ActorType = "doctor" | "clinic" | "lab" | "lab_user" | "secretary";

const ACTOR_LABELS: Record<ActorType, string> = {
  doctor: "Médecin",
  clinic: "Clinique",
  lab: "Laboratoire",
  lab_user: "Laboratoire",
  secretary: "Secrétaire",
};

async function findActorByEmail(email: string): Promise<
  | { type: ActorType; id: string; displayName: string; email: string }
  | null
> {
  const [doctor] = await db
    .select({ id: doctors.id, name: doctors.name, email: doctors.email })
    .from(doctors)
    .where(eq(doctors.email, email))
    .limit(1);
  if (doctor) return { type: "doctor", id: doctor.id, displayName: `Dr. ${doctor.name}`, email: doctor.email };

  const [clinic] = await db
    .select({ id: clinics.id, name: clinics.name, email: clinics.email })
    .from(clinics)
    .where(eq(clinics.email, email))
    .limit(1);
  if (clinic) return { type: "clinic", id: clinic.id, displayName: clinic.name, email: clinic.email };

  const [labUser] = await db
    .select({
      id: labUsers.id,
      firstName: labUsers.firstName,
      lastName: labUsers.lastName,
      email: labUsers.email,
    })
    .from(labUsers)
    .where(eq(labUsers.email, email))
    .limit(1);
  if (labUser)
    return {
      type: "lab_user",
      id: labUser.id,
      displayName: `${labUser.firstName} ${labUser.lastName}`,
      email: labUser.email,
    };

  const [lab] = await db
    .select({ id: labs.id, name: labs.name, email: labs.email })
    .from(labs)
    .where(eq(labs.email, email))
    .limit(1);
  if (lab) return { type: "lab", id: lab.id, displayName: lab.name, email: lab.email };

  const [secretary] = await db
    .select({ id: secretaries.id, name: secretaries.name, email: secretaries.email })
    .from(secretaries)
    .where(eq(secretaries.email, email))
    .limit(1);
  if (secretary)
    return { type: "secretary", id: secretary.id, displayName: secretary.name, email: secretary.email };

  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const actor = await findActorByEmail(email);

  // Silent success to prevent enumeration
  if (!actor) return NextResponse.json({ success: true });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await db.insert(staffPasswordResetTokens).values({
    tokenHash,
    actorType: actor.type,
    actorId: actor.id,
    expiresAt,
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://doktori.tn";
  const resetUrl = `${baseUrl}/reset-password-pro/${rawToken}`;

  const tpl = buildStaffPasswordResetEmail({
    recipientName: actor.displayName,
    actorLabel: ACTOR_LABELS[actor.type],
    resetUrl,
  });

  await sendEmail({
    to: actor.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  return NextResponse.json({ success: true });
}
