import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, prescriptionTemplates } from "@doktori/db";
import { eq, and, isNull } from "drizzle-orm";
import { validateMarkdown } from "@/lib/templates/sanitize";
import { logTemplateAudit } from "@/lib/templates/audit";

type RouteContext = { params: Promise<{ id: string }> };

async function getTemplate(id: string) {
  const [template] = await db
    .select()
    .from(prescriptionTemplates)
    .where(and(eq(prescriptionTemplates.id, id), isNull(prescriptionTemplates.deletedAt)))
    .limit(1);
  return template ?? null;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const template = await getTemplate(id);

    if (!template) {
      return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    }

    // Allow access to own templates OR official templates
    if (!template.isOfficial && template.doctorId !== user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json(template);
  } catch (e) {
    console.error("[GET /api/medecin/templates/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const template = await getTemplate(id);

    if (!template) {
      return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    }

    // Cannot edit official templates (B5)
    if (template.isOfficial) {
      return NextResponse.json(
        { error: "OFFICIAL_TEMPLATE_READ_ONLY" },
        { status: 403 }
      );
    }

    // B2 IDOR: can only edit own templates
    if (template.doctorId !== user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, language, bodyMarkdown, targetType } = body;

    // Validate fields if provided
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "Titre invalide" }, { status: 400 });
      }
      if (title.length > 120) {
        return NextResponse.json({ error: "Titre trop long (max 120 caractères)" }, { status: 400 });
      }
    }

    if (bodyMarkdown !== undefined) {
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
    }

    const updates: Partial<typeof prescriptionTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (language !== undefined) updates.language = language;
    if (bodyMarkdown !== undefined) updates.bodyMarkdown = bodyMarkdown;
    if (targetType !== undefined) updates.targetType = targetType;

    const [updated] = await db
      .update(prescriptionTemplates)
      .set(updates)
      .where(eq(prescriptionTemplates.id, id))
      .returning();

    // B5 audit bilateral
    await logTemplateAudit({
      actorType: "doctor",
      actorId: user.id,
      templateId: id,
      action: "edited",
      before: { title: template.title, bodyMarkdown: template.bodyMarkdown },
      after: { title: updated.title, bodyMarkdown: updated.bodyMarkdown },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/medecin/templates/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const template = await getTemplate(id);

    if (!template) {
      return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    }

    // Cannot delete official templates
    if (template.isOfficial) {
      return NextResponse.json(
        { error: "OFFICIAL_TEMPLATE_READ_ONLY" },
        { status: 403 }
      );
    }

    // B2 IDOR: can only delete own templates
    if (template.doctorId !== user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    await db
      .update(prescriptionTemplates)
      .set({ deletedAt: new Date() })
      .where(eq(prescriptionTemplates.id, id));

    // B5 audit bilateral
    await logTemplateAudit({
      actorType: "doctor",
      actorId: user.id,
      templateId: id,
      action: "deleted",
      before: { title: template.title },
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[DELETE /api/medecin/templates/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
