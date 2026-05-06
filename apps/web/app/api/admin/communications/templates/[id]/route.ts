import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, messageTemplates } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

type RouteContext = { params: Promise<{ id: string }> };

const LANGUAGES = ["fr", "ar", "en"] as const;
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const admin = await requireAdmin(["super_admin", "support", "moderator", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  if (!UUID_RX.test(id)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
  }

  return NextResponse.json({ template: row });
}

const PatchBodySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  subject: z.string().trim().max(255).nullable().optional(),
  body: z.string().trim().min(1).optional(),
  variables: z.array(z.string()).optional(),
  language: z.enum(LANGUAGES).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAdminAudit<
  { ok: true; template: typeof messageTemplates.$inferSelect },
  RouteContext
>({
  action: "templates.update",
  resourceType: "message_templates",
  allowedRoles: ["super_admin", "moderator"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    if (!UUID_RX.test(resourceId)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    // Reject attempts to change immutable fields (channel, key)
    const rawBody = body as Record<string, unknown> | null;
    if (rawBody && ("channel" in rawBody || "key" in rawBody)) {
      return NextResponse.json(
        { error: "Les champs 'channel' et 'key' sont immuables" },
        { status: 400 }
      );
    }

    const parsed = PatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Partial<typeof messageTemplates.$inferInsert> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.subject !== undefined) updates.subject = parsed.data.subject;
    if (parsed.data.body !== undefined) updates.body = parsed.data.body;
    if (parsed.data.variables !== undefined) updates.variables = parsed.data.variables;
    if (parsed.data.language !== undefined) updates.language = parsed.data.language;
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
    }
    updates.updatedAt = new Date();

    const [row] = await tx
      .update(messageTemplates)
      .set(updates)
      .where(eq(messageTemplates.id, resourceId))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    }

    return { ok: true, template: row } as const;
  },
});

// Soft delete via isActive=false; preserves history for audit.
export const DELETE = withAdminAudit<
  { ok: true; template: typeof messageTemplates.$inferSelect },
  RouteContext
>({
  action: "templates.delete",
  resourceType: "message_templates",
  allowedRoles: ["super_admin", "moderator"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId }) => {
    if (!UUID_RX.test(resourceId)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    const [row] = await tx
      .update(messageTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(messageTemplates.id, resourceId))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    }

    return { ok: true, template: row } as const;
  },
});
