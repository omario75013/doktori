import { NextRequest, NextResponse } from "next/server";
import { db, labOrders, patients, labs } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.literal("cancelled"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const { id } = await params;

  const [row] = await db
    .select({
      id: labOrders.id,
      patientId: labOrders.patientId,
      patientName: patients.name,
      labId: labOrders.labId,
      labName: labs.name,
      tests: labOrders.tests,
      instructions: labOrders.instructions,
      urgency: labOrders.urgency,
      status: labOrders.status,
      accessToken: labOrders.accessToken,
      completedAt: labOrders.completedAt,
      createdAt: labOrders.createdAt,
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .leftJoin(labs, eq(labOrders.labId, labs.id))
    .where(and(eq(labOrders.id, id), eq(labOrders.doctorId, doctor.id)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  return NextResponse.json({ order: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  // Fetch the order and ensure it belongs to this doctor and is still pending.
  const [existing] = await db
    .select({ id: labOrders.id, status: labOrders.status, doctorId: labOrders.doctorId })
    .from(labOrders)
    .where(eq(labOrders.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (existing.doctorId !== doctor.id) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Seules les demandes en attente peuvent être annulées" },
      { status: 422 },
    );
  }

  const [updated] = await db
    .update(labOrders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(labOrders.id, id))
    .returning();

  return NextResponse.json({ order: updated });
}
