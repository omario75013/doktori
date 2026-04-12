import { db, smsLogs } from "@doktori/db";

interface EmailResult {
  success: boolean;
  provider: string;
  id?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  appointmentId?: string;
}

/**
 * Send an email via Resend. Falls back to console logging in dev.
 * Logs every attempt to sms_logs (provider='email').
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Doktori <noreply@doktori.tn>";

  // Dev mode: no Resend configured → log to console
  if (!apiKey) {
    console.log(`[EMAIL-DEV] To: ${params.to} | Subject: ${params.subject}`);
    console.log(`[EMAIL-DEV] HTML length: ${params.html.length} chars`);
    try {
      await db.insert(smsLogs).values({
        recipient: params.to,
        message: `[email] ${params.subject}`,
        status: "dev_logged",
        provider: "email",
        appointmentId: params.appointmentId,
      });
    } catch {}
    return { success: true, provider: "console" };
  }

  // Production: Resend
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    const data = await res.json();
    const success = res.ok;

    try {
      await db.insert(smsLogs).values({
        recipient: params.to,
        message: `[email] ${params.subject}`,
        status: success ? "sent" : "failed",
        provider: "email",
        appointmentId: params.appointmentId,
      });
    } catch {}

    return { success, provider: "resend", id: data.id };
  } catch (error) {
    console.error("[email] send failed:", error);
    try {
      await db.insert(smsLogs).values({
        recipient: params.to,
        message: `[email] ${params.subject}`,
        status: "failed",
        provider: "email",
        appointmentId: params.appointmentId,
      });
    } catch {}
    return { success: false, provider: "resend" };
  }
}
