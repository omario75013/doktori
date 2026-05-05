import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/require-auth";
import {
  db,
  appointmentTypes,
  appointmentTypePractices,
  doctorPractices,
} from "@doktori/db";
import { eq, and, inArray } from "drizzle-orm";
import { invalidate } from "@/lib/cache";

async function loadPracticesMap(typeIds: string[]) {
  if (typeIds.length === 0) return {};
  const rows = await db
    .select()
    .from(appointmentTypePractices)
    .where(inArray(appointmentTypePractices.appointmentTypeId, typeIds));
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    if (!map[row.appointmentTypeId]) map[row.appointmentTypeId] = [];
    map[row.appointmentTypeId].push(row.practiceId);
  }
  return map;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  // Public path by doctorId doesn't need auth; skip expensive auth() call.
  const user = doctorId ? null : await requireAuth(req);

  if (doctorId) {
    // Public: list active types for a doctor (for booking page)
    const types = await db
      .select()
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.doctorId, doctorId), eq(appointmentTypes.isActive, true)))
      .orderBy(appointmentTypes.name);
    const practicesByType = await loadPracticesMap(types.map((t) => t.id));
    return NextResponse.json(
      types.map((t) => ({ ...t, practiceIds: practicesByType[t.id] ?? [] }))
    );
  }

  // Auth-gated: list current doctor's types
  if (!user || user.role !== "doctor")
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const types = await db
    .select()
    .from(appointmentTypes)
    .where(eq(appointmentTypes.doctorId, user.id));
  const practicesByType = await loadPracticesMap(types.map((t) => t.id));
  return NextResponse.json(
    types.map((t) => ({ ...t, practiceIds: practicesByType[t.id] ?? [] }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor")
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { name, durationMinutes, fee, color, mode, practiceIds } = body as {
      name?: string;
      durationMinutes?: number;
      fee?: number;
      color?: string;
      mode?: string;
      practiceIds?: string[];
    };

    if (!name || typeof durationMinutes !== "number" || durationMinutes < 5 || durationMinutes > 120) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    if (!Array.isArray(practiceIds) || practiceIds.length === 0) {
      return NextResponse.json(
        { error: "Sélectionnez au moins un cabinet pour ce motif" },
        { status: 400 }
      );
    }

    // Validate all practices belong to the requesting doctor
    const owned = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(
        and(
          eq(doctorPractices.doctorId, user.id),
          inArray(doctorPractices.id, practiceIds)
        )
      );
    if (owned.length !== practiceIds.length) {
      return NextResponse.json({ error: "Cabinet invalide" }, { status: 400 });
    }

    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(appointmentTypes)
        .values({
          doctorId: user.id,
          name,
          durationMinutes,
          fee: typeof fee === "number" && fee > 0 ? fee * 1000 : null, // millimes
          color: color || "#2563eb",
          mode: mode === "teleconsult" ? "teleconsult" : "cabinet",
        })
        .returning();
      await tx.insert(appointmentTypePractices).values(
        practiceIds.map((pid) => ({ appointmentTypeId: row.id, practiceId: pid }))
      );
      return row;
    });

    await invalidate(`doctor:apptTypes:${user.id}`);

    return NextResponse.json({ ...created, practiceIds }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/appointment-types]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
