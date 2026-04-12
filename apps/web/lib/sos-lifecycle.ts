import { closePhoneProxy } from "@/lib/phone-proxy";
import { broadcastSos } from "@/lib/sos-broadcast";
import { sendSMS } from "@/lib/sms";

/**
 * Close the phone proxy and broadcast a status update to the patient.
 * Both operations run in parallel. Errors are logged but never thrown.
 */
export async function finalizeSosSession(
  sessionId: string,
  status: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  await Promise.allSettled([
    closePhoneProxy(sessionId).catch((e) =>
      console.error(`[SOS] closePhoneProxy failed for ${sessionId}:`, e),
    ),
    broadcastSos(`session:${sessionId}`, "session-update", {
      status,
      ...extra,
    }),
  ]);
}

/**
 * Send SMS with a single fire-and-forget retry after 5s on failure.
 */
export async function sendSMSWithRetry(
  to: string,
  message: string,
): Promise<void> {
  const result = await sendSMS(to, message);
  if (!result.success) {
    setTimeout(() => {
      sendSMS(to, message).catch(() => {});
    }, 5000);
  }
}
