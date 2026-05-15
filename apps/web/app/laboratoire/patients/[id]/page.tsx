import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, patients, labOrders, patientDocuments, labPatientNotes, labUsers, doctors, labs } from "@doktori/db";
import { and, eq, desc, or, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { PatientDetailTabs } from "./patient-tabs";

export default async function LabPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || (role !== "lab" && role !== "lab_user")) {
    redirect("/laboratoire-login");
  }
  const labId =
    role === "lab_user"
      ? (session.user as { labId?: string }).labId!
      : session.user.id;
  const labUserId = role === "lab_user" ? session.user.id : null;
  const labUserRole =
    role === "lab_user"
      ? ((session.user as { labUserRole?: string }).labUserRole ?? "technician")
      : "admin";

  const { id: patientId } = await params;

  // Access guard
  const [accessOrder] = await db
    .select({ one: sql<number>`1` })
    .from(labOrders)
    .where(
      and(
        eq(labOrders.patientId, patientId),
        or(eq(labOrders.labId, labId), eq(labOrders.completedByLabId, labId))
      )
    )
    .limit(1);

  let hasAccess = !!accessOrder;
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
  if (!hasAccess) notFound();

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

  if (!pat) notFound();

  let ageYears: number | null = null;
  if (pat.dateOfBirth) {
    const dob = new Date(pat.dateOfBirth);
    const now = new Date();
    ageYears = now.getFullYear() - dob.getFullYear();
    if (
      now.getMonth() < dob.getMonth() ||
      (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
    )
      ageYears--;
  }

  // Orders
  const orderRows = await db
    .select({
      id: labOrders.id,
      status: labOrders.status,
      createdAt: labOrders.createdAt,
      internalRef: labOrders.internalRef,
      tests: labOrders.tests,
      urgency: labOrders.urgency,
      resultUploadedAt: labOrders.resultUploadedAt,
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
    const iso = o.createdAt?.toISOString() ?? null;
    if (iso && (!lastVisitAt || iso > lastVisitAt)) lastVisitAt = iso;
  }

  // Results (uploaded by us)
  const resultRows = await db
    .select({
      id: patientDocuments.id,
      fileUrl: patientDocuments.fileUrl,
      fileName: patientDocuments.fileName,
      mimeType: patientDocuments.mimeType,
      title: patientDocuments.title,
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

  // Received docs
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

  // Notes
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
      and(eq(labPatientNotes.labId, labId), eq(labPatientNotes.patientId, patientId))
    )
    .orderBy(desc(labPatientNotes.pinned), labPatientNotes.createdAt);

  // Pending/in-progress orders for ad-hoc result linking
  const pendingOrders = orderRows.filter(
    (o) => o.status === "pending" || o.status === "collected"
  );

  const patient = {
    id: pat.id,
    name: pat.name,
    ageYears,
    gender: pat.gender,
    bloodType: pat.bloodType,
    cin: pat.cin,
    phone: pat.phone,
    email: pat.email,
  };
  const stats = { totalOrders: orderRows.length, byStatus, lastVisitAt };

  const serialisedOrders = orderRows.map((o) => ({
    ...o,
    createdAt: o.createdAt?.toISOString() ?? null,
    resultUploadedAt: o.resultUploadedAt?.toISOString() ?? null,
    tests: o.tests as Array<{ code?: string; label?: string }>,
  }));

  const serialisedResults = resultRows.map((r) => ({
    ...r,
    createdAt: r.createdAt?.toISOString() ?? null,
  }));

  const serialisedReceived = receivedRows.map((r) => ({
    ...r,
    createdAt: r.createdAt?.toISOString() ?? null,
  }));

  const serialisedNotes = noteRows.map((n) => ({
    id: n.id,
    body: n.body,
    pinned: n.pinned,
    author: n.authorFirstName && n.authorLastName ? `${n.authorFirstName} ${n.authorLastName}` : null,
    authorLabUserId: n.authorLabUserId,
    createdAt: n.createdAt?.toISOString() ?? null,
    updatedAt: n.updatedAt?.toISOString() ?? null,
  }));

  const serialisedPending = pendingOrders.map((o) => ({
    id: o.id,
    internalRef: o.internalRef,
    tests: o.tests as Array<{ code?: string; label?: string }>,
    status: o.status,
  }));

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-6 flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-black text-white"
          style={{ background: "#16A34A" }}
        >
          {patient.name
            .split(" ")
            .slice(0, 2)
            .map((s: string) => s[0])
            .join("")
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-foreground">{patient.name}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
            {patient.ageYears != null && <span>{patient.ageYears} ans</span>}
            {patient.gender && <span className="capitalize">{patient.gender}</span>}
            {patient.bloodType && (
              <span className="font-medium text-foreground">{patient.bloodType}</span>
            )}
            {patient.cin && <span>CIN: {patient.cin}</span>}
            {patient.phone && <span dir="ltr">{patient.phone}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm">
          <div className="text-2xl font-black text-foreground tabular-nums">
            {stats.totalOrders}
          </div>
          <div className="text-xs text-muted-foreground">commandes</div>
        </div>
      </div>

      <PatientDetailTabs
        patientId={patientId}
        patient={patient}
        stats={stats}
        orders={serialisedOrders}
        results={serialisedResults}
        received={serialisedReceived}
        notes={serialisedNotes}
        pendingOrders={serialisedPending}
        labUserId={labUserId}
        labUserRole={labUserRole}
      />
    </div>
  );
}
