import { NextResponse } from "next/server";
import { z } from "zod";
import { db, bulkSmsCampaigns } from "@doktori/db";
import { requireClinic } from "@/lib/clinic-auth";
import { sendSMS } from "@/lib/sms";
import { resolveRecipients, type CommunicationFilter } from "../recipients/route";
import { logClinicAudit } from "@/lib/audit";

// ── Validation ────────────────────────────────────────────────────────────────

const FilterSchema = z.object({
  doctorIds: z.array(z.string().uuid()).optional(),
  lastVisitFrom: z.string().datetime({ offset: true }).optional(),
  lastVisitTo: z.string().datetime({ offset: true }).optional(),
  motif: z.string().optional(),
  hasFutureRdv: z.boolean().optional(),
});

const BodySchema = z.object({
  filter: FilterSchema,
  message: z.string().min(1).max(640),
});

const MAX_RECIPIENTS = 1000;

// Opt-out note: v1 uses a simple shared opt-out URL (doktori.tn/sms/optout?phone=...)
// that asks users to enter their phone. Per-recipient signed tokens are a TODO for v2.
const OPT_OUT_SUFFIX = "\nStop: doktori.tn/sms/optout";

// ── POST /api/clinique/communication/sms ─────────────────────────────────────

export async function POST(req: Request) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { filter, message } = parsed.data;

  // Resolve recipients server-side (never trust client count)
  const recipients = await resolveRecipients(clinic.id, filter as CommunicationFilter);

  if (recipients.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      {
        error: `Trop de destinataires (${recipients.length}). Veuillez affiner vos filtres pour rester sous ${MAX_RECIPIENTS}.`,
        count: recipients.length,
      },
      { status: 400 }
    );
  }

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, recipients: 0 });
  }

  const fullMessage = message + OPT_OUT_SUFFIX;

  let sent = 0;
  let failed = 0;
  const recipientList: { name: string; phone: string }[] = [];

  for (const recipient of recipients) {
    recipientList.push({ name: recipient.name, phone: recipient.phone });
    try {
      const result = await sendSMS(recipient.phone, fullMessage);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  // Insert campaign log row
  const [campaign] = await db.insert(bulkSmsCampaigns).values({
    clinicId: clinic.id,
    message: fullMessage,
    recipientCount: recipients.length,
    sentCount: sent,
    failedCount: failed,
    filter: filter as Record<string, unknown>,
    createdByClinicId: clinic.id,
  }).returning({ id: bulkSmsCampaigns.id });

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "sms.bulk_send",
    targetType: "campaign",
    targetId: campaign?.id ?? null,
    metadata: {
      recipient_count: recipients.length,
      message_preview: message.slice(0, 80),
    },
  });

  return NextResponse.json({ sent, failed, recipients: recipients.length });
}
