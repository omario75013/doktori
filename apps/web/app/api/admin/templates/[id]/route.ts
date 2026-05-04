import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { logTemplateAudit } from "@/lib/templates/audit";
import { validateMarkdown } from "@/lib/templates/sanitize";
import { db, prescriptionTemplates } from "@doktori/db";
import { eq, and, isNull } from "drizzle-orm";
import type { AdminSession } from "@/lib/admin-auth";

type RouteContext = { params: Promise<{ id: string }> };

async function getTemplate(id: string) {
  const [row] = await db
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
export async function GET(req: Request, ctx: RouteContext) {
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
 * Logs to both admin_audit_logs and template_audit_logs (double audit B5).
 */
export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await ctx.params;
    const before = await getTemplate(id);

    if (!before) {
      return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    }

    // Doctor templates are read-only from admin (audit only — no mutations)
    if (!before.isOfficial) {
      return NextResponse.json(
        { error: "Les modèles personnels des médecins sont en lecture seule depuis l'interface admin." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const { title, description, language, slug, bodyMarkdown, targetType } = body;

    // Validate fields when provided
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "Titre invalide" }, { status: 400 });
      }
      if ((title as string).length > 120) {
        return NextResponse.json({ error: "Titre trop long (max 120 caractères)" }, { status: 400 });
      }
    }

    if (slug !== undefined) {
      if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug) || (slug as string).length > 60) {
        return NextResponse.json(
          { error: "Slug invalide (lettres minuscules, chiffres, tirets, max 60 caractères)" },
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
    if (language !== undefined) updates.language = (language as "fr" | "ar");
    if (slug !== undefined) updates.slug = (slug as string).trim();
    if (bodyMarkdown !== undefined) updates.bodyMarkdown = bodyMarkdown as string;
    if (targetType !== undefined) updates.targetType = targetType as string;

    let after: typeof prescriptionTemplates.$inferSelect;
    try {
      const [updated] = await db
        .update(prescriptionTemplates)
        .set(updates)
        .where(eq(prescriptionTemplates.id, id))
        .returning();
      after = updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("prescription_templates_official_slug_uidx") || msg.includes("unique")) {
        return NextResponse.json(
          { error: "Ce slug est déjà utilisé par un autre modèle officiel actif." },
          { status: 409 }
        );
      }
      throw err;
    }

    const meta = extractRequestMeta(req);

    // Build before/after snapshots for changed fields only
    const beforeSnapshot: Record<string, unknown> = {};
    const afterSnapshot: Record<string, unknown> = {};
    for (const k of Object.keys(updates)) {
      if (k === "updatedAt") continue;
      beforeSnapshot[k] = (before as Record<string, unknown>)[k];
      afterSnapshot[k] = (after as Record<string, unknown>)[k];
    }

    // Double audit: admin_audit_logs + template_audit_logs (B5)
    await logAudit({
      actor: admin as AdminSession,
      action: "templates.update",
      resourceType: "template",
      resourceId: id,
      before: beforeSnapshot,
      after: afterSnapshot,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await logTemplateAudit({
      actorType: "admin",
      actorId: (admin as AdminSession).id,
      templateId: id,
      action: "edited",
      before: beforeSnapshot,
      after: afterSnapshot,
    });

    return NextResponse.json({ ok: true, template: after });
  } catch (e) {
    console.error("[PATCH /api/admin/templates/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/templates/[id]
 * Soft-delete an official template.
 * Logs to both admin_audit_logs and template_audit_logs (double audit B5).
 */
export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await ctx.params;
    const template = await getTemplate(id);

    if (!template) {
      return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    }

    // Only official templates can be deleted from admin
    if (!template.isOfficial) {
      return NextResponse.json(
        { error: "Seuls les modèles officiels peuvent être supprimés via l'admin." },
        { status: 403 }
      );
    }

    await db
      .update(prescriptionTemplates)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(prescriptionTemplates.id, id));

    const meta = extractRequestMeta(req);

    // Double audit: admin_audit_logs + template_audit_logs (B5)
    await logAudit({
      actor: admin as AdminSession,
      action: "templates.delete",
      resourceType: "template",
      resourceId: id,
      before: { title: template.title, slug: template.slug, isOfficial: template.isOfficial },
      after: null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await logTemplateAudit({
      actorType: "admin",
      actorId: (admin as AdminSession).id,
      templateId: id,
      action: "deleted",
      before: { title: template.title, slug: template.slug },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/templates/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
