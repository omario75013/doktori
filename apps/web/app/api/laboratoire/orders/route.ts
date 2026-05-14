import { NextRequest, NextResponse } from "next/server";
import { db, labOrders, patients, doctors } from "@doktori/db";
import { desc, eq, isNull, or } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// GET — inbox for the authenticated lab.
// Returns orders where lab_id = current lab OR lab_id IS NULL (walk-in / any lab).
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "lab") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: labOrders.id,
      patientId: labOrders.patientId,
      patientName: patients.name,
      patientPhone: patients.phone,
      doctorId: labOrders.doctorId,
      doctorName: doctors.name,
      labId: labOrders.labId,
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
    .innerJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .where(
      or(
        eq(labOrders.labId, user.id),
        isNull(labOrders.labId),
      ),
    )
    .orderBy(desc(labOrders.createdAt));

  return NextResponse.json({ orders: rows });
}
