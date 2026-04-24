import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  db,
  appointmentTypes,
  appointmentTypePractices,
  doctorPractices,
} from "@doktori/db";
import { eq, and, inArray } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const { id } = await params;

    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      durationMinutes?: number;
      fee?: number | null;
      color?: string;
      mode?: string;
      isActive?: boolean;
      practiceIds?: string[];
    };

    // Ownership check
    const [existing] = await db
      .select({ id: appointmentTypes.id })
      .from(appointmentTypes)
      .where(
        and(
          eq(appointmentTypes.id, id),
          eq(appointmentTypes.doctorId, user.id)
        )
      )
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Motif introuvable" }, { status: 404 });
    }

    // Validate practices if provided
    if (body.practiceIds !== undefined) {
      if (!Array.isArray(body.practiceIds) || body.practiceIds.length === 0) {
        return NextResponse.json(
          { error: "Sélectionnez au moins un cabinet" },
          { status: 400 }
        );
      }
      const owned = await db
        .select({ id: doctorPractices.id })
        .from(doctorPractices)
        .where(
          and(
            eq(doctorPractices.doctorId, user.id),
            inArray(doctorPractices.id, body.practiceIds)
          )
        );
      if (owned.length !== body.practiceIds.length) {
        return NextResponse.json({ error: "Cabinet invalide" }, { status: 400 });
      }
    }

    await db.transaction(async (tx) => {
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.durationMinutes !== undefined) patch.durationMinutes = body.durationMinutes;
      if (body.fee !== undefined) {
        patch.fee = typeof body.fee === "number" && body.fee > 0 ? body.fee * 1000 : null;
      }
      if (body.color !== undefined) patch.color = body.color;
      if (body.mode !== undefined) {
        patch.mode = body.mode === "teleconsult" ? "teleconsult" : "cabinet";
      }
      if (body.isActive !== undefined) patch.isActive = body.isActive;

      if (Object.keys(patch).length > 0) {
        await tx.update(appointmentTypes).set(patch).where(eq(appointmentTypes.id, id));
      }

      if (body.practiceIds !== undefined) {
        await tx
          .delete(appointmentTypePractices)
          .where(eq(appointmentTypePractices.appointmentTypeId, id));
        await tx.insert(appointmentTypePractices).values(
          body.practiceIds.map((pid) => ({ appointmentTypeId: id, practiceId: pid }))
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/appointment-types/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(_req);
    if (!user || user.role !== "doctor")
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;
    const [updated] = await db
      .update(appointmentTypes)
      .set({ isActive: false })
      .where(
        and(eq(appointmentTypes.id, id), eq(appointmentTypes.doctorId, user.id))
      )
      .returning();

    if (!updated) return NextResponse.json({ error: "Type introuvable" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/appointment-types/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
