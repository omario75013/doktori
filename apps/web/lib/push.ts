import { db, pushTokens, smsLogs } from "@doktori/db";
import { eq, and } from "drizzle-orm";

interface PushResult {
  success: boolean;
  sent: number;
}

export async function sendPushToPatient(
  patientId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<PushResult> {
  // Get active tokens for this patient
  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(and(eq(pushTokens.patientId, patientId), eq(pushTokens.isActive, true)));

  if (tokens.length === 0) return { success: true, sent: 0 };

  // Build Expo push messages
  const messages = tokens.map((t) => ({
    to: t.token,
    sound: "default",
    title,
    body,
    data: data || {},
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();

    // Log the push attempt
    for (const t of tokens) {
      await db.insert(smsLogs).values({
        recipient: t.token.slice(0, 20) + "...",
        message: `[PUSH] ${title}: ${body}`,
        status: res.ok ? "sent" : "failed",
        provider: "expo-push",
      });
    }

    // Deactivate invalid tokens (DeviceNotRegistered)
    if (result?.data) {
      for (let i = 0; i < result.data.length; i++) {
        if (
          result.data[i]?.status === "error" &&
          result.data[i]?.details?.error === "DeviceNotRegistered"
        ) {
          await db
            .update(pushTokens)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(pushTokens.token, tokens[i].token));
        }
      }
    }

    return { success: res.ok, sent: tokens.length };
  } catch (e) {
    console.error("Push send failed:", e);
    return { success: false, sent: 0 };
  }
}
