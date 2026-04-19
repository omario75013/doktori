import { NextRequest, NextResponse } from "next/server";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";
import { canSendSMS, incrementSMSCount } from "@/lib/sms-quota";
import { sendSMS } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { patientPhone, message, appointmentId } = body as {
    patientPhone?: string;
    message?: string;
    appointmentId?: string;
  };

  if (!patientPhone || typeof patientPhone !== "string" || patientPhone.trim().length < 8) {
    return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  if (message.trim().length > 160) {
    return NextResponse.json({ error: "Message trop long (max 160 caractères)" }, { status: 400 });
  }

  const quota = await canSendSMS(actor.doctorId);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "Quota SMS épuisé pour ce mois. Passez au plan Pro ou achetez un pack SMS.",
        remaining: 0,
      },
      { status: 402 }
    );
  }

  const result = await sendSMS(patientPhone.trim(), message.trim(), appointmentId);
  if (!result.success) {
    return NextResponse.json({ error: "Échec de l'envoi du SMS" }, { status: 502 });
  }

  await incrementSMSCount(actor.doctorId);

  const updatedQuota = await canSendSMS(actor.doctorId);

  return NextResponse.json({
    success: true,
    provider: result.provider,
    messageId: result.messageId,
    remaining: updatedQuota.remaining,
    limit: updatedQuota.limit,
  });
}
