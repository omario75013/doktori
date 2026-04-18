import { createHmac } from "crypto";
import { db, webhooks } from "@doktori/db";
import { eq, and, sql } from "drizzle-orm";

export async function dispatchWebhook(
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  let hooks: typeof webhooks.$inferSelect[] = [];
  try {
    hooks = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.isActive, true),
          sql`events @> ${JSON.stringify([event])}::jsonb`
        )
      );
  } catch (e) {
    console.error("[webhooks] failed to query hooks:", e);
    return;
  }

  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

  for (const hook of hooks) {
    const signature = createHmac("sha256", hook.secret)
      .update(body)
      .digest("hex");

    fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Doktori-Signature": signature,
        "X-Doktori-Event": event,
      },
      body,
    }).catch((err) => console.error(`[webhooks] delivery failed to ${hook.url}:`, err));

    // Update last_triggered_at (best-effort)
    db.update(webhooks)
      .set({ lastTriggeredAt: new Date() })
      .where(eq(webhooks.id, hook.id))
      .catch(console.error);
  }
}
