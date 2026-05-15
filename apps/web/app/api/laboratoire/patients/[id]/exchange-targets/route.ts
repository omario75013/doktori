import { NextRequest, NextResponse } from "next/server";
import { db, labs, patientDocuments, labOrders } from "@doktori/db";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

/**
 * GET /api/laboratoire/patients/[id]/exchange-targets
 *
 * Returns all verified labs (excluding the current lab) that the current lab
 * may share documents with. The patient must have at least one document
 * uploaded by the current lab OR a lab_order linked to the current lab —
 * otherwise 403.
 *
 * Response: { labs: Array<{ id, name, city, kind }> }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const { id: patientId } = await params;

  // Guard: patient must have a doc or order linked to this lab.
  const [hasDoc] = await db
    .select({ id: patientDocuments.id })
    .from(patientDocuments)
    .where(
      and(
        eq(patientDocuments.patientId, patientId),
        eq(patientDocuments.uploadedByLabId, labId)
      )
    )
    .limit(1);

  let hasOrder = false;
  if (!hasDoc) {
    const [orderRow] = await db
      .select({ id: labOrders.id })
      .from(labOrders)
      .where(
        and(
          eq(labOrders.patientId, patientId),
          or(
            eq(labOrders.labId, labId),
            eq(labOrders.completedByLabId, labId)
          )
        )
      )
      .limit(1);
    hasOrder = !!orderRow;
  }

  if (!hasDoc && !hasOrder) {
    return NextResponse.json(
      { error: "Patient non associé à ce laboratoire" },
      { status: 403 }
    );
  }

  // Fetch all verified labs that are not the current lab.
  const targets = await db
    .select({
      id: labs.id,
      name: labs.name,
      city: labs.city,
      kind: labs.kind,
    })
    .from(labs)
    .where(
      and(
        ne(labs.id, labId),
        eq(labs.verificationStatus, "verified")
      )
    )
    .orderBy(labs.kind, labs.name);

  // Group by kind.
  const grouped: Record<string, typeof targets> = {};
  for (const lab of targets) {
    const k = lab.kind ?? "lab";
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(lab);
  }

  return NextResponse.json({ labs: targets, grouped });
}
