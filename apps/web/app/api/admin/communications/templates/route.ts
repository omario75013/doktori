import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, messageTemplates } from "@doktori/db";
import { and, asc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

const CHANNELS = ["sms", "whatsapp", "push", "email"] as const;
const LANGUAGES = ["fr", "ar", "en"] as const;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(["super_admin", "support", "moderator", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const language = searchParams.get("language");
  const isActiveParam = searchParams.get("isActive");

  const conditions = [];
  if (channel) conditions.push(eq(messageTemplates.channel, channel));
  if (language) conditions.push(eq(messageTemplates.language, language));
  if (isActiveParam === "true") conditions.push(eq(messageTemplates.isActive, true));
  else if (isActiveParam === "false") conditions.push(eq(messageTemplates.isActive, false));

  const rows = await db
    .select()
    .from(messageTemplates)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(messageTemplates.channel), asc(messageTemplates.name));

  return NextResponse.json({ templates: rows });
}

const CreateBodySchema = z.object({
  key: z.string().trim().min(1).max(100).regex(/^[a-z0-9_.-]+$/i, "Clé invalide"),
  name: z.string().trim().min(1).max(255),
  channel: z.enum(CHANNELS),
  subject: z.string().trim().max(255).optional().nullable(),
  body: z.string().trim().min(1),
  variables: z.array(z.string()).optional(),
  language: z.enum(LANGUAGES).optional(),
});

export const POST = withAdminAudit<
  { ok: true; template: typeof messageTemplates.$inferSelect },
  unknown
>({
  action: "templates.create",
  resourceType: "message_templates",
  allowedRoles: ["super_admin", "moderator"],
  // Resource id is not known until after insert; use placeholder, overwrite in handler
  // by returning a NextResponse on validation errors (no audit) and a normal value on success.
  getResourceId: () => "new",
  handler: async ({ tx, admin, body }) => {
    const parsed = CreateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { key, name, channel, subject, body: tplBody, variables, language } = parsed.data;

    try {
      const [row] = await tx
        .insert(messageTemplates)
        .values({
          key,
          name,
          channel,
          subject: subject ?? null,
          body: tplBody,
          variables: variables ?? [],
          language: language ?? "fr",
          isActive: true,
          createdByAdminId: admin.id,
        })
        .returning();
      return { ok: true, template: row } as const;
    } catch (e: unknown) {
      const pg = e as { code?: string };
      if (pg?.code === "23505") {
        return NextResponse.json(
          { error: "Une template avec cette clé existe déjà" },
          { status: 409 }
        );
      }
      throw e;
    }
  },
});
