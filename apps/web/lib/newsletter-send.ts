import { db, newsletterSubscribers, newsletterIssues, type NewsletterIssue } from "@doktori/db";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doktori.tn";

interface SendIssueResult {
  issueId: string;
  recipientCount: number;
  successCount: number;
  failedCount: number;
}

function buildIssueHtml(issue: NewsletterIssue, lang: "fr" | "ar", token: string): string {
  const unsubUrl = `${PUBLIC_URL}/api/newsletter/unsubscribe?token=${token}`;
  const useAr = lang === "ar" && issue.contentHtmlAr;
  const body = useAr ? issue.contentHtmlAr! : issue.contentHtmlFr;

  if (lang === "ar") {
    return `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; direction:rtl; text-align:right;">
        ${body}
        <hr style="margin-top:40px; border:none; border-top:1px solid #e5e7eb;" />
        <p style="color:#9ca3af; font-size:12px; text-align:center; margin-top:16px;">
          لإلغاء الاشتراك، <a href="${unsubUrl}" style="color:#0f766e;">انقر هنا</a>
        </p>
      </div>`;
  }
  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
      ${body}
      <hr style="margin-top:40px; border:none; border-top:1px solid #e5e7eb;" />
      <p style="color:#9ca3af; font-size:12px; text-align:center; margin-top:16px;">
        Vous recevez cet email parce que vous êtes abonné(e) à la newsletter Doktori.<br />
        <a href="${unsubUrl}" style="color:#0f766e;">Se désabonner</a>
      </p>
    </div>`;
}

export async function sendNewsletterIssue(issueId: string): Promise<SendIssueResult> {
  const [issue] = await db
    .select()
    .from(newsletterIssues)
    .where(eq(newsletterIssues.id, issueId))
    .limit(1);

  if (!issue) throw new Error("Issue not found");
  if (issue.sentAt) {
    return { issueId, recipientCount: issue.recipientCount, successCount: 0, failedCount: 0 };
  }

  const subscribers = await db
    .select({
      id: newsletterSubscribers.id,
      email: newsletterSubscribers.email,
      language: newsletterSubscribers.language,
      unsubscribeToken: newsletterSubscribers.unsubscribeToken,
    })
    .from(newsletterSubscribers)
    .where(
      and(
        isNotNull(newsletterSubscribers.confirmedAt),
        isNull(newsletterSubscribers.unsubscribedAt)
      )
    );

  let successCount = 0;
  let failedCount = 0;

  // Subject (lang-aware fallback)
  const subjectFr = issue.titleFr;
  const subjectAr = issue.titleAr || issue.titleFr;

  // Send sequentially with light pacing — Resend rate-limits to 10/s on free tier
  for (const sub of subscribers) {
    const lang = (sub.language === "ar" ? "ar" : "fr") as "fr" | "ar";
    const subject = lang === "ar" ? subjectAr : subjectFr;
    const token = sub.unsubscribeToken ?? "";
    const html = buildIssueHtml(issue, lang, token);
    try {
      const res = await sendEmail({ to: sub.email, subject, html });
      if (res.success) successCount += 1;
      else failedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  await db
    .update(newsletterIssues)
    .set({ sentAt: new Date(), recipientCount: subscribers.length })
    .where(eq(newsletterIssues.id, issueId));

  return { issueId, recipientCount: subscribers.length, successCount, failedCount };
}
