import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit, type DbTx } from "@/lib/admin-audit-wrapper";
import { logTemplateAudit } from "@/lib/templates/audit";
import { validateMarkdown } from "@/lib/templates/sanitize";
import { db, prescriptionTemplates } from "@doktori/db";
import { eq, and, isNull } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

async function getTemplate(id: string) {
  const [row] = await db
    .select()
    .from(prescriptionTemplates)
    .where(and(eq(prescriptionTemplates.id, id), isNull(prescriptionTemplates.deletedAt)))
    .limit(1);
  return row ?? null;
}

async function getTemplateTx(tx: DbTx, id: string) {
  const [row] = await tx
    .select()
    .from(prescriptionTemplates)
    .where(and(eq(prescriptionTemplates.id, id), isNull(prescriptionTemplates.deletedAt)))
    .limit(1);
  return row ?? null;
}

/**
 * GET /api/admin/templates/[id]
 * Returns full template including body_markdown (admin audit view).
 */
export async function GET(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  const template = await getTemplate(id);

  if (!template) {
    return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

/**
 * PATCH /api/admin/templates/[id]
 * Edit an official template — or view a personal template in read-only mode.
 * Logs to both admin_audit_logs (via wrapper) and template_audit_logs (B5).
 */
export const PATCH = withAdminAudit<
  { ok: true; template: typeof prescriptionTemplates.$inferSelect },
  RouteContext
>({
  action: "templates.update",
  resourceType: "template",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const before = await getTemplateTx(tx, resourceId);
    return before;
  },
  handler: async ({ tx, admin, resourceId, body }) => {
    const before = await getTemplateTx(tx, resourceId);
    if (!before) {
      return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    }

    if (!before.isOfficial) {
      return NextResponse.json(
        {
          error:
            "Les modèles personnels des médecins sont en lecture seule depuis l'interface admin.",
        },
        { status: 403 }
      );
    }

    const b = (body ?? {}) as Record<string, unknown>;
    const { title, description, language, slug, bodyMarkdown, targetType } = b;

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "Titre invalide" }, { status: 400 });
      }
      if (title.length > 120) {
        return NextResponse.json(
          { error: "Titre trop long (max 120 caractères)" },
          { status: 400 }
        );
      }
    }

    if (slug !== undefined) {
      if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug) || slug.length > 60) {
        return NextResponse.json(
          {
            error:
              "Slug invalide (lettres minuscules, chiffres, tirets, max 60 caractères)",
          },
          { status: 400 }
        );
      }
    }

    if (bodyMarkdown !== undefined) {
      const validation = validateMarkdown(bodyMarkdown as string);
      if (!validation.ok) {
        const errorMessages: Record<string, string> = {
          BODY_REQUIRED: "Le contenu est requis",
          BODY_TOO_LARGE: "Le contenu est trop volumineux (max 10 Ko)",
          UNSAFE_MARKDOWN: "Le contenu contient des éléments non autorisés",
        };
        return NextResponse.json(
          { error: errorMessages[validation.error] ?? "Contenu invalide" },
          { status: 400 }
        );
      }
    }

    const updates: Partial<typeof prescriptionTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (title !== undefined) updates.title = (title as string).trim();
    if (description !== undefined) updates.description = description as string | null;
    if (language !== undefined) updates.language = language as "fr" | "ar";
    if (slug !== undefined) updates.slug = (slug as string).trim();
    if (bodyMarkdown !== undefined) updates.bodyMarkdown = bodyMarkdown as string;
    if (targetType !== undefined) updates.targetType = targetType as string;

    let after: typeof prescriptionTemplates.$inferSelect;
    try {
      const [updated] = await tx
        .update(prescriptionTemplates)
        .set(updates)
        .where(eq(prescriptionTemplates.id, resourceId))
        .returning();
      after = updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("prescription_templates_official_slug_uidx") ||
        msg.includes("unique")
      ) {
        return NextResponse.json(
          { error: "Ce slug est déjà utilisé par un autre modèle officiel actif." },
          { status: 409 }
        );
      }
      throw err;
    }

    // Build before/after snapshots for changed fields only (template_audit_logs)
    const beforeSnapshot: Record<string, unknown> = {};
    const afterSnapshot: Record<string, unknown> = {};
    for (const k of Object.keys(updates)) {
      if (k === "updatedAt") continue;
      beforeSnapshot[k] = (before as Record<string, unknown>)[k];
      afterSnapshot[k] = (after as Record<string, unknown>)[k];
    }

    // Second audit table (template_audit_logs B5) — uses base db (post-tx), same
    // behavior as before refactor since the wrapper only owns admin_audit_logs.
    await logTemplateAudit({
      actorType: "admin",
      actorId: admin.id,
      templateId: resourceId,
      action: "edited",
      before: beforeSnapshot,
      after: afterSnapshot,
    });

    return { ok: true, template: after } as const;
  },
});

/**
 * DELETE /api/admin/templates/[id]
 * Soft-delete an official template.
 * Logs to both admin_audit_logs (via wrapper) and template_audit_logs (B5).
 */
export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "templates.delete",
  resourceType: "template",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const t = await getTemplateTx(tx, resourceId);
    if (!t) return null;
    return { title: t.title, slug: t.slug, isOfficial: t.isOfficial };
  },
  handler: async ({ tx, admin, resourceId }) => {
    const template = await getTemplateTx(tx, resourceId);
    if (!template) {
      return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    }
    if (!template.isOfficial) {
      return NextResponse.json(
        { error: "Seuls les modèles officiels peuvent être supprimés via l'admin." },
        { status: 403 }
      );
    }

    await tx
      .update(prescriptionTemplates)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(prescriptionTemplates.id, resourceId));

    await logTemplateAudit({
      actorType: "admin",
      actorId: admin.id,
      templateId: resourceId,
      action: "deleted",
      before: { title: template.title, slug: template.slug },
    });

    return { ok: true } as const;
  },
});
