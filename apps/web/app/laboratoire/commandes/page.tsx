import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, labOrders, patients, doctors } from "@doktori/db";
import { eq, or, and } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ClipboardList, AlertCircle, Clock } from "lucide-react";

type StatusFilter = "all" | "pending" | "collected" | "completed" | "cancelled";
type UrgencyFilter = "all" | "urgent" | "routine";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  collected: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default async function LaboratoireCommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; urgency?: string }>;
}) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "lab") {
    redirect("/laboratoire-login");
  }
  const labId = session.user.id;
  const t = await getTranslations("laboratoire.orders");

  const params = await searchParams;
  const statusFilter = (params.status ?? "all") as StatusFilter;
  const urgencyFilter = (params.urgency ?? "all") as UrgencyFilter;

  const rows = await db
    .select({
      id: labOrders.id,
      status: labOrders.status,
      urgency: labOrders.urgency,
      createdAt: labOrders.createdAt,
      patientName: patients.name,
      doctorName: doctors.name,
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .innerJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .where(or(eq(labOrders.labId, labId), eq(labOrders.completedByLabId, labId)));

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (urgencyFilter !== "all" && r.urgency !== urgencyFilter) return false;
    return true;
  });

  const statusKeys: StatusFilter[] = ["all", "pending", "collected", "completed", "cancelled"];
  const urgencyKeys: UrgencyFilter[] = ["all", "urgent", "routine"];

  function statusLabel(key: string) {
    switch (key) {
      case "all": return "Tout";
      case "pending": return t("statusPending");
      case "collected": return t("statusCollected");
      case "completed": return t("statusCompleted");
      case "cancelled": return t("statusCancelled");
      default: return key;
    }
  }

  function urgencyLabel(key: string) {
    switch (key) {
      case "all": return "Tout";
      case "urgent": return t("urgent");
      case "routine": return t("routine");
      default: return key;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6" style={{ color: "#16A34A" }} strokeWidth={2.5} />
          {t("title")}
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-white rounded-xl border border-border p-1">
          {statusKeys.map((key) => (
            <Link
              key={key}
              href={`/laboratoire/commandes?status=${key}&urgency=${urgencyFilter}`}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                statusFilter === key
                  ? "bg-green-600 text-white"
                  : "text-muted-foreground hover:bg-gray-100",
              ].join(" ")}
            >
              {statusLabel(key)}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 bg-white rounded-xl border border-border p-1">
          {urgencyKeys.map((key) => (
            <Link
              key={key}
              href={`/laboratoire/commandes?status=${statusFilter}&urgency=${key}`}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                urgencyFilter === key
                  ? "bg-green-600 text-white"
                  : "text-muted-foreground hover:bg-gray-100",
              ].join(" ")}
            >
              {urgencyLabel(key)}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="font-medium text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((order) => (
              <Link
                key={order.id}
                href={`/laboratoire/commandes/${order.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{order.patientName}</span>
                    {order.urgency === "urgent" && (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                        {t("urgent")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    Dr {order.doctorName} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("fr-TN")}
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {statusLabel(order.status)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
