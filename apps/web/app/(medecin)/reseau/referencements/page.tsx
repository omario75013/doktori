import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Share2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { ReferralActions } from "./referral-actions";

type Referral = {
  id: string;
  direction: "in" | "out";
  reason: string;
  status: string;
  patientConsentStatus: string;
  shareMedicalRecord: boolean;
  suggestedAppointmentAt: string | null;
  notesForReceivingDoctor: string | null;
  createdAt: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  counterpartName: string;
  counterpartSpecialty: string | null;
};

type T = Awaited<ReturnType<typeof getTranslations<"medecin.reseau">>>;

export default async function ReferencementsPage() {
  const t = await getTranslations("medecin.reseau");
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    redirect("/connexion");
  }

  const rows = (await db.execute(sql`
    SELECT
      r.id,
      CASE WHEN r.from_doctor_id = ${session.user.id} THEN 'out' ELSE 'in' END AS direction,
      r.reason,
      r.status,
      r.patient_consent_status AS "patientConsentStatus",
      r.share_medical_record AS "shareMedicalRecord",
      r.suggested_appointment_at AS "suggestedAppointmentAt",
      r.notes_for_receiving_doctor AS "notesForReceivingDoctor",
      r.created_at AS "createdAt",
      p.id AS "patientId",
      p.name AS "patientName",
      p.phone AS "patientPhone",
      d.name AS "counterpartName",
      d.specialty AS "counterpartSpecialty"
    FROM patient_referrals r
    INNER JOIN patients p ON p.id = r.patient_id
    INNER JOIN doctors d ON d.id = CASE
      WHEN r.from_doctor_id = ${session.user.id} THEN r.to_doctor_id
      ELSE r.from_doctor_id
    END
    WHERE r.from_doctor_id = ${session.user.id} OR r.to_doctor_id = ${session.user.id}
    ORDER BY r.created_at DESC
    LIMIT 100
  `)) as unknown as Referral[];

  const incoming = rows.filter((r) => r.direction === "in");
  const outgoing = rows.filter((r) => r.direction === "out");

  return (
    <div className="space-y-6">
      <Link
        href="/reseau"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToNetwork")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          {t("referralsTitle")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t("referralsSubtitle")}
        </p>
      </div>

      <section className="ds-card p-5">
        <h2 className="font-semibold text-foreground mb-3">
          {t("incomingTitle", { count: incoming.length })}
        </h2>
        <ReferralList rows={incoming} direction="in" t={t} />
      </section>

      <section className="ds-card p-5">
        <h2 className="font-semibold text-foreground mb-3">
          {t("outgoingTitle", { count: outgoing.length })}
        </h2>
        <ReferralList rows={outgoing} direction="out" t={t} />
      </section>
    </div>
  );
}

function ReferralList({ rows, direction, t }: { rows: Referral[]; direction: "in" | "out"; t: T }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        {direction === "in" ? t("emptyIncoming") : t("emptyOutgoing")}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="py-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {r.patientName}
                <span className="text-gray-400 font-normal"> · {r.patientPhone}</span>
              </p>
              <p className="text-xs text-gray-500">
                {direction === "in" ? t("fromLabel") : t("toLabel")}
                Dr. {r.counterpartName}
                {r.counterpartSpecialty && ` · ${r.counterpartSpecialty}`}
              </p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{r.reason}</p>
              <p className="text-xs text-gray-400 mt-1">
                {format(new Date(r.createdAt), "d MMM yyyy", { locale: fr })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={r.status} t={t} />
              {r.shareMedicalRecord && (
                <ConsentBadge status={r.patientConsentStatus} t={t} />
              )}
            </div>
          </div>
          {/* Action row — "Voir les détails" is shown on every row;
              accept/decline/book actions only on incoming rows. */}
          <ReferralActions
            referralId={r.id}
            patientId={r.patientId}
            patientName={r.patientName}
            patientPhone={r.patientPhone}
            counterpartName={r.counterpartName}
            counterpartSpecialty={r.counterpartSpecialty}
            direction={direction}
            status={r.status}
            consentStatus={r.patientConsentStatus}
            shareMedicalRecord={r.shareMedicalRecord}
            reason={r.reason}
            notesForReceivingDoctor={r.notesForReceivingDoctor}
            suggestedAppointmentAt={r.suggestedAppointmentAt}
            createdAt={r.createdAt}
          />
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status, t }: { status: string; t: T }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: t("statusPending"), className: "bg-orange-100 text-orange-700", icon: <Clock className="h-3 w-3" /> },
    accepted: { label: t("statusAccepted"), className: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
    declined: { label: t("statusDeclined"), className: "bg-gray-100 text-gray-500", icon: <XCircle className="h-3 w-3" /> },
    completed: { label: t("statusCompleted"), className: "bg-blue-100 text-blue-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  };
  const cfg = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function ConsentBadge({ status, t }: { status: string; t: T }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: t("consentPending"), className: "bg-orange-50 text-orange-600 border border-orange-200" },
    granted: { label: t("consentGranted"), className: "bg-green-50 text-green-700 border border-green-200" },
    denied: { label: t("consentDenied"), className: "bg-red-50 text-red-600 border border-red-200" },
  };
  const cfg = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
