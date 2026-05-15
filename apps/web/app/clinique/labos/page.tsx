import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  db,
  labOrders,
  labs,
  doctors,
  patients,
  clinicDoctors,
} from "@doktori/db";
import { eq, and, inArray, isNotNull, desc, gte, lte, sql } from "drizzle-orm";
import { FlaskConical, ScanLine, Clock, CheckCircle2, CalendarCheck, Award } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LabOrdersFilterBar } from "./filter-bar";
import { TabsBar } from "./tabs-bar";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// ── Types ─────────────────────────────────────────────────────────────────────

type TestItem = { code?: string; label?: string } | string;

type LabOrderRow = {
  id: string;
  doctorId: string;
  patientId: string;
  labId: string | null;
  tests: unknown;
  urgency: string;
  status: string;
  instructions: string | null;
  createdAt: Date;
  completedAt: Date | null;
  patientName: string;
  doctorName: string;
  labName: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function testsCount(tests: unknown): number {
  if (Array.isArray(tests)) return tests.length;
  return 0;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    pending: { label: "En attente", classes: "bg-amber-50 text-amber-700 border border-amber-200" },
    collected: { label: "Prélevé", classes: "bg-blue-50 text-blue-700 border border-blue-200" },
    completed: { label: "Terminé", classes: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    cancelled: { label: "Annulé", classes: "bg-red-50 text-red-700 border border-red-200" },
  };
  const cfg = map[status] ?? { label: status, classes: "bg-gray-50 text-gray-600 border border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  if (urgency === "urgent") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
        Urgent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
      Routine
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  accentColor,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  color: string;
  accentColor: string;
}) {
  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border shadow-sm overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentColor}`} />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-3xl font-black mt-1.5 text-foreground tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground/70 mt-1 truncate">{sub}</div>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${color}18` }}
        >
          <Icon className="h-5 w-5" style={{ color }} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

// ── Orders table ──────────────────────────────────────────────────────────────

