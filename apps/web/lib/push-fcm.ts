import { db, pushTokens } from "@doktori/db";
import { and, eq, inArray } from "drizzle-orm";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

type Actor = "patient" | "doctor" | "secretary";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
};

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
  channelId?: string;
};

type ExpoResponse = {
  data?: Array<{
    status: "ok" | "error";
    id?: string;
    message?: string;
    details?: { error?: string };
  }>;
  errors?: Array<{ code: string; message: string }>;
};

/**
 * Send an Expo push to every active device belonging to one user.
 *
 * - Expo's push gateway handles APNs + FCM transparently; we never touch
 *   Apple/Google credentials ourselves.
 * - Expired / invalid tokens are deactivated on the fly so we stop wasting
 *   requests on them.
 * - Returns the count of messages actually accepted by Expo.
 */
export async function sendPush(
  actorType: Actor,
  actorId: string,
  payload: PushPayload
): Promise<number> {
  const tokens = await db
    .select({
      id: pushTokens.id,
      token: pushTokens.token,
      platform: pushTokens.platform,
    })
    .from(pushTokens)
    .where(
      and(
        eq(pushTokens.actorType, actorType),
        eq(pushTokens.actorId, actorId),
        eq(pushTokens.isActive, true)
      )
    );

  if (tokens.length === 0) return 0;

  const messages: ExpoMessage[] = tokens.map((t) => ({
    to: t.token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: payload.sound === null ? null : "default",
    badge: payload.badge,
    priority: "high",
    channelId: "default",
  }));

  let accepted = 0;
  const invalidIds: string[] = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const batchTokenIds = tokens.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(batch),
      });
      const json = (await res.json()) as ExpoResponse;
      if (json.data) {
        json.data.forEach((tk, idx) => {
          if (tk.status === "ok") {
            accepted += 1;
          } else if (
            tk.details?.error === "DeviceNotRegistered" ||
            tk.details?.error === "InvalidCredentials"
          ) {
            invalidIds.push(batchTokenIds[idx].id);
          }
        });
      }
    } catch (e) {
      // Network or Expo outage — log but don't throw; callers shouldn't fail
      // their business op because push is best-effort.
      console.error("[push-fcm] batch failed", e);
    }
  }

  if (invalidIds.length > 0) {
    await db
      .update(pushTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(inArray(pushTokens.id, invalidIds));
  }

  return accepted;
}

/**
 * Fan out to a list of (actorType, actorId) pairs concurrently.
 * Useful for "notify doctor + secretary on new booking" scenarios.
 */
export async function sendPushMany(
  targets: Array<{ actorType: Actor; actorId: string }>,
  payload: PushPayload
): Promise<number> {
  const results = await Promise.all(
    targets.map((t) => sendPush(t.actorType, t.actorId, payload))
  );
  return results.reduce((a, b) => a + b, 0);
}
