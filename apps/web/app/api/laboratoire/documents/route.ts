import { NextRequest, NextResponse } from "next/server";
import { db, patientDocuments, patients, labs, labOrders } from "@doktori/db";
import { and, eq, ilike, sql, desc, count } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

// GET /api/laboratoire/documents?bucket=uploaded|received&q=&page=&pageSize=
export async function GET(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket") === "received" ? "received" : "uploaded";
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20", 10)));

  if (bucket === "uploaded") {
    const baseWhere = q
      ? and(eq(patientDocuments.uploadedByLabId, labId), ilike(patients.name, `%${q}%`))
      : eq(patientDocuments.uploadedByLabId, labId);

    const [totalRow] = await db
      .select({ cnt: count() })
      .from(patientDocuments)
      .innerJoin(patients, eq(patientDocuments.patientId, patients.id))
      .where(baseWhere);

    const rows = await db
      .select({
        id: patientDocuments.id,
        patientId: patientDocuments.patientId,
        patientName: patients.name,
        fileName: patientDocuments.fileName,
        fileUrl: patientDocuments.fileUrl,
        mimeType: patientDocuments.mimeType,
        category: patientDocuments.category,
        title: patientDocuments.title,
        note: patientDocuments.note,
        labOrderId: patientDocuments.labOrderId,
        uploadedByLabId: patientDocuments.uploadedByLabId,
        sharedWithLabIds: patientDocuments.sharedWithLabIds,
        createdAt: patientDocuments.createdAt,
      })
      .from(patientDocuments)
      .innerJoin(patients, eq(patientDocuments.patientId, patients.id))
      .where(baseWhere)
      .orderBy(desc(patientDocuments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({ rows, total: Number(totalRow?.cnt ?? 0), page, pageSize });
  }

  // received: docs where labId = ANY(shared_with_lab_ids) AND NOT uploaded by us
  const receivedWhere = q
    ? and(
        sql`${patientDocuments.sharedWithLabIds} @> ARRAY[${labId}::uuid]`,
        sql`(${patientDocuments.uploadedByLabId} IS NULL OR ${patientDocuments.uploadedByLabId} != ${labId}::uuid)`,
        ilike(patients.name, `%${q}%`)
      )
    : and(
        sql`${patientDocuments.sharedWithLabIds} @> ARRAY[${labId}::uuid]`,
        sql`(${patientDocuments.uploadedByLabId} IS NULL OR ${patientDocuments.uploadedByLabId} != ${labId}::uuid)`
      );

  const [totalRow] = await db
    .select({ cnt: count() })
    .from(patientDocuments)
    .innerJoin(patients, eq(patientDocuments.patientId, patients.id))
    .where(receivedWhere);

  const rows = await db
    .select({
      id: patientDocuments.id,
      patientId: patientDocuments.patientId,
      patientName: patients.name,
      fileName: patientDocuments.fileName,
      fileUrl: patientDocuments.fileUrl,
      mimeType: patientDocuments.mimeType,
      category: patientDocuments.category,
      title: patientDocuments.title,
      note: patientDocuments.note,
      labOrderId: patientDocuments.labOrderId,
      uploadedByLabId: patientDocuments.uploadedByLabId,
      sharedFromLabName: labs.name,
      createdAt: patientDocuments.createdAt,
    })
    .from(patientDocuments)
    .innerJoin(patients, eq(patientDocuments.patientId, patients.id))
    .leftJoin(labs, eq(patientDocuments.uploadedByLabId, labs.id))
    .where(receivedWhere)
    .orderBy(desc(patientDocuments.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({ rows, total: Number(totalRow?.cnt ?? 0), page, pageSize });
}