function OrdersTable({
  rows,
  emptyLabel,
  showLabColumn,
}: {
  rows: LabOrderRow[];
  emptyLabel: string;
  showLabColumn?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FlaskConical className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
        <p className="font-medium text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-gray-50 dark:bg-gray-800/50">
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Patient
            </th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Médecin
            </th>
            {showLabColumn && (
              <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Labo
              </th>
            )}
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tests
            </th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Urgence
            </th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Statut
            </th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                    style={{ background: "#0891B2" }}
                  >
                    {initials(row.patientName)}
                  </div>
                  <span className="font-medium text-foreground truncate max-w-32">
                    {row.patientName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                {row.doctorName}
              </td>
              {showLabColumn && (
                <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                  {row.labName ?? <span className="text-muted-foreground">—</span>}
                </td>
              )}
              <td className="px-4 py-3">
                <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {testsCount(row.tests)}
                </span>
              </td>
              <td className="px-4 py-3">
                <UrgencyBadge urgency={row.urgency} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                <span title={row.createdAt.toLocaleString("fr-TN")}>
                  {formatDistanceToNow(row.createdAt, { addSuffix: true, locale: fr })}
                </span>
                {row.completedAt && (
                  <div className="text-emerald-600 mt-0.5">
                    ✓{" "}
                    {formatDistanceToNow(row.completedAt, { addSuffix: true, locale: fr })}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page (server component) ─────────────────────────────────────────────

type SearchParams = {
  status?: string;
  doctorId?: string;
  urgency?: string;
  from?: string;
  to?: string;
  tab?: string;
};

export default async function CliniqueLabosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "clinic") {
    redirect("/clinique-login");
  }

  const clinicId = session.user.id!;
  const sp = await searchParams;
  const t = await getTranslations("clinique.labos");

  const tab = sp.tab === "received" ? "received" : "sent";
  const statusParam = sp.status ?? "all";
  const doctorIdParam = sp.doctorId;
  const urgencyParam = sp.urgency;
  const fromParam = sp.from;
  const toParam = sp.to;

  // ── Resolve clinic doctors ─────────────────────────────────────────────────
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinicId));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  // Load doctors for filter bar
  const clinicDoctorList =
    allDoctorIds.length > 0
      ? await db
          .select({ id: doctors.id, name: doctors.name })
          .from(doctors)
          .where(inArray(doctors.id, allDoctorIds))
          .orderBy(doctors.name)
      : [];

  // ── Resolve in-house labs ──────────────────────────────────────────────────
  const inHouseLabs = await db
    .select({ id: labs.id, name: labs.name })
    .from(labs)
    .where(and(isNotNull(labs.clinicId), eq(labs.clinicId, clinicId)));

  const inHouseLabIds = inHouseLabs.map((l) => l.id);

  // ── KPI queries ───────────────────────────────────────────────────────────
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  let kpi = { pending: 0, thisMonth: 0, today: 0, topDoctor: null as { name: string; count: number } | null };

  if (tab === "sent" && allDoctorIds.length > 0) {
    const [kpiPendingRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .where(and(inArray(labOrders.doctorId, allDoctorIds), eq(labOrders.status, "pending")));

    const [kpiMonthRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .where(
        and(
          inArray(labOrders.doctorId, allDoctorIds),
          eq(labOrders.status, "completed"),
          gte(labOrders.completedAt, startOfMonth),
        )
      );

    const [kpiTodayRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .where(
        and(
          inArray(labOrders.doctorId, allDoctorIds),
          eq(labOrders.status, "completed"),
          gte(labOrders.completedAt, startOfToday),
        )
      );

    const topDoctorRows = await db
      .select({
        doctorName: doctors.name,
        count: sql<number>`count(*)::int`,
      })
      .from(labOrders)
      .innerJoin(doctors, eq(labOrders.doctorId, doctors.id))
      .where(inArray(labOrders.doctorId, allDoctorIds))
      .groupBy(doctors.name)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    kpi = {
      pending: kpiPendingRow?.count ?? 0,
      thisMonth: kpiMonthRow?.count ?? 0,
      today: kpiTodayRow?.count ?? 0,
      topDoctor: topDoctorRows[0]
        ? { name: topDoctorRows[0].doctorName, count: topDoctorRows[0].count }
        : null,
    };
  } else if (tab === "received" && inHouseLabIds.length > 0) {
    const [kpiPendingRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .where(and(inArray(labOrders.labId, inHouseLabIds), eq(labOrders.status, "pending")));

    const [kpiMonthRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .where(
        and(
          inArray(labOrders.labId, inHouseLabIds),
          eq(labOrders.status, "completed"),
          gte(labOrders.completedAt, startOfMonth),
        )
      );

    const [kpiTodayRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .where(
        and(
          inArray(labOrders.labId, inHouseLabIds),
          eq(labOrders.status, "completed"),
          gte(labOrders.completedAt, startOfToday),
        )
      );

    kpi = {
      pending: kpiPendingRow?.count ?? 0,
      thisMonth: kpiMonthRow?.count ?? 0,
      today: kpiTodayRow?.count ?? 0,
      topDoctor: null,
    };
  }

  // ── Main query ────────────────────────────────────────────────────────────
  let rows: LabOrderRow[] = [];

  if (tab === "sent" && allDoctorIds.length > 0) {
    const targetIds =
      doctorIdParam && allDoctorIds.includes(doctorIdParam)
        ? [doctorIdParam]
        : allDoctorIds;

    const conditions = [inArray(labOrders.doctorId, targetIds)];
    if (statusParam !== "all") conditions.push(eq(labOrders.status, statusParam));
    if (urgencyParam === "routine" || urgencyParam === "urgent")
      conditions.push(eq(labOrders.urgency, urgencyParam));
    if (fromParam) {
      const d = new Date(fromParam);
      if (!isNaN(d.getTime())) conditions.push(gte(labOrders.createdAt, d));
    }
    if (toParam) {
      const d = new Date(toParam);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        conditions.push(lte(labOrders.createdAt, d));
      }
    }

    rows = await db
      .select({
        id: labOrders.id,
        doctorId: labOrders.doctorId,
        patientId: labOrders.patientId,
        labId: labOrders.labId,
        tests: labOrders.tests,
        urgency: labOrders.urgency,
        status: labOrders.status,
        instructions: labOrders.instructions,
        createdAt: labOrders.createdAt,
        completedAt: labOrders.completedAt,
        patientName: patients.name,
        doctorName: doctors.name,
        labName: labs.name,
      })
      .from(labOrders)
      .innerJoin(patients, eq(labOrders.patientId, patients.id))
      .innerJoin(doctors, eq(labOrders.doctorId, doctors.id))
      .leftJoin(labs, eq(labOrders.labId, labs.id))
      .where(and(...conditions))
      .orderBy(desc(labOrders.createdAt))
      .limit(200);
  } else if (tab === "received" && inHouseLabIds.length > 0) {
    const conditions = [inArray(labOrders.labId, inHouseLabIds)];
    if (statusParam !== "all") conditions.push(eq(labOrders.status, statusParam));
    if (urgencyParam === "routine" || urgencyParam === "urgent")
      conditions.push(eq(labOrders.urgency, urgencyParam));
    if (fromParam) {
      const d = new Date(fromParam);
      if (!isNaN(d.getTime())) conditions.push(gte(labOrders.createdAt, d));
    }
    if (toParam) {
      const d = new Date(toParam);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        conditions.push(lte(labOrders.createdAt, d));
      }
    }

    rows = await db
      .select({
        id: labOrders.id,
        doctorId: labOrders.doctorId,
        patientId: labOrders.patientId,
        labId: labOrders.labId,
        tests: labOrders.tests,
        urgency: labOrders.urgency,
        status: labOrders.status,
        instructions: labOrders.instructions,
        createdAt: labOrders.createdAt,
        completedAt: labOrders.completedAt,
        patientName: patients.name,
        doctorName: doctors.name,
        labName: labs.name,
      })
      .from(labOrders)
      .innerJoin(patients, eq(labOrders.patientId, patients.id))
      .innerJoin(doctors, eq(labOrders.doctorId, doctors.id))
      .leftJoin(labs, eq(labOrders.labId, labs.id))
      .where(and(...conditions))
      .orderBy(desc(labOrders.createdAt))
      .limit(200);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <FlaskConical className="w-5 h-5 text-primary" strokeWidth={2.5} />
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label={t("kpiPending")}
          value={kpi.pending}
          sub=""
          icon={Clock}
          color="#D97706"
          accentColor="bg-amber-500"
        />
        <KpiCard
          label={t("kpiThisMonth")}
          value={kpi.thisMonth}
          sub=""
          icon={CheckCircle2}
          color="#059669"
          accentColor="bg-emerald-500"
        />
        <KpiCard
          label={t("kpiToday")}
          value={kpi.today}
          sub=""
          icon={CalendarCheck}
          color="#0891B2"
          accentColor="bg-cyan-500"
        />
        <KpiCard
          label={t("kpiTopDoctor")}
          value={kpi.topDoctor ? kpi.topDoctor.count : "—"}
          sub={kpi.topDoctor ? kpi.topDoctor.name.split(" ")[0]! : ""}
          icon={Award}
          color="#7C3AED"
          accentColor="bg-purple-500"
        />
      </div>

      {/* Tabs (client component) */}
      <Suspense>
        <TabsBar activeTab={tab} inHouseCount={inHouseLabIds.length} />
      </Suspense>

      {/* Filter bar (client, only for sent tab) */}
      {tab === "sent" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border p-4 shadow-sm">
          <Suspense>
            <LabOrdersFilterBar doctors={clinicDoctorList} />
          </Suspense>
        </div>
      )}

      {/* Results table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden">
        {tab === "received" && inHouseLabIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ScanLine className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="font-medium text-sm">Aucun labo in-house — créez-en un dans Paramètres › Labos & Radiologie</p>
          </div>
        ) : (
          <OrdersTable
            rows={rows}
            emptyLabel={t("empty")}
            showLabColumn={tab === "received"}
          />
        )}
      </div>
    </div>
  );
}
