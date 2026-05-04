import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, prescriptionTemplates, templateAuditLogs } from "@doktori/db";
import { eq, or, and, isNull, count } from "drizzle-orm";
import { validateMarkdown } from "@/lib/templates/sanitize";
import { logTemplateAudit } from "@/lib/templates/audit";

const TEMPLATE_LIMIT = 200;

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const language = searchParams.get("language");

    const baseWhere = or(
      eq(prescriptionTemplates.doctorId, user.id),
      eq(prescriptionTemplates.isOfficial, true)
    );

    const rows = await db
      .select()
      .from(prescriptionTemplates)
      .where(
        language
          ? and(baseWhere, isNull(prescriptionTemplates.deletedAt), eq(prescriptionTemplates.language, language))
          : and(baseWhere, isNull(prescriptionTemplates.deletedAt))
      )
      .orderBy(prescriptionTemplates.isOfficial, prescriptionTemplates.title);

    return NextResponse.json(rows);
  } catch (e) {
    console.error("[GET /api/medecin/templates]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, language, bodyMarkdown, targetType } = body;

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

    // Check 200-template limit per doctor
    const [{ value: existingCount }] = await db
      .select({ value: count() })
      .from(prescriptionTemplates)
      .where(
        and(
          eq(prescriptionTemplates.doctorId, user.id),
          isNull(prescriptionTemplates.deletedAt)
        )
      );

    if (Number(existingCount) >= TEMPLATE_LIMIT) {
      return NextResponse.json(
        { error: `Limite de ${TEMPLATE_LIMIT} modèles atteinte` },
        { status: 422 }
      );
    }

    const [created] = await db
      .insert(prescriptionTemplates)
      .values({
        doctorId: user.id,
        title: title.trim(),
        description: description ?? null,
        language: language ?? "fr",
        bodyMarkdown,
        targetType: targetType ?? "prescription",
        isOfficial: false,
      })
      .returning();

    // B5 audit bilateral
    await logTemplateAudit({
      actorType: "doctor",
      actorId: user.id,
      templateId: created.id,
      action: "created",
      after: { title: created.title, language: created.language },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[POST /api/medecin/templates]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
