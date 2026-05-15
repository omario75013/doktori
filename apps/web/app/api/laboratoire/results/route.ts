import { NextRequest, NextResponse } from "next/server";
import { db, labOrders, patientDocuments, patients, doctors, labUsers } from "@doktori/db";
import { and, eq, gte, ilike, lte, or, sql, count, desc } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

// GET /api/laboratoire/results
// Paginated list of lab results for this lab.
// Query params: status, q (search), from, to, page, pageSize
export async function GET(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20", 10)));

  const conditions = [
    or(
      eq(labOrders.completedByLabId, labId),
      eq(labOrders.labId, labId)
    ),
    // Must have a result uploaded
    sql`${labOrders.resultUploadedAt} IS NOT NULL`,
  ];

  if (status && (status === "result_ready" || status === "completed")) {
    conditions.push(eq(labOrders.status, status === "result_ready" ? "completed" : "completed"));
  }
  if (q) {
    conditions.push(ilike(patients.name, `%${q}%`));
  }
  if (from) {
    conditions.push(gte(labOrders.resultUploadedAt, new Date(from)));
  }
  if (to) {
    conditions.push(lte(labOrders.resultUploadedAt, new Date(to)));
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ cnt: count() })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .leftJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .where(whereClause);

  const total = Number(totalRow?.cnt ?? 0);

  const rows = await db
    .select({
      id: labOrders.id,
      internalRef: labOrders.internalRef,
      status: labOrders.status,
      tests: labOrders.tests,
      urgency: labOrders.urgency,
      resultUploadedAt: labOrders.resultUploadedAt,
      patientId: labOrders.patientId,
      patientName: patients.name,
      doctorId: labOrders.doctorId,
      doctorName: doctors.name,
      technicianId: labOrders.technicianId,
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .leftJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .where(whereClause)
    .orderBy(desc(labOrders.resultUploadedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  // Fetch document URLs for each order
  const orderIds = rows.map((r) => r.id);
  let docsByOrder: Record<string, string> = {};
  if (orderIds.length > 0) {
    const docs = await db
      .select({
        labOrderId: patientDocuments.labOrderId,
        fileUrl: patientDocuments.fileUrl,
      })
      .from(patientDocuments)
      .where(
        and(
          eq(patientDocuments.uploadedByLabId, labId),
          sql`${patientDocuments.labOrderId} = ANY(ARRAY[${sql.join(orderIds.map((id) => sql`${id}::uuid`), sql`, `)}])`
        )
      )
      .limit(500);
    docsByOrder = Object.fromEntries(
      docs.filter((d) => d.labOrderId).map((d) => [d.labOrderId!, d.fileUrl])
    );
  }

  // Fetch technician names
  const techIds = [...new Set(rows.map((r) => r.technicianId).filter(Boolean))] as string[];
  let techNames: Record<string, string> = {};
  if (techIds.length > 0) {
    const techs = await db
      .select({ id: labUsers.id, firstName: labUsers.firstName, lastName: labUsers.lastName })
      .from(labUsers)
      .where(
        sql`${labUsers.id} = ANY(ARRAY[${sql.join(techIds.map((id) => sql`${id}::uuid`), sql`, `)}])`
      );
    techNames = Object.fromEntries(
      techs.map((t) => [t.id, `${t.firstName} ${t.lastName}`])
    );
  }

  const enriched = rows.map((r) => ({
    ...r,
    fileUrl: docsByOrder[r.id] ?? null,
    technicianName: r.technicianId ? (techNames[r.technicianId] ?? null) : null,
  }));

  return NextResponse.json({ rows: enriched, total, page, pageSize });
}
