import { db, smsLogs } from "@doktori/db";

interface WAResult {
  success: boolean;
  provider: string;
  messageId?: string;
}

// Meta WhatsApp Cloud API
export async function sendWhatsApp(
  to: string,
  template: "appointment_reminder" | "booking_confirmation",
  parameters: string[],
  appointmentId?: string,
): Promise<WAResult> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !accessToken) {
    // Dev mode: log instead of sending
    console.log(`[WA-DEV] To: ${to} | template: ${template} | params: ${parameters.join(", ")}`);
    await db.insert(smsLogs).values({
      recipient: to,
      message: `[WA template: ${template}] ${parameters.join(" | ")}`,
      status: "dev_logged",
      provider: "whatsapp-console",
      appointmentId,
    });
    return { success: true, provider: "whatsapp-console" };
  }

  // Production: Meta Cloud API
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/^\+/, ""), // Meta expects no leading +
          type: "template",
          template: {
            name: template,
            language: { code: "fr" },
            components: [{
              type: "body",
              parameters: parameters.map((p) => ({ type: "text", text: p })),
            }],
          },
        }),
      }
    );

    const data = await res.json();

    await db.insert(smsLogs).values({
      recipient: to,
      message: `[WA] ${template}: ${parameters.join(" | ")}`,
      status: res.ok ? "sent" : "failed",
      provider: "whatsapp",
      appointmentId,
    });

    return { success: res.ok, provider: "whatsapp", messageId: data.messages?.[0]?.id };
  } catch (error) {
    await db.insert(smsLogs).values({
      recipient: to,
      message: `[WA] ${template}: ${parameters.join(" | ")}`,
      status: "failed",
      provider: "whatsapp",
      appointmentId,
    });
    return { success: false, provider: "whatsapp" };
  }
}
