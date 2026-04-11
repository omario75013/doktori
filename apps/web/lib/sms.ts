import { db, smsLogs } from "@doktori/db";

interface SMSResult {
  success: boolean;
  provider: string;
  messageId?: string;
}

export async function sendSMS(to: string, message: string, appointmentId?: string): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  // Dev mode: no Twilio configured → log to console
  if (!accountSid || !authToken || !from) {
    console.log(`[SMS-DEV] To: ${to} | ${message}`);
    await db.insert(smsLogs).values({
      recipient: to,
      message,
      status: "dev_logged",
      provider: "console",
      appointmentId,
    });
    return { success: true, provider: "console" };
  }

  // Production: Twilio
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({ To: to, From: from, Body: message }),
      }
    );

    const data = await res.json();

    await db.insert(smsLogs).values({
      recipient: to,
      message,
      status: res.ok ? "sent" : "failed",
      provider: "twilio",
      appointmentId,
    });

    return { success: res.ok, provider: "twilio", messageId: data.sid };
  } catch (error) {
    await db.insert(smsLogs).values({
      recipient: to,
      message,
      status: "failed",
      provider: "twilio",
      appointmentId,
    });
    return { success: false, provider: "twilio" };
  }
}
