import { NextRequest, NextResponse } from "next/server";
import {
  db,
  appointments,
  doctors,
  patients,
  clinicRooms,
} from "@doktori/db";
import { eq, and, gte, lte, inArray, desc, count, or, isNull } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { getClinicScope } from "@/lib/clinic-scope";

export async function GET(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { searchParams } = new URL(req.url);
  const doctorFilter = searchParams.get("doctorId");
  const statusFilter = searchParams.get("status");
  const dateFilter = searchParams.get("date"); // today | tomorrow | week

  // Pagination params
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSizeParam = parseInt(searchParams.get("pageSize") ?? "50", 10);
  const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
  const pageSize = Math.min(200, Math.max(1, isNaN(pageSizeParam) ? 50 : pageSizeParam));
  const offset = (page - 1) * pageSize;

  // Resolve clinic scope (doctors + practices)
  const scope = await getClinicScope(clinic.id);
  const allDoctorIds = scope.doctorIds;
  const allPracticeIds = scope.practiceIds;

  if (allDoctorIds.length === 0) {
    return NextResponse.json({ rows: [], page, pageSize, total: 0 });
  }

  // Determine doctor scope (one specific doctor or all)
  const targetDoctorIds =
    doctorFilter && allDoctorIds.includes(doctorFilter)
      ? [doctorFilter]
      : allDoctorIds;

  // Build date range
  const now = new Date();
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  if (dateFilter === "today") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (dateFilter === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateFrom = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0);
    dateTo = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);
  } else if (dateFilter === "week") {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    dateFrom = now;
    dateTo = weekEnd;
  }

  // Build where conditions — scope to clinic practices only
  // Include legacy rows where practiceId is NULL (pre-migration) to avoid data gaps.
  const practiceCondition =
    allPracticeIds.length > 0
      ? or(inArray(appointments.practiceId, allPracticeIds), isNull(appointments.practiceId))!
      : isNull(appointments.practiceId);

  const conditions = [
    inArray(appointments.doctorId, targetDoctorIds),
    practiceCondition,
  ];

  if (statusFilter && statusFilter !== "all") {
    conditions.push(eq(appointments.status, statusFilter));
  }

  if (dateFrom) {
    conditions.push(gte(appointments.startsAt, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(appointments.startsAt, dateTo));
  }

  const whereClause = and(...conditions);

  // Count total rows (same filters, no pagination)
  const [{ total }] = await db
    .select({ total: count() })
    .from(appointments)
    .where(whereClause);

  // Fetch paginated rows
  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      checkedInAt: appointments.checkedInAt,
      confirmedAt: appointments.confirmedAt,
      cancelledAt: appointments.cancelledAt,
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      patientName: patients.name,
      patientPhone: patients.phone,
      clinicRoomId: appointments.clinicRoomId,
      clinicRoomName: clinicRooms.name,
      clinicRoomColor: clinicRooms.color,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(clinicRooms, eq(appointments.clinicRoomId, clinicRooms.id))
    .where(whereClause)
    .orderBy(desc(appointments.startsAt))
    .limit(pageSize)
    .offset(offset);

  return NextResponse.json({ rows, page, pageSize, total });
}
