import { NextRequest, NextResponse } from "next/server";
import {
  db,
  cnamClaims,
  clinicDoctors,
  doctors,
  patients,
} from "@doktori/db";
import {
  eq,
  and,
  gte,
  lte,
  inArray,
  sql,
} from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { toCsv, toXlsx, parseExportFormat } from "@/lib/exports";

export const dynamic = "force-dynamic";

function millimesToDt(millimes: number): string {
  return (millimes / 1000).toFixed(3);
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const doctorId = searchParams.get("doctorId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const format = parseExportFormat(req);

  // Resolve clinic doctor IDs
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (allDoctorIds.length === 0) {
    const empty = {
      stats: {
        submittedThisMonth: 0,
        reimbursedThisMonth: 0,
        rejectedTotal: 0,
        pendingAmountMillimes: 0,
      },
      claims: [],
    };
    return NextResponse.json(empty);
  }

  // Restrict to the requested doctorId if it belongs to this clinic
  const doctorFilter =
    doctorId && allDoctorIds.includes(doctorId)
      ? [doctorId]
      : allDoctorIds;

  // Build where conditions
  const conditions = [inArray(cnamClaims.doctorId, doctorFilter)];
  if (status) {
    conditions.push(eq(cnamClaims.status, status));
  }
  if (from) {
    conditions.push(gte(cnamClaims.consultationDate, from));
  }
  if (to) {
    conditions.push(lte(cnamClaims.consultationDate, to));
  }

  // Fetch claims
  const rows = await db
    .select({
      id: cnamClaims.id,
      doctorId: cnamClaims.doctorId,
      patientId: cnamClaims.patientId,
      cnamNumber: cnamClaims.cnamNumber,
      amount: cnamClaims.amount,
      consultationDate: cnamClaims.consultationDate,
      status: cnamClaims.status,
      submittedAt: cnamClaims.submittedAt,
      reimbursedAt: cnamClaims.reimbursedAt,
      notes: cnamClaims.notes,
      createdAt: cnamClaims.createdAt,
      doctorName: doctors.name,
      patientName: patients.name,
    })
    .from(cnamClaims)
    .innerJoin(doctors, eq(cnamClaims.doctorId, doctors.id))
    .innerJoin(patients, eq(cnamClaims.patientId, patients.id))
    .where(and(...conditions))
    .orderBy(sql`${cnamClaims.consultationDate} DESC`);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

  // Header stats (always over all clinic doctors, current month)
  const allRows = await db
    .select({
      status: cnamClaims.status,
      amount: cnamClaims.amount,
      consultationDate: cnamClaims.consultationDate,
    })
    .from(cnamClaims)
    .where(inArray(cnamClaims.doctorId, allDoctorIds));

  let submittedThisMonth = 0;
  let reimbursedThisMonth = 0;
  let rejectedTotal = 0;
  let pendingAmountMillimes = 0;

  for (const r of allRows) {
    if (r.consultationDate >= monthStart && r.consultationDate < monthEnd) {
      if (r.status === "submitted") submittedThisMonth++;
      if (r.status === "reimbursed") reimbursedThisMonth++;
    }
    if (r.status === "rejected") rejectedTotal++;
    if (r.status === "submitted") pendingAmountMillimes += r.amount;
  }

  const claims = rows.map((r) => {
    const submittedDate = r.submittedAt ?? new Date(r.consultationDate);
    const daysOutstanding =
      r.status === "submitted"
        ? daysBetween(submittedDate, now)
        : null;
    const nameParts = (r.patientName ?? "").trim().split(/\s+/);
    const patientInitials = nameParts
      .slice(0, 2)
      .map((p) => p[0] ?? "")
      .join("")
      .toUpperCase();

    return {
      id: r.id,
      consultationDate: r.consultationDate,
      patientInitials,
      patientId: r.patientId,
      doctorId: r.doctorId,
      doctorName: r.doctorName,
      amountMillimes: r.amount,
      amountDt: millimesToDt(r.amount),
      status: r.status,
      daysOutstanding,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      reimbursedAt: r.reimbursedAt?.toISOString() ?? null,
      notes: r.notes,
    };
  });

  if (format === "csv" || format === "xlsx") {
    type ExportRow = {
      consultationDate: string;
      patientInitials: string;
      doctorName: string;
      amountDt: string;
      status: string;
      daysOutstanding: string;
      reimbursedAt: string;
    };

    const exportRows: ExportRow[] = claims.map((c) => ({
      consultationDate: c.consultationDate,
      patientInitials: c.patientInitials,
      doctorName: c.doctorName,
      amountDt: c.amountDt,
      status: c.status,
      daysOutstanding: c.daysOutstanding != null ? String(c.daysOutstanding) : "",
      reimbursedAt: c.reimbursedAt ? c.reimbursedAt.slice(0, 10) : "",
    }));

    const columns = [
      { key: "consultationDate" as const, header: "Date" },
      { key: "patientInitials" as const, header: "Patient" },
      { key: "doctorName" as const, header: "Médecin" },
      { key: "amountDt" as const, header: "Montant (DT)" },
      { key: "status" as const, header: "Statut" },
      { key: "daysOutstanding" as const, header: "Jours" },
      { key: "reimbursedAt" as const, header: "Payé le" },
    ];

    const filename = "cnam-claims";
    if (format === "csv") return toCsv(exportRows, columns, filename);
    return toXlsx(exportRows, columns, filename, "CNAM");
  }

  return NextResponse.json({
    stats: {
      submittedThisMonth,
      reimbursedThisMonth,
      rejectedTotal,
      pendingAmountMillimes,
    },
    claims,
  });
}
