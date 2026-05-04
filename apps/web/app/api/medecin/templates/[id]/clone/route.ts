import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, prescriptionTemplates } from "@doktori/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { logTemplateAudit } from "@/lib/templates/audit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await ctx.params;

    // Fetch source template — must exist and not be deleted
    const [source] = await db
      .select()
      .from(prescriptionTemplates)
      .where(and(eq(prescriptionTemplates.id, id), isNull(prescriptionTemplates.deletedAt)))
      .limit(1);

    if (!source) {
      return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    }

    // B2 IDOR: can only clone own templates OR official templates
    // A doctor cannot clone another doctor's personal template
    if (!source.isOfficial && source.doctorId !== user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Transaction: insert clone + increment cloneCount on source (B3)
    const [cloned] = await db.transaction(async (tx) => {
      const [newTemplate] = await tx
        .insert(prescriptionTemplates)
        .values({
          doctorId: user.id,
          title: `${source.title} (copie)`,
          description: source.description,
          language: source.language,
          bodyMarkdown: source.bodyMarkdown,
          targetType: source.targetType,
          isOfficial: false,
          clonedFromId: source.id,
        })
        .returning();

      // B3: increment cloneCount on source
      await tx
        .update(prescriptionTemplates)
        .set({ cloneCount: sql`${prescriptionTemplates.cloneCount} + 1` })
        .where(eq(prescriptionTemplates.id, source.id));

      return [newTemplate];
    });

    // B5 audit bilateral
    await logTemplateAudit({
      actorType: "doctor",
      actorId: user.id,
      templateId: cloned.id,
      action: "cloned",
      context: { clonedFromId: source.id, sourceTitle: source.title },
    });

    return NextResponse.json(cloned, { status: 201 });
  } catch (e) {
    console.error("[POST /api/medecin/templates/[id]/clone]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
