import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, appointments, doctors, patients } from "@doktori/db";
import { and, eq, gte, lte, ilike, or, inArray, desc } from "drizzle-orm";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.getAll("status");
  const type = searchParams.getAll("type");
  const doctorId = searchParams.get("doctorId");
  const patientId = searchParams.get("patientId");
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10));
  const offset = (page - 1) * limit;

  // Default: today and tomorrow
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const defaultTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);

  const fromDate = from ? new Date(from) : defaultFrom;
  const toDate = to ? new Date(to) : defaultTo;

  const conditions = [
    gte(appointments.startsAt, fromDate),
    lte(appointments.startsAt, toDate),
  ];

  if (status.length > 0) {
    conditions.push(inArray(appointments.status, status));
  }
  if (type.length > 0) {
    conditions.push(inArray(appointments.type, type));
  }
  if (doctorId) {
    conditions.push(eq(appointments.doctorId, doctorId));
  }
  if (patientId) {
    conditions.push(eq(appointments.patientId, patientId));
  }

  // If there's a text query, we filter in-memory after fetch (simpler than a
  // cross-join ilike on both tables at SQL level for this list view).
  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      practiceId: appointments.practiceId,
      reason: appointments.reason,
      doctorId: appointments.doctorId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      patientId: appointments.patientId,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(...conditions))
    .orderBy(appointments.startsAt)
    .limit(limit + 1) // fetch one extra to detect next page
    .offset(offset);

  type Row = typeof rows extends Array<infer T> ? T : never;

  const filtered = q
    ? rows.filter((r: Row) => {
        const lq = q.toLowerCase();
        return (
          (r.patientName as string).toLowerCase().includes(lq) ||
          (r.patientPhone as string).toLowerCase().includes(lq) ||
          (r.doctorName as string).toLowerCase().includes(lq)
        );
      })
    : rows;

  const hasMore = filtered.length > limit;
  const data = hasMore ? filtered.slice(0, limit) : filtered;

  return NextResponse.json({
    appointments: (data as Row[]).map((r) => ({
      ...r,
      startsAt: (r.startsAt as Date).toISOString(),
      endsAt: (r.endsAt as Date).toISOString(),
    })),
    hasMore,
    page,
  });
}
