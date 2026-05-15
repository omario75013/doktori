import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, labOrders, patientDocuments } from "@doktori/db";
import { eq, and, count, gte, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { LayoutDashboard, ClipboardList, CheckCircle2, FileText, Users } from "lucide-react";

export default async function LaboratoireDashboardPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || (role !== "lab" && role !== "lab_user")) {
    redirect("/laboratoire-login");
  }
  const labId = role === "lab_user"
    ? (session.user as { labId?: string }).labId!
    : session.user.id;
  const t = await getTranslations("laboratoire.dashboard");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pendingRows, completedTodayRows, resultsMonthRows, distinctPatientsRows] = await Promise.all([
    // Pending orders assigned to this lab
    db
      .select({ count: count() })
      .from(labOrders)
      .where(and(eq(labOrders.labId, labId), eq(labOrders.status, "pending"))),

    // Orders completed today by this lab
    db
      .select({ count: count() })
      .from(labOrders)
      .where(
        and(
          eq(labOrders.completedByLabId, labId),
          eq(labOrders.status, "completed"),
          gte(labOrders.completedAt, startOfToday)
        )
      ),

    // Results (patient_documents) uploaded by this lab this month
    db
      .select({ count: count() })
      .from(patientDocuments)
      .where(
        and(
          eq(patientDocuments.uploadedByLabId, labId),
          gte(patientDocuments.createdAt, startOfMonth)
        )
      ),

    // Distinct patients this lab has uploaded docs for
    db
      .selectDistinct({ patientId: patientDocuments.patientId })
      .from(patientDocuments)
      .where(eq(patientDocuments.uploadedByLabId, labId)),
  ]);

  const pendingCount = pendingRows[0]?.count ?? 0;
  const completedToday = completedTodayRows[0]?.count ?? 0;
  const resultsThisMonth = resultsMonthRows[0]?.count ?? 0;
  const distinctPatients = distinctPatientsRows.length;

  const kpis = [
    {
      label: t("pendingOrders"),
      value: pendingCount,
      icon: ClipboardList,
      accent: "bg-amber-500",
      iconColor: "#D97706",
    },
    {
      label: t("completedToday"),
      value: completedToday,
      icon: CheckCircle2,
      accent: "bg-green-500",
      iconColor: "#16A34A",
    },
    {
      label: t("resultsThisMonth"),
      value: resultsThisMonth,
      icon: FileText,
      accent: "bg-blue-500",
      iconColor: "#2563EB",
    },
    {
      label: t("distinctPatients"),
      value: distinctPatients,
      icon: Users,
      accent: "bg-purple-500",
      iconColor: "#7C3AED",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6" style={{ color: "#16A34A" }} strokeWidth={2.5} />
          {t("title")}
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, accent, iconColor }) => (
          <div
            key={label}
            className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border shadow-sm overflow-hidden"
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accent}`} />
            <div className="flex items-start justify-between gap-3 pl-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="text-3xl font-black mt-1.5 text-foreground tabular-nums">{value}</div>
              </div>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${iconColor}15` }}
              >
                <Icon className="h-5 w-5" style={{ color: iconColor }} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
