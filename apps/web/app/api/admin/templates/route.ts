import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { logTemplateAudit } from "@/lib/templates/audit";
import { validateMarkdown } from "@/lib/templates/sanitize";
import { db, prescriptionTemplates } from "@doktori/db";
import { eq, isNull, and, desc, count, sql } from "drizzle-orm";
import type { AdminSession } from "@/lib/admin-auth";

/**
 * GET /api/admin/templates
 * List all templates (official + personal) with apply/clone counts.
 * Query params: ?official=true|false  ?language=fr|ar  ?q=search  ?limit=50
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const officialOnly = searchParams.get("official");
  const language = searchParams.get("language");
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  const conditions = [isNull(prescriptionTemplates.deletedAt)];

  if (officialOnly === "true") {
    conditions.push(eq(prescriptionTemplates.isOfficial, true));
  } else if (officialOnly === "false") {
    conditions.push(eq(prescriptionTemplates.isOfficial, false));
  }

  if (language === "fr" || language === "ar") {
    conditions.push(eq(prescriptionTemplates.language, language));
  }

  const rows = await db
    .select({
      id: prescriptionTemplates.id,
      title: prescriptionTemplates.title,
      description: prescriptionTemplates.description,
      language: prescriptionTemplates.language,
      slug: prescriptionTemplates.slug,
      isOfficial: prescriptionTemplates.isOfficial,
      doctorId: prescriptionTemplates.doctorId,
      targetType: prescriptionTemplates.targetType,
      applyCount: prescriptionTemplates.applyCount,
      cloneCount: prescriptionTemplates.cloneCount,
      version: prescriptionTemplates.version,
      createdAt: prescriptionTemplates.createdAt,
      updatedAt: prescriptionTemplates.updatedAt,
    })
    .from(prescriptionTemplates)
    .where(and(...conditions))
    .orderBy(desc(prescriptionTemplates.isOfficial), desc(prescriptionTemplates.updatedAt))
    .limit(limit);

  // Total counts for admin summary
  const [{ total }] = await db
    .select({ total: count() })
    .from(prescriptionTemplates)
    .where(isNull(prescriptionTemplates.deletedAt));

  const [{ officialCount }] = await db
    .select({ officialCount: sql<number>`count(*)::int` })
    .from(prescriptionTemplates)
    .where(
      and(
        isNull(prescriptionTemplates.deletedAt),
        eq(prescriptionTemplates.isOfficial, true)
      )
    );

  return NextResponse.json({ templates: rows, total: Number(total), officialCount: Number(officialCount) });
}

/**
 * POST /api/admin/templates
 * Create an official template (is_official=true, doctor_id=null).
 * Requires: super_admin role.
 * Logs to both admin_audit_logs and template_audit_logs (double audit B5).
 */
export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json()) as Record<string, unknown>;
  const { title, description, language, slug, bodyMarkdown, targetType } = body;

  // Validate required fields
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }
  if (title.length > 120) {
    return NextResponse.json({ error: "Titre trop long (max 120 caractères)" }, { status: 400 });
  }
  if (!bodyMarkdown || typeof bodyMarkdown !== "string") {
    return NextResponse.json({ error: "Contenu requis" }, { status: 400 });
  }
  if (!slug || typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug) || slug.length > 60) {
    return NextResponse.json(
      { error: "Slug invalide (lettres minuscules, chiffres, tirets, max 60 caractères)" },
      { status: 400 }
    );
  }

  // B1 XSS: validate markdown content
  const validation = validateMarkdown(bodyMarkdown);
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

  let created: typeof prescriptionTemplates.$inferSelect;
  try {
    const [inserted] = await db
      .insert(prescriptionTemplates)
      .values({
        doctorId: null,
        title: title.trim(),
        description: description && typeof description === "string" ? description.trim() || null : null,
        language: (language === "ar" ? "ar" : "fr") as "fr" | "ar",
        slug: slug.trim(),
        bodyMarkdown,
        targetType: typeof targetType === "string" ? targetType : "prescription",
        isOfficial: true,
      })
      .returning();
    created = inserted;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("prescription_templates_official_slug_uidx") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "Ce slug est déjà utilisé par un autre modèle officiel actif." },
        { status: 409 }
      );
    }
    console.error("[POST /api/admin/templates]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  const meta = extractRequestMeta(req);

  // Double audit: admin_audit_logs + template_audit_logs (B5)
  await logAudit({
    actor: admin as AdminSession,
    action: "templates.create",
    resourceType: "template",
    resourceId: created.id,
    before: null,
    after: { title: created.title, slug: created.slug, language: created.language, isOfficial: true },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  await logTemplateAudit({
    actorType: "admin",
    actorId: (admin as AdminSession).id,
    templateId: created.id,
    action: "created",
    after: { title: created.title, slug: created.slug, language: created.language, isOfficial: true },
  });

  return NextResponse.json({ template: created }, { status: 201 });
}
