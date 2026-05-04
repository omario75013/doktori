import { NextRequest, NextResponse } from "next/server";
import { db, appointments } from "@doktori/db";
import { and, eq, inArray, not } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

const bodySchema = z.object({ reason: z.string().trim().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const now = new Date();
  const [updated] = await db
    .update(appointments)
    .set({
      status: "cancelled",
      cancelledAt: now,
      cancellationReason: parsed.data.reason ?? null,
      updatedAt: now,
    })
    .where(
      and(
        eq(appointments.id, id),
        eq(appointments.patientId, patient.id),
        not(inArray(appointments.status, ["cancelled", "completed"])),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "RDV introuvable ou déjà annulé" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: updated.id });
}
