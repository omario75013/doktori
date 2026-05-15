import { NextRequest, NextResponse } from "next/server";
import {
  db,
  appointments,
  doctors,
  patients,
  clinicDoctors,
  appointmentTypes,
  walletTransactions,
  cnamClaims,
  refunds,
} from "@doktori/db";
import {
  eq,
  and,
  gte,
  lte,
  inArray,
  sum,
  count,
  sql,
} from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { toCsv, toXlsx, parseExportFormat } from "@/lib/exports";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
}

function fmt(millimes: number): number {
  return Math.round(millimes) / 1000; // DT
}

// ---------------------------------------------------------------------------
// GET /api/clinique/finance
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const sp = req.nextUrl.searchParams;
  const from = parseDateParam(sp.get("from"), firstDayOfMonth());
  const to = parseDateParam(sp.get("to"), new Date());
  const doctorIdFilter = sp.get("doctorId") ?? null;

  // End-of-day for `to`
  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);

  // ── Clinic doctors ──────────────────────────────────────────────────────
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  let allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (allDoctorIds.length === 0) {
    return NextResponse.json(emptyResponse());
  }

  if (doctorIdFilter && allDoctorIds.includes(doctorIdFilter)) {
    allDoctorIds = [doctorIdFilter];
  }

  // ── Doctor names ─────────────────────────────────────────────────────────
  const doctorRows = await db
    .select({ id: doctors.id, name: doctors.name })
    .from(doctors)
    .where(inArray(doctors.id, allDoctorIds));

  const doctorMap = new Map(doctorRows.map((d) => [d.id, d.name]));

  // ── Appointment type names ───────────────────────────────────────────────
  const typeRows = await db
    .select({ id: appointmentTypes.id, name: appointmentTypes.name, fee: appointmentTypes.fee })
    .from(appointmentTypes)
    .where(inArray(appointmentTypes.doctorId, allDoctorIds));

  const typeMap = new Map(typeRows.map((t) => [t.id, { name: t.name, fee: t.fee }]));

  // ── Current period appointments ──────────────────────────────────────────
  const periodCond = and(
    inArray(appointments.doctorId, allDoctorIds),
    gte(appointments.startsAt, from),
    lte(appointments.startsAt, toEnd),
  );

  const apptRows = await db
    .select({
      id: appointments.id,
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      startsAt: appointments.startsAt,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
      paymentAmount: appointments.paymentAmount,
      paymentMethod: appointments.paymentMethod,
      appointmentTypeId: appointments.appointmentTypeId,
      patientName: patients.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(periodCond);

  // Effective amount: paymentAmount if set, else appointmentType.fee, else 0
  function effectiveAmount(row: typeof apptRows[0]): number {
    if (row.paymentAmount !== null && row.paymentAmount !== undefined) {
      return row.paymentAmount;
    }
    if (row.appointmentTypeId) {
      const t = typeMap.get(row.appointmentTypeId);
      if (t?.fee) return t.fee;
    }
    return 0;
  }

  // ── Previous period (same length) ────────────────────────────────────────
  const periodMs = toEnd.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime() - 1);

  const prevCond = and(
    inArray(appointments.doctorId, allDoctorIds),
    gte(appointments.startsAt, prevFrom),
    lte(appointments.startsAt, prevTo),
    eq(appointments.paymentStatus, "paid"),
  );

  const [prevPaidRow] = await db
    .select({ total: sum(appointments.paymentAmount) })
    .from(appointments)
    .where(prevCond);

  const prevPaidTotal = Number(prevPaidRow?.total ?? 0);

  // ── Wallet transactions (credits) in period ──────────────────────────────
  const walletRows = await db
    .select({ amount: walletTransactions.amount })
    .from(walletTransactions)
    .where(
      and(
        inArray(walletTransactions.doctorId, allDoctorIds),
        gte(walletTransactions.createdAt, from),
        lte(walletTransactions.createdAt, toEnd),
        sql`${walletTransactions.amount} > 0`,
      ),
    );

  const walletTotal = walletRows.reduce((s, r) => s + r.amount, 0);

  // ── CNAM claims in period ────────────────────────────────────────────────
  const cnamRows = await db
    .select({ status: cnamClaims.status, amount: cnamClaims.amount })
    .from(cnamClaims)
    .where(
      and(
        inArray(cnamClaims.doctorId, allDoctorIds),
        gte(cnamClaims.createdAt, from),
        lte(cnamClaims.createdAt, toEnd),
      ),
    );

  const cnamPending = cnamRows
    .filter((r) => r.status === "submitted" || r.status === "draft")
    .reduce((s, r) => s + r.amount, 0);
  const cnamApproved = cnamRows
    .filter((r) => r.status === "reimbursed")
    .reduce((s, r) => s + r.amount, 0);

  // ── Refunds in period ────────────────────────────────────────────────────
  const refundRows = await db
    .select({ amount: refunds.amount })
    .from(refunds)
    .where(
      and(
        inArray(refunds.doctorId, allDoctorIds),
        gte(refunds.createdAt, from),
        lte(refunds.createdAt, toEnd),
        eq(refunds.status, "succeeded"),
      ),
    );

  const refundsTotal = refundRows.reduce((s, r) => s + r.amount, 0);

  // ── Aggregate by status ──────────────────────────────────────────────────
  let paidTotal = 0;
  let pendingTotal = 0;

  for (const row of apptRows) {
    const amt = effectiveAmount(row);
    if (row.paymentStatus === "paid") paidTotal += amt;
    else if (row.paymentStatus === "pending" || row.paymentStatus === "unpaid") pendingTotal += amt;
  }

  const totalRevenue = paidTotal + cnamApproved - refundsTotal;
  const vsPrevious =
    prevPaidTotal > 0 ? Math.round(((paidTotal - prevPaidTotal) / prevPaidTotal) * 100) : null;

  // ── By doctor ────────────────────────────────────────────────────────────
  const byDoctorMap = new Map<string, { revenue: number; count: number }>();
  for (const row of apptRows) {
    const entry = byDoctorMap.get(row.doctorId) ?? { revenue: 0, count: 0 };
    if (row.paymentStatus === "paid") entry.revenue += effectiveAmount(row);
    entry.count++;
    byDoctorMap.set(row.doctorId, entry);
  }
  const byDoctor = allDoctorIds.map((id) => ({
    doctorId: id,
    doctorName: doctorMap.get(id) ?? "—",
    revenue: byDoctorMap.get(id)?.revenue ?? 0,
    count: byDoctorMap.get(id)?.count ?? 0,
  }));

  // ── By payment method ────────────────────────────────────────────────────
  const byMethodMap = new Map<string, number>();
  for (const row of apptRows) {
    if (row.paymentStatus !== "paid") continue;
    const method = row.paymentMethod ?? "cash";
    byMethodMap.set(method, (byMethodMap.get(method) ?? 0) + effectiveAmount(row));
  }
  const byMethod = [...byMethodMap.entries()].map(([method, total]) => ({ method, total }));

  // ── By type ──────────────────────────────────────────────────────────────
  const byTypeMap = new Map<string, { typeName: string; total: number; count: number }>();
  for (const row of apptRows) {
    const tid = row.appointmentTypeId ?? "none";
    const typeName = (row.appointmentTypeId && typeMap.get(row.appointmentTypeId)?.name) ?? "Autre";
    const entry = byTypeMap.get(tid) ?? { typeName, total: 0, count: 0 };
    entry.count++;
    if (row.paymentStatus === "paid") entry.total += effectiveAmount(row);
    byTypeMap.set(tid, entry);
  }
  const byType = [...byTypeMap.entries()].map(([typeId, v]) => ({ typeId, ...v }));

  // ── Monthly trend (last 12 months) ──────────────────────────────────────
  const trendRows = await db
    .select({
      month: sql<string>`to_char(${appointments.startsAt}, 'YYYY-MM')`,
      revenue: sql<number>`COALESCE(SUM(${appointments.paymentAmount}), 0)`,
    })
    .from(appointments)
    .where(
      and(
        inArray(appointments.doctorId, allDoctorIds),
        gte(appointments.startsAt, new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1)),
        eq(appointments.paymentStatus, "paid"),
      ),
    )
    .groupBy(sql`to_char(${appointments.startsAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${appointments.startsAt}, 'YYYY-MM')`);

  const monthlyTrend = trendRows.map((r) => ({ month: r.month, revenue: Number(r.revenue) }));

  // ── Row-level data for export ─────────────────────────────────────────────
  const rows = apptRows.map((row) => ({
    date: row.startsAt.toISOString().slice(0, 10),
    patient: (() => {
      const parts = (row.patientName ?? "").split(" ");
      const initials = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join(". ");
      return initials || "—";
    })(),
    doctor: doctorMap.get(row.doctorId) ?? "—",
    type: (row.appointmentTypeId && typeMap.get(row.appointmentTypeId)?.name) ?? "Autre",
    status: row.status,
    paymentStatus: row.paymentStatus,
    method: row.paymentMethod ?? "—",
    amount: fmt(effectiveAmount(row)),
  }));

  // ── Export ────────────────────────────────────────────────────────────────
  const format = parseExportFormat(req);
  const exportColumns = [
    { key: "date" as const, header: "Date" },
    { key: "patient" as const, header: "Patient" },
    { key: "doctor" as const, header: "Médecin" },
    { key: "type" as const, header: "Type" },
    { key: "status" as const, header: "Statut RDV" },
    { key: "paymentStatus" as const, header: "Statut paiement" },
    { key: "method" as const, header: "Mode paiement" },
    { key: "amount" as const, header: "Montant (DT)" },
  ];

  if (format === "csv") return toCsv(rows, exportColumns, "finance");
  if (format === "xlsx") return await toXlsx(rows, exportColumns, "finance", "Finance");

  return NextResponse.json({
    summary: {
      totalRevenue: fmt(totalRevenue),
      paid: fmt(paidTotal),
      pending: fmt(pendingTotal),
      cnamPending: fmt(cnamPending),
      cnamApproved: fmt(cnamApproved),
      refunds: fmt(refundsTotal),
      walletCredits: fmt(walletTotal),
      vsPrevious,
    },
    byDoctor: byDoctor.map((d) => ({ ...d, revenue: fmt(d.revenue) })),
    byMethod: byMethod.map((m) => ({ ...m, total: fmt(m.total) })),
    byType: byType.map((t) => ({ ...t, total: fmt(t.total) })),
    monthlyTrend: monthlyTrend.map((m) => ({ ...m, revenue: fmt(m.revenue) })),
    rows,
  });
}

function emptyResponse() {
  return {
    summary: {
      totalRevenue: 0,
      paid: 0,
      pending: 0,
      cnamPending: 0,
      cnamApproved: 0,
      refunds: 0,
      walletCredits: 0,
      vsPrevious: null,
    },
    byDoctor: [],
    byMethod: [],
    byType: [],
    monthlyTrend: [],
    rows: [],
  };
}
