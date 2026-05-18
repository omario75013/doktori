import { NextRequest, NextResponse } from "next/server";
import { db, clinicRdvRequests, doctors } from "@doktori/db";
import { eq, and, desc } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

// GET /api/clinique/rdv-requests?status=pending
export async function GET(req: NextRequest) {
  const ctx = await requireClinic();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where = status
    ? and(
        eq(clinicRdvRequests.clinicId, ctx.id),
        eq(clinicRdvRequests.status, status),
      )
    : eq(clinicRdvRequests.clinicId, ctx.id);

  const rows = await db
    .select({
      id: clinicRdvRequests.id,
      patientName: clinicRdvRequests.patientName,
      patientPhone: clinicRdvRequests.patientPhone,
      patientEmail: clinicRdvRequests.patientEmail,
      patientCin: clinicRdvRequests.patientCin,
      motif: clinicRdvRequests.motif,
      specialtyHint: clinicRdvRequests.specialtyHint,
      preferredDate: clinicRdvRequests.preferredDate,
      preferredTimeRange: clinicRdvRequests.preferredTimeRange,
      notes: clinicRdvRequests.notes,
      status: clinicRdvRequests.status,
      assignedDoctorId: clinicRdvRequests.assignedDoctorId,
      assignedDoctorName: doctors.name,
      assignedAt: clinicRdvRequests.assignedAt,
      cancelledReason: clinicRdvRequests.cancelledReason,
      createdAt: clinicRdvRequests.createdAt,
    })
    .from(clinicRdvRequests)
    .leftJoin(doctors, eq(clinicRdvRequests.assignedDoctorId, doctors.id))
    .where(where)
    .orderBy(desc(clinicRdvRequests.createdAt))
    .limit(200);

  return NextResponse.json({ requests: rows });
}
