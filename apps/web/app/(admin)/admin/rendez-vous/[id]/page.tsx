import { notFound } from "next/navigation";
import Link from "next/link";
import {
  db,
  appointments,
  doctors,
  patients,
  consultationNotes,
  prescriptions,
} from "@doktori/db";
import { eq } from "drizzle-orm";
import {
  ArrowLeft,
  Calendar,
  User,
  Stethoscope,
  Clock,
  FileText,
  Pill,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { AppointmentActions } from "./appointment-actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  no_show: "bg-slate-100 text-slate-600",
};

const TYPE_LABELS: Record<string, string> = {
  cabinet: "Cabinet",
  home: "Domicile",
  teleconsult: "Téléconsultation",
};

const TYPE_COLORS: Record<string, string> = {
  cabinet: "bg-teal-50 text-teal-700",
  home: "bg-indigo-50 text-indigo-700",
  teleconsult: "bg-purple-50 text-purple-700",
};

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-xs text-slate-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-slate-900">{value ?? <span className="text-slate-300">—</span>}</span>
    </div>
  );
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString("fr-TN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleString("fr-TN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [row] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      practiceId: appointments.practiceId,
      reason: appointments.reason,
      notes: appointments.notes,
      confirmedAt: appointments.confirmedAt,
      cancelledAt: appointments.cancelledAt,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      doctorId: appointments.doctorId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorCity: doctors.city,
      patientId: appointments.patientId,
      patientName: patients.name,
      patientPhone: patients.phone,
      patientEmail: patients.email,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(eq(appointments.id, id))
    .limit(1);

  if (!row) notFound();

  const [[consultNote], [prescription]] = await Promise.all([
    db.select().from(consultationNotes).where(eq(consultationNotes.appointmentId, id)).limit(1),
    db.select().from(prescriptions).where(eq(prescriptions.appointmentId, id)).limit(1),
  ]);

  const timelineSteps = [
    {
      label: "Créé",
      ts: row.createdAt.toISOString(),
      icon: Clock,
      color: "text-slate-400",
      done: true,
    },
    {
      label: "Confirmé",
      ts: row.confirmedAt?.toISOString() ?? null,
      icon: CheckCircle2,
      color: "text-blue-500",
      done: !!row.confirmedAt,
    },
    ...(row.status === "cancelled"
      ? [{ label: "Annulé", ts: row.cancelledAt?.toISOString() ?? null, icon: XCircle, color: "text-red-500", done: !!row.cancelledAt }]
      : row.status === "no_show"
        ? [{ label: "Absent", ts: null, icon: AlertCircle, color: "text-slate-500", done: true }]
        : [{ label: "Terminé", ts: null, icon: CheckCircle2, color: "text-green-500", done: row.status === "completed" }]),
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link
        href="/admin/rendez-vous"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux rendez-vous
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-slate-400" />
              <h1 className="text-xl font-bold text-slate-900">
                {formatFull(row.startsAt.toISOString())}
              </h1>
            </div>
            <p className="text-sm text-slate-500 pl-7">
              Durée:{" "}
              {Math.round(
                (row.endsAt.getTime() - row.startsAt.getTime()) / 60000
              )}{" "}
              min
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[row.status] ?? "bg-slate-100 text-slate-600"}`}
            >
              {STATUS_LABELS[row.status] ?? row.status}
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${TYPE_COLORS[row.type] ?? "bg-slate-100 text-slate-600"}`}
            >
              {TYPE_LABELS[row.type] ?? row.type}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Patient, Doctor, Timeline, Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient */}
          <SectionCard title="Patient" icon={User}>
            <DetailRow label="Nom" value={
              <Link href={`/admin/patients/${row.patientId}`} className="text-teal-600 hover:underline font-medium">
                {row.patientName}
              </Link>
            } />
            <DetailRow label="Téléphone" value={row.patientPhone} />
            <DetailRow label="Email" value={row.patientEmail ?? undefined} />
          </SectionCard>

          {/* Doctor */}
          <SectionCard title="Médecin" icon={Stethoscope}>
            <DetailRow label="Nom" value={
              <Link href={`/admin/medecins/${row.doctorId}`} className="text-teal-600 hover:underline font-medium">
                {row.doctorName}
              </Link>
            } />
            <DetailRow label="Spécialité" value={<span className="capitalize">{row.doctorSpecialty}</span>} />
            <DetailRow label="Ville" value={<span className="capitalize">{row.doctorCity}</span>} />
          </SectionCard>

          {/* Timeline */}
          <SectionCard title="Chronologie" icon={Clock}>
            <ol className="relative border-l border-slate-200 ml-3 space-y-4">
              {timelineSteps.map((step, i) => (
                <li key={i} className="ml-4">
                  <div
                    className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white ${
                      step.done ? "bg-teal-500" : "bg-slate-200"
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <step.icon className={`w-4 h-4 ${step.done ? step.color : "text-slate-300"}`} />
                    <span className={`text-sm font-medium ${step.done ? "text-slate-900" : "text-slate-400"}`}>
                      {step.label}
                    </span>
                  </div>
                  {step.ts && (
                    <p className="text-xs text-slate-500 mt-0.5 ml-6">{formatShort(step.ts)}</p>
                  )}
                </li>
              ))}
            </ol>

            {(row.reason || row.notes) && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                {row.reason && (
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wide">Motif</span>
                    <p className="text-sm text-slate-700 mt-0.5">{row.reason}</p>
                  </div>
                )}
                {row.notes && (
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wide">Notes</span>
                    <p className="text-sm text-slate-700 mt-0.5">{row.notes}</p>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Consultation notes */}
          {consultNote && (
            <SectionCard title="Notes de consultation (SOAP)" icon={FileText}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {consultNote.subjective && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subjectif</span>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{consultNote.subjective}</p>
                  </div>
                )}
                {consultNote.objective && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Objectif</span>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{consultNote.objective}</p>
                  </div>
                )}
                {consultNote.assessment && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Évaluation</span>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{consultNote.assessment}</p>
                  </div>
                )}
                {consultNote.plan && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</span>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{consultNote.plan}</p>
                  </div>
                )}
              </div>

              {consultNote.vitals && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Constantes</span>
                  <pre className="mt-1 text-xs text-slate-700 bg-slate-50 rounded p-3 overflow-x-auto">
                    {JSON.stringify(consultNote.vitals, null, 2)}
                  </pre>
                </div>
              )}

              {consultNote.icd10Codes && Array.isArray(consultNote.icd10Codes) && consultNote.icd10Codes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Codes ICD-10</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(consultNote.icd10Codes as Array<{ code: string; description?: string }>).map((entry) => (
                      <span
                        key={entry.code}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded font-mono"
                        title={entry.description}
                      >
                        {entry.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Prescription */}
          {prescription && (
            <SectionCard title="Ordonnance" icon={Pill}>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{prescription.content}</p>
              <p className="text-xs text-slate-400 mt-3">
                Émise le {formatShort(prescription.createdAt.toISOString())}
              </p>
            </SectionCard>
          )}
        </div>

        {/* Right column: Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Actions</h2>
            </div>
            <div className="px-6 py-4">
              <AppointmentActions
                appointmentId={row.id}
                currentStatus={row.status}
              />
            </div>
          </div>

          {/* Meta info */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">
              Informations
            </p>
            <DetailRow label="ID" value={<span className="font-mono text-xs text-slate-500">{row.id.slice(0, 8)}…</span>} />
            <DetailRow label="Cabinet" value={row.practiceId ? <span className="font-mono text-xs text-slate-500">{row.practiceId.slice(0, 8)}…</span> : undefined} />
            <DetailRow label="Créé le" value={formatShort(row.createdAt.toISOString())} />
            <DetailRow label="Modifié le" value={formatShort(row.updatedAt.toISOString())} />
          </div>
        </div>
      </div>
    </div>
  );
}
