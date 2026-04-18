import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type AudienceFilters = {
  specialty?: string;
  city?: string;
  plan?: string;
};

type BroadcastBody = {
  channel: "sms" | "email";
  audience: {
    type: "doctors" | "patients";
    filters: AudienceFilters;
  };
  subject?: string;
  message: string;
};

type Recipient = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildAudience(
  audienceType: "doctors" | "patients",
  filters: AudienceFilters
): Promise<Recipient[]> {
  if (audienceType === "doctors") {
    const rows = await db.execute(sql`
      SELECT d.id, d.phone, d.email, d.name
      FROM doctors d
      LEFT JOIN subscriptions s ON s.doctor_id = d.id AND s.status = 'active'
      WHERE d.is_active = true
        ${filters.specialty ? sql`AND d.specialty = ${filters.specialty}` : sql``}
        ${filters.city ? sql`AND d.city = ${filters.city}` : sql``}
        ${filters.plan ? sql`AND s.plan = ${filters.plan}` : sql``}
      GROUP BY d.id, d.phone, d.email, d.name
    `);
    return rows as unknown as Recipient[];
  }

  // patients
  const rows = await db.execute(sql`
    SELECT id, phone, email, name
    FROM patients
    WHERE is_suspended = false
      ${filters.city ? sql`AND EXISTS (
        SELECT 1 FROM appointments a
        JOIN doctors doc ON doc.id = a.doctor_id
        WHERE a.patient_id = patients.id AND doc.city = ${filters.city}
      )` : sql``}
  `);
  return rows as unknown as Recipient[];
}

/**
 * POST /api/admin/communications/broadcast
 * Send a bulk SMS or email to a filtered audience.
 *
 * Body: { channel, audience: { type, filters }, subject?, message }
 */
export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  let body: BroadcastBody;
  try {
    body = (await req.json()) as BroadcastBody;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { channel, audience, subject, message } = body;

  if (!channel || !audience?.type || !message?.trim()) {
    return NextResponse.json(
      { error: "Paramètres manquants : channel, audience.type et message sont requis" },
      { status: 400 }
    );
  }
  if (channel === "email" && !subject?.trim()) {
    return NextResponse.json(
      { error: "Le sujet est requis pour les emails" },
      { status: 400 }
    );
  }

  const recipients = await buildAudience(audience.type, audience.filters ?? {});

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      if (channel === "sms") {
        if (!recipient.phone) { failed++; continue; }
        const result = await sendSMS(recipient.phone, message);
        result.success ? sent++ : failed++;
      } else {
        if (!recipient.email) { failed++; continue; }
        const result = await sendEmail({
          to: recipient.email,
          subject: subject ?? "Message Doktori",
          html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
          text: message,
        });
        result.success ? sent++ : failed++;
      }
      // Throttle to avoid rate limiting
      await sleep(100);
    } catch {
      failed++;
    }
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "communications.broadcast",
    resourceType: "communications",
    after: {
      channel,
      audienceType: audience.type,
      filters: audience.filters,
      recipientCount: recipients.length,
      sent,
      failed,
      message: message.substring(0, 200),
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ sent, failed, total: recipients.length });
}

/**
 * GET /api/admin/communications/broadcast
 * Returns audience preview count based on filters.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const audienceType = (searchParams.get("audienceType") ?? "doctors") as "doctors" | "patients";
  const specialty = searchParams.get("specialty") ?? undefined;
  const city = searchParams.get("city") ?? undefined;
  const plan = searchParams.get("plan") ?? undefined;

  const recipients = await buildAudience(audienceType, { specialty, city, plan });

  return NextResponse.json({ count: recipients.length });
}
