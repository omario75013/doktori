import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, patients, appointments, reviews } from "@doktori/db";
import { eq, ilike, or, desc, sql, and } from "drizzle-orm";

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));
  const suspended = searchParams.get("suspended");
  const offset = (page - 1) * limit;

  const conditions = [];
  if (q) {
    conditions.push(
      or(
        ilike(patients.name, `%${q}%`),
        ilike(patients.phone, `%${q}%`),
        ilike(patients.email, `%${q}%`)
      )
    );
  }
  if (suspended === "true") {
    conditions.push(eq(patients.isSuspended, true));
  } else if (suspended === "false") {
    conditions.push(eq(patients.isSuspended, false));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const list = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
      noShowCount: patients.noShowCount,
      lastMinuteCancelCount: patients.lastMinuteCancelCount,
      isSuspended: patients.isSuspended,
      suspensionReason: patients.suspensionReason,
      suspendedAt: patients.suspendedAt,
      createdAt: patients.createdAt,
      apptCount: sql<number>`(select count(*) from ${appointments} where ${appointments.patientId} = ${patients.id})::int`,
      reviewCount: sql<number>`(select count(*) from ${reviews} where ${reviews.patientId} = ${patients.id})::int`,
    })
    .from(patients)
    .where(where)
    .orderBy(desc(patients.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ patients: list, page, limit });
}
