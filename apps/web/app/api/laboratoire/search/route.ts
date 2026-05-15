import { NextRequest, NextResponse } from "next/server";
import { db, patients, labOrders, patientDocuments } from "@doktori/db";
import { eq, or, ilike, sql } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

// GET /api/laboratoire/search?q=...
// Returns up to 10 patients, orders, and documents scoped to this lab.
export async function GET(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitParam = parseInt(req.nextUrl.searchParams.get("limit") ?? "10");
  const limit = isNaN(limitParam) ? 10 : Math.min(limitParam, 50);

  if (!q) {
    return NextResponse.json({ patients: [], orders: [], documents: [] });
  }

  const pct = `%${q}%`;

  // Patients: only those who have at least one lab_order for this lab OR
  // a patient_document uploaded by this lab.
  const patientRows = await db.execute(sql`
    SELECT DISTINCT p.id, p.name, p.phone, p.cin, p.email
    FROM patients p
    WHERE (
      p.name ILIKE ${pct}
      OR p.phone ILIKE ${pct}
      OR p.cin ILIKE ${pct}
      OR p.email ILIKE ${pct}
    )
    AND (
      EXISTS (
        SELECT 1 FROM lab_orders lo
        WHERE lo.patient_id = p.id
          AND (lo.lab_id = ${labId} OR lo.completed_by_lab_id = ${labId})
      )
      OR EXISTS (
        SELECT 1 FROM patient_documents pd
        WHERE pd.patient_id = p.id
          AND pd.uploaded_by_lab_id = ${labId}
      )
    )
    LIMIT ${limit}
  `);

  // Orders: by internal_ref, access_token, or patient name
  const orderRows = await db.execute(sql`
    SELECT lo.id, lo.status, lo.urgency, lo.created_at, lo.internal_ref, lo.access_token,
           p.name AS patient_name
    FROM lab_orders lo
    JOIN patients p ON p.id = lo.patient_id
    WHERE (lo.lab_id = ${labId} OR lo.completed_by_lab_id = ${labId})
      AND (
        lo.internal_ref ILIKE ${pct}
        OR lo.access_token ILIKE ${pct}
        OR p.name ILIKE ${pct}
      )
    ORDER BY lo.created_at DESC
    LIMIT ${limit}
  `);

  // Documents
  const docRows = await db.execute(sql`
    SELECT pd.id, pd.title, pd.file_name, pd.category, pd.created_at, p.name AS patient_name
    FROM patient_documents pd
    JOIN patients p ON p.id = pd.patient_id
    WHERE (
      pd.uploaded_by_lab_id = ${labId}
      OR ${labId} = ANY(pd.shared_with_lab_ids)
    )
    AND (
      pd.title ILIKE ${pct}
      OR pd.file_name ILIKE ${pct}
    )
    ORDER BY pd.created_at DESC
    LIMIT ${limit}
  `);

  return NextResponse.json({
    patients: patientRows,
    orders: orderRows,
    documents: docRows,
  });
}
