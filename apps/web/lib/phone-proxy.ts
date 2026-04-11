import { eq } from "drizzle-orm";
import { db, phoneProxies } from "@doktori/db";

interface ProxyResult {
  success: boolean;
  proxyNumber?: string; // The masked number patient should call
  sessionSid?: string;
  error?: string;
}

/**
 * Creates a masked phone proxy between two parties.
 * In dev mode: returns the REAL doctor phone with a "dev" flag.
 * In production: calls Twilio Proxy API to create a session with two participants.
 */
export async function createPhoneProxy(params: {
  sosSessionId: string;
  patientPhone: string;
  doctorPhone: string;
  ttlMinutes?: number;
}): Promise<ProxyResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const proxyServiceSid = process.env.TWILIO_PROXY_SERVICE_SID;

  const ttlMinutes = params.ttlMinutes || 60;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  // DEV MODE: return real number with a note
  if (!accountSid || !authToken || !proxyServiceSid) {
    console.log(`[PHONE-PROXY-DEV] Would mask ${params.doctorPhone} for session ${params.sosSessionId}`);

    await db.insert(phoneProxies).values({
      sosSessionId: params.sosSessionId,
      proxyNumber: params.doctorPhone, // In dev, the "proxy" IS the real number
      patientPhone: params.patientPhone,
      doctorPhone: params.doctorPhone,
      twilioProxyServiceSid: "dev-mode",
      twilioSessionSid: `dev-${Date.now()}`,
      expiresAt,
    });

    return {
      success: true,
      proxyNumber: params.doctorPhone,
      sessionSid: `dev-${Date.now()}`,
    };
  }

  // PRODUCTION: Twilio Proxy API
  try {
    // 1. Create a Proxy Session
    const sessionRes = await fetch(
      `https://proxy.twilio.com/v1/Services/${proxyServiceSid}/Sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          UniqueName: `sos-${params.sosSessionId}`,
          Ttl: String(ttlMinutes * 60),
          Mode: "voice-and-message",
        }),
      }
    );
    const sessionData = await sessionRes.json();
    if (!sessionRes.ok) {
      return { success: false, error: sessionData.message || "Twilio session creation failed" };
    }

    const sessionSid = sessionData.sid;

    // 2. Add patient as participant
    await fetch(
      `https://proxy.twilio.com/v1/Services/${proxyServiceSid}/Sessions/${sessionSid}/Participants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          Identifier: params.patientPhone,
          FriendlyName: "Patient",
        }),
      }
    );

    // 3. Add doctor as participant
    const doctorPartRes = await fetch(
      `https://proxy.twilio.com/v1/Services/${proxyServiceSid}/Sessions/${sessionSid}/Participants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          Identifier: params.doctorPhone,
          FriendlyName: "Doctor",
        }),
      }
    );
    const doctorPart = await doctorPartRes.json();
    const proxyNumber = doctorPart.proxy_identifier; // This is what the patient should call/SMS

    // Store in DB
    await db.insert(phoneProxies).values({
      sosSessionId: params.sosSessionId,
      proxyNumber,
      patientPhone: params.patientPhone,
      doctorPhone: params.doctorPhone,
      twilioProxyServiceSid: proxyServiceSid,
      twilioSessionSid: sessionSid,
      expiresAt,
    });

    return {
      success: true,
      proxyNumber,
      sessionSid,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Closes a phone proxy session (after the SOS is completed or expired).
 */
export async function closePhoneProxy(sosSessionId: string): Promise<void> {
  const [proxy] = await db
    .select()
    .from(phoneProxies)
    .where(eq(phoneProxies.sosSessionId, sosSessionId))
    .limit(1);
  if (!proxy) return;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (accountSid && authToken && proxy.twilioProxyServiceSid !== "dev-mode") {
    try {
      await fetch(
        `https://proxy.twilio.com/v1/Services/${proxy.twilioProxyServiceSid}/Sessions/${proxy.twilioSessionSid}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          },
        }
      );
    } catch (e) {
      console.error("Failed to close Twilio proxy:", e);
    }
  }

  // Mark inactive in DB
  await db
    .update(phoneProxies)
    .set({ isActive: false })
    .where(eq(phoneProxies.sosSessionId, sosSessionId));
}
