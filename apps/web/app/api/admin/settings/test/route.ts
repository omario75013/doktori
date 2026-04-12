import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSetting } from "@/lib/platform-settings";

type TestCategory = "sms" | "email" | "payment" | "whatsapp";

async function testSms(adminEmail: string): Promise<{ success: boolean; message: string }> {
  const accountSid = await getSetting("sms.twilio.account_sid");
  const authToken = await getSetting("sms.twilio.auth_token");
  const fromNumber = await getSetting("sms.twilio.phone_number");

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, message: "Identifiants Twilio manquants" };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: fromNumber, // Send to self as a test
        Body: "[Doktori Admin] Test SMS — connexion Twilio OK",
      }),
    });

    if (res.ok) {
      return { success: true, message: "SMS de test envoyé avec succès" };
    }
    const data = (await res.json()) as { message?: string };
    return { success: false, message: data.message ?? `Erreur Twilio (${res.status})` };
  } catch (e) {
    return { success: false, message: `Erreur réseau: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function testEmail(adminEmail: string): Promise<{ success: boolean; message: string }> {
  const apiKey = await getSetting("email.resend.api_key");
  const from = await getSetting("email.from");

  if (!apiKey) {
    return { success: false, message: "Clé API Resend manquante" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "Doktori <noreply@doktori.tn>",
        to: [adminEmail],
        subject: "[Doktori Admin] Test email — connexion Resend OK",
        text: "Ceci est un email de test envoyé depuis le panneau d'administration Doktori.",
      }),
    });

    if (res.ok) {
      return { success: true, message: `Email de test envoyé à ${adminEmail}` };
    }
    const data = (await res.json()) as { message?: string };
    return { success: false, message: data.message ?? `Erreur Resend (${res.status})` };
  } catch (e) {
    return { success: false, message: `Erreur réseau: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function testPayment(): Promise<{ success: boolean; message: string }> {
  const appToken = await getSetting("payment.flouci.app_token");
  const appSecret = await getSetting("payment.flouci.app_secret");
  const apiUrl = await getSetting("payment.flouci.api_url");

  if (!appToken || !appSecret) {
    return { success: false, message: "Identifiants Flouci manquants" };
  }

  const baseUrl = apiUrl || "https://developers.flouci.com";

  try {
    // Call Flouci verify endpoint with a dummy payment ID to check auth
    const res = await fetch(`${baseUrl}/api/verify_payment/test_connection_check`, {
      method: "GET",
      headers: {
        "apppublic": appToken,
        "appsecret": appSecret,
      },
    });

    // Flouci returns 404 for unknown payment IDs which means auth worked
    if (res.status === 404 || res.status === 400) {
      return { success: true, message: "Connexion Flouci établie (identifiants valides)" };
    }
    if (res.status === 401 || res.status === 403) {
      return { success: false, message: "Identifiants Flouci invalides (401/403)" };
    }
    return { success: true, message: `API Flouci joignable (HTTP ${res.status})` };
  } catch (e) {
    return { success: false, message: `Erreur réseau: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function testWhatsapp(): Promise<{ success: boolean; message: string }> {
  const phoneId = await getSetting("whatsapp.phone_id");
  const accessToken = await getSetting("whatsapp.access_token");

  if (!phoneId || !accessToken) {
    return { success: false, message: "Identifiants WhatsApp Business manquants" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (res.ok) {
      const data = (await res.json()) as { id?: string; display_phone_number?: string };
      const phone = data.display_phone_number ?? phoneId;
      return { success: true, message: `WhatsApp Business connecté (${phone})` };
    }
    const data = (await res.json()) as { error?: { message?: string } };
    return { success: false, message: data.error?.message ?? `Erreur Meta (${res.status})` };
  } catch (e) {
    return { success: false, message: `Erreur réseau: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json()) as { category?: string };
  const { category } = body;

  const validCategories: TestCategory[] = ["sms", "email", "payment", "whatsapp"];
  if (!category || !validCategories.includes(category as TestCategory)) {
    return NextResponse.json(
      { error: "Catégorie invalide. Valeurs acceptées: sms, email, payment, whatsapp" },
      { status: 400 }
    );
  }

  let result: { success: boolean; message: string };

  switch (category as TestCategory) {
    case "sms":
      result = await testSms(admin.email);
      break;
    case "email":
      result = await testEmail(admin.email);
      break;
    case "payment":
      result = await testPayment();
      break;
    case "whatsapp":
      result = await testWhatsapp();
      break;
  }

  return NextResponse.json(result);
}
