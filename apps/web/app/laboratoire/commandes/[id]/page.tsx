import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, labOrders, patients, doctors } from "@doktori/db";
import { eq, and, or } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, FlaskConical } from "lucide-react";
import { UploadResultForm } from "./upload-result-form";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  collected: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default async function LaboratoireOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "lab") {
    redirect("/laboratoire-login");
  }
  const labId = session.user.id;
  const t = await getTranslations("laboratoire.orders");

  const { id } = await params;

  const rows = await db
    .select({
      id: labOrders.id,
      status: labOrders.status,
      urgency: labOrders.urgency,
      tests: labOrders.tests,
      instructions: labOrders.instructions,
      createdAt: labOrders.createdAt,
      completedAt: labOrders.completedAt,
      patientName: patients.name,
      patientPhone: patients.phone,
      doctorName: doctors.name,
      doctorPhone: doctors.phone,
      doctorSpecialty: doctors.specialty,
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .innerJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .where(
      and(
        eq(labOrders.id, id),
        or(eq(labOrders.labId, labId), eq(labOrders.completedByLabId, labId))
      )
    );

  const order = rows[0];
  if (!order) notFound();

  const tests = Array.isArray(order.tests)
    ? (order.tests as { code?: string; label?: string }[])
    : [];

  const isCompleted = order.status === "completed";
  const isCancelled = order.status === "cancelled";

  function statusLabel(key: string) {
    switch (key) {
      case "pending": return t("statusPending");
      case "collected": return t("statusCollected");
      case "completed": return t("statusCompleted");
      case "cancelled": return t("statusCancelled");
      default: return key;
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link
        href="/laboratoire/commandes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        Retour aux commandes
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6" style={{ color: "#16A34A" }} strokeWidth={2.5} />
          <h1 className="text-2xl font-black text-foreground">Commande d&apos;analyses</h1>
        </div>
        <div className="flex items-center gap-2">
          {order.urgency === "urgent" && (
            <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
              <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("urgent")}
            </span>
          )}
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
          >
            {statusLabel(order.status)}
          </span>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-white p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-green-800">Patient</p>
          <p className="font-semibold text-foreground">{order.patientName}</p>
          <p className="text-sm text-muted-foreground" dir="ltr">{order.patientPhone}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-green-800">Médecin prescripteur</p>
          <p className="font-semibold text-foreground">{order.doctorName}</p>
          <p className="text-sm text-muted-foreground">{order.doctorSpecialty}</p>
          <p className="text-sm text-muted-foreground" dir="ltr">{order.doctorPhone}</p>
        </div>
      </div>

      {/* Tests */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-3">Analyses demandées</p>
        {tests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune analyse spécifiée.</p>
        ) : (
          <ul className="space-y-1.5">
            {tests.map((test, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                {test.label ?? test.code ?? `Analyse ${i + 1}`}
                {test.code && test.label && (
                  <span className="text-xs text-muted-foreground">({test.code})</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Instructions */}
      {order.instructions && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-2">Instructions</p>
          <p className="text-sm text-foreground whitespace-pre-line">{order.instructions}</p>
        </div>
      )}

      {/* Dates */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Créé le {new Date(order.createdAt).toLocaleDateString("fr-TN")}
        </span>
        {order.completedAt && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Complété le {new Date(order.completedAt).toLocaleDateString("fr-TN")}
          </span>
        )}
      </div>

      {/* Upload form */}
      {!isCompleted && !isCancelled ? (
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-4">
            {t("uploadResult")}
          </p>
          <UploadResultForm orderId={order.id} />
        </div>
      ) : isCompleted ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" strokeWidth={2.5} />
          <p className="text-sm font-semibold text-green-800">
            Les résultats ont été transmis avec succès.
          </p>
        </div>
      ) : null}
    </div>
  );
}
