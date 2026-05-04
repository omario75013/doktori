import { NextRequest, NextResponse } from "next/server";
import { db, doctorReferrals, doctors } from "@doktori/db";
import { aliasedTable, and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { requireDoctor } from "@/lib/doctor-auth";
import { sendEmail } from "@/lib/email";

/**
 * Returns referrals where this doctor is referrer or referred.
 */
export async function GET(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const referrer = aliasedTable(doctors, "ref_referrer");
  const referred = aliasedTable(doctors, "ref_referred");

  const rows = await db
    .select({
      id: doctorReferrals.id,
      status: doctorReferrals.status,
      commissionPct: doctorReferrals.commissionPct,
      rewardsEarnedTnd: doctorReferrals.rewardsEarnedTnd,
      validatedAt: doctorReferrals.validatedAt,
      createdAt: doctorReferrals.createdAt,
      rejectionReason: doctorReferrals.rejectionReason,
      referrerId: doctorReferrals.referrerDoctorId,
      referredId: doctorReferrals.referredDoctorId,
      referrerName: referrer.name,
      referrerEmail: referrer.email,
      referredName: referred.name,
      referredEmail: referred.email,
    })
    .from(doctorReferrals)
    .innerJoin(referrer, eq(doctorReferrals.referrerDoctorId, referrer.id))
    .innerJoin(referred, eq(doctorReferrals.referredDoctorId, referred.id))
    .where(
      or(
        eq(doctorReferrals.referrerDoctorId, doctor.id),
        eq(doctorReferrals.referredDoctorId, doctor.id)
      )
    )
    .orderBy(doctorReferrals.createdAt);

  const sent = rows.filter((r) => r.referrerId === doctor.id);
  const received = rows.filter((r) => r.referredId === doctor.id);

  const totalRewards = sent.reduce(
    (sum, r) => sum + Number(r.rewardsEarnedTnd ?? 0),
    0
  );
  const validatedCount = sent.filter(
    (r) => r.status === "validated"
  ).length;

  return NextResponse.json({
    sent: sent.map((r) => ({
      ...r,
      validatedAt: r.validatedAt ? r.validatedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
    received: received.map((r) => ({
      ...r,
      validatedAt: r.validatedAt ? r.validatedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
    stats: {
      sentCount: sent.length,
      validatedCount,
      totalRewardsTnd: totalRewards,
    },
  });
}

const inviteSchema = z
  .object({
    referredEmail: z.string().email().toLowerCase(),
  })
  .strict();

/**
 * Send an invite email to another doctor with a personalized signup link.
 * If the referred doctor already exists, creates a pending referral row directly.
 */
export async function POST(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Email invalide" },
      { status: 400 }
    );
  }

  const referredEmail = parsed.data.referredEmail;

  // Look up referrer info for the email
  const [referrer] = await db
    .select({ id: doctors.id, name: doctors.name, email: doctors.email })
    .from(doctors)
    .where(eq(doctors.id, doctor.id))
    .limit(1);

  if (!referrer) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  // Build invite link with the referrer's id (used for tracking on signup)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doktori.tn";
  const inviteLink = `${baseUrl}/inscription?ref=${doctor.id}`;

  // If referred email already corresponds to an existing doctor,
  // create the referral row immediately (status pending → admin validation later)
  const [existingDoctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.email, referredEmail))
    .limit(1);

  if (existingDoctor) {
    if (existingDoctor.id === doctor.id) {
      return NextResponse.json(
        { error: "Auto-parrainage impossible" },
        { status: 400 }
      );
    }
    // Insert referral if not already present
    try {
      await db.insert(doctorReferrals).values({
        referrerDoctorId: doctor.id,
        referredDoctorId: existingDoctor.id,
        status: "pending",
      });
    } catch {
      // unique constraint = already exists, ignore
    }
  }

  // Send the invite email (best-effort)
  try {
    await sendEmail({
      to: referredEmail,
      subject: `${referrer.name ?? "Un confrère"} vous invite à rejoindre Doktori`,
      html: `
        <p>Bonjour,</p>
        <p><strong>${referrer.name ?? "Un confrère"}</strong> vous invite à rejoindre Doktori,
        la plateforme tunisienne de prise de rendez-vous médicaux.</p>
        <p>En vous inscrivant via ce lien, votre confrère bénéficiera d'une commission
        de parrainage. Vous bénéficierez vous-même d'avantages d'accueil.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteLink}" style="background:#0891B2;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            S'inscrire sur Doktori
          </a>
        </p>
        <p style="font-size:12px;color:#666;">Lien direct : ${inviteLink}</p>
      `,
      text: `${referrer.name ?? "Un confrère"} vous invite à rejoindre Doktori. Inscription : ${inviteLink}`,
    });
  } catch (e) {
    console.error("[medecin/referrals] email failed", e);
  }

  return NextResponse.json({ success: true, link: inviteLink }, { status: 201 });
}
