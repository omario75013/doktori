import { NextRequest, NextResponse } from "next/server";
import { db, patientDocuments, patients, labs } from "@doktori/db";
import { desc, eq, sql } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

/**
 * GET /api/laboratoire/documents/received
 *
 * Returns patient_documents rows where the current lab appears in
 * shared_with_lab_ids. Each row carries a `sharedFromLabName` field
 * indicating the source lab.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

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
      createdAt: patientDocuments.createdAt,
      uploadedByLabId: patientDocuments.uploadedByLabId,
      sharedFromLabName: labs.name,
    })
    .from(patientDocuments)
    .innerJoin(patients, eq(patientDocuments.patientId, patients.id))
    .leftJoin(labs, eq(patientDocuments.uploadedByLabId, labs.id))
    .where(
      sql`${patientDocuments.sharedWithLabIds} @> ARRAY[${labId}::uuid]`
    )
    .orderBy(desc(patientDocuments.createdAt));

  return NextResponse.json({ documents: rows });
}
