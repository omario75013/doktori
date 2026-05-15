import { NextRequest, NextResponse } from "next/server";
import {
  db,
  patients,
  labOrders,
  patientDocuments,
  labPatientNotes,
  labUsers,
  doctors,
} from "@doktori/db";
import { and, eq, desc, count, sql, or } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";
import { auth } from "@/lib/auth";

// GET /api/laboratoire/patients/[patientId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;
  const { id: patientId } = await params;

  // Access check: lab must have ≥1 order OR ≥1 uploaded doc for this patient
  const [accessRow] = await db
    .select({ one: sql<number>`1` })
    .from(labOrders)
    .where(
      and(
        eq(labOrders.patientId, patientId),
        or(eq(labOrders.labId, labId), eq(labOrders.completedByLabId, labId))
      )
    )
    .limit(1);

  let hasAccess = !!accessRow;
  if (!hasAccess) {
    const [docRow] = await db
      .select({ one: sql<number>`1` })
      .from(patientDocuments)
      .where(
        and(
          eq(patientDocuments.patientId, patientId),
          eq(patientDocuments.uploadedByLabId, labId)
        )
      )
      .limit(1);
    hasAccess = !!docRow;
  }
  if (!hasAccess) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  // Patient info
  const [pat] = await db
    .select({
      id: patients.id,
      name: patients.name,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      bloodType: patients.bloodType,
      cin: patients.cin,
      phone: patients.phone,
      email: patients.email,
    })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!pat) return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });

  // Age
  let ageYears: number | null = null;
  if (pat.dateOfBirth) {
    const dob = new Date(pat.dateOfBirth);
    const now = new Date();
    ageYears = now.getFullYear() - dob.getFullYear();
    if (
      now.getMonth() < dob.getMonth() ||
      (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
    ) {
      ageYears--;
    }
  }

  // Stats: orders for this lab
  const orderRows = await db
    .select({
      id: labOrders.id,
      status: labOrders.status,
      createdAt: labOrders.createdAt,
      updatedAt: labOrders.updatedAt,
      internalRef: labOrders.internalRef,
      tests: labOrders.tests,
      urgency: labOrders.urgency,
      resultUploadedAt: labOrders.resultUploadedAt,
      doctorId: labOrders.doctorId,
      doctorName: doctors.name,
    })
    .from(labOrders)
    .leftJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .where(
      and(
        eq(labOrders.patientId, patientId),
        or(eq(labOrders.labId, labId), eq(labOrders.completedByLabId, labId))
      )
    )
    .orderBy(desc(labOrders.createdAt));

  const byStatus: Record<string, number> = {};
  let lastVisitAt: string | null = null;
  for (const o of orderRows) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (!lastVisitAt || (o.createdAt && o.createdAt.toISOString() > lastVisitAt)) {
      lastVisitAt = o.createdAt?.toISOString() ?? null;
    }
  }

  // Results (docs uploaded by us for this patient)
  const resultRows = await db
    .select({
      id: patientDocuments.id,
      fileUrl: patientDocuments.fileUrl,
      fileName: patientDocuments.fileName,
      mimeType: patientDocuments.mimeType,
      title: patientDocuments.title,
      note: patientDocuments.note,
      category: patientDocuments.category,
      labOrderId: patientDocuments.labOrderId,
      sharedWithDoctorIds: patientDocuments.sharedWithDoctorIds,
      createdAt: patientDocuments.createdAt,
    })
    .from(patientDocuments)
    .where(
      and(
        eq(patientDocuments.patientId, patientId),
        eq(patientDocuments.uploadedByLabId, labId)
      )
    )
    .orderBy(desc(patientDocuments.createdAt));

  // Received docs (shared with us by another lab, NOT uploaded by us)
  const receivedRows = await db
    .select({
      id: patientDocuments.id,
      fileUrl: patientDocuments.fileUrl,
      fileName: patientDocuments.fileName,
      mimeType: patientDocuments.mimeType,
      title: patientDocuments.title,
      category: patientDocuments.category,
      uploadedByLabId: patientDocuments.uploadedByLabId,
      createdAt: patientDocuments.createdAt,
    })
    .from(patientDocuments)
    .where(
      and(
        eq(patientDocuments.patientId, patientId),
        sql`${patientDocuments.sharedWithLabIds} @> ARRAY[${labId}::uuid]`,
        sql`(${patientDocuments.uploadedByLabId} IS NULL OR ${patientDocuments.uploadedByLabId} != ${labId}::uuid)`
      )
    )
    .orderBy(desc(patientDocuments.createdAt));

  // Notes (pinned first, then chronological)
  const noteRows = await db
    .select({
      id: labPatientNotes.id,
      body: labPatientNotes.body,
      pinned: labPatientNotes.pinned,
      authorLabUserId: labPatientNotes.authorLabUserId,
      authorFirstName: labUsers.firstName,
      authorLastName: labUsers.lastName,
      createdAt: labPatientNotes.createdAt,
      updatedAt: labPatientNotes.updatedAt,
    })
    .from(labPatientNotes)
    .leftJoin(labUsers, eq(labPatientNotes.authorLabUserId, labUsers.id))
    .where(
      and(
        eq(labPatientNotes.labId, labId),
        eq(labPatientNotes.patientId, patientId)
      )
    )
    .orderBy(desc(labPatientNotes.pinned), labPatientNotes.createdAt);

  return NextResponse.json({
    patient: {
      id: pat.id,
      name: pat.name,
      ageYears,
      gender: pat.gender,
      bloodType: pat.bloodType,
      cin: pat.cin,
      phone: pat.phone,
      email: pat.email,
    },
    stats: {
      totalOrders: orderRows.length,
      byStatus,
      lastVisitAt,
    },
    orders: orderRows,
    results: resultRows,
    documents: {
      uploaded: resultRows,
      received: receivedRows,
    },
    notes: noteRows.map((n) => ({
      id: n.id,
      body: n.body,
      pinned: n.pinned,
      author: n.authorFirstName && n.authorLastName ? `${n.authorFirstName} ${n.authorLastName}` : null,
      authorLabUserId: n.authorLabUserId,
      createdAt: n.createdAt?.toISOString() ?? null,
      updatedAt: n.updatedAt?.toISOString() ?? null,
    })),
  });
}
