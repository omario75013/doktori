import { NextRequest, NextResponse } from "next/server";
import { db, newsletterSubscribers } from "@doktori/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { sendEmail } from "@/lib/email";

const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doktori.tn";

const bodySchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
    language: z.enum(["fr", "ar"]).optional(),
    source: z.string().trim().max(40).optional(),
  })
  .strict();

function buildConfirmationEmail(token: string, lang: "fr" | "ar"): { subject: string; html: string; text: string } {
  const confirmUrl = `${PUBLIC_URL}/api/newsletter/confirm?token=${token}`;
  const unsubUrl = `${PUBLIC_URL}/api/newsletter/unsubscribe?token=${token}`;
  if (lang === "ar") {
    return {
      subject: "تأكيد اشتراكك في نشرة Doktori",
      html: `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; direction:rtl; text-align:right;">
          <h2 style="color:#0f766e;">مرحباً بك في Doktori</h2>
          <p>شكراً لاشتراكك في نشرتنا الإخبارية. الرجاء النقر على الزر أدناه لتأكيد اشتراكك:</p>
          <p style="text-align:center;">
            <a href="${confirmUrl}" style="background:#0f766e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">تأكيد الاشتراك</a>
          </p>
          <p style="color:#6b7280;font-size:13px;">إذا لم تقم بهذا الطلب، يمكنك تجاهل هذا البريد. يمكنك إلغاء الاشتراك في أي وقت <a href="${unsubUrl}">هنا</a>.</p>
        </div>`,
      text: `تأكيد الاشتراك: ${confirmUrl}`,
    };
  }
  return {
    subject: "Confirmez votre inscription à la newsletter Doktori",
    html: `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h2 style="color:#0f766e;">Bienvenue chez Doktori</h2>
        <p>Merci de vous être inscrit(e) à notre newsletter. Cliquez sur le bouton ci-dessous pour confirmer votre adresse :</p>
        <p style="text-align:center;">
          <a href="${confirmUrl}" style="background:#0f766e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">Confirmer mon inscription</a>
        </p>
        <p style="color:#6b7280;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message. Vous pouvez vous désabonner à tout moment <a href="${unsubUrl}">ici</a>.</p>
      </div>`,
    text: `Confirmez : ${confirmUrl}`,
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email invalide", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, language, source } = parsed.data;
  const token = randomBytes(32).toString("hex");
  const lang = language ?? "fr";

  // Upsert: if existing record exists, clear unsubscribed_at and reissue token (re-confirm)
  const existing = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);

  let subscriber;
  if (existing.length === 0) {
    const [row] = await db
      .insert(newsletterSubscribers)
      .values({
        email,
        language: lang,
        source: source ?? null,
        unsubscribeToken: token,
      })
      .returning();
    subscriber = row;
  } else {
    const [row] = await db
      .update(newsletterSubscribers)
      .set({
        unsubscribedAt: null,
        language: lang,
        source: source ?? existing[0].source,
        unsubscribeToken: existing[0].unsubscribeToken ?? token,
      })
      .where(eq(newsletterSubscribers.email, email))
      .returning();
    subscriber = row;
  }

  const finalToken = subscriber.unsubscribeToken ?? token;
  const tpl = buildConfirmationEmail(finalToken, lang);

  // Only send confirmation if not already confirmed
  if (!subscriber.confirmedAt) {
    try {
      await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    } catch (err) {
      console.error("[newsletter] confirmation email failed:", err);
    }
  }

  return NextResponse.json({ ok: true, alreadyConfirmed: Boolean(subscriber.confirmedAt) });
}
