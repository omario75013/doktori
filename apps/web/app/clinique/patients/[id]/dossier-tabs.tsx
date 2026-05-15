"use client";

import { useState, useCallback, useEffect } from "react";
import { formatDoctorName } from "@/lib/format-doctor-name";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FlaskConical,
  ExternalLink,
  FileText,
  ShieldAlert,
  Syringe,
  ScrollText,
  Award,
  FolderOpen,
  Calendar,
  ClipboardList,
  Lock,
  Stethoscope,
  Share2,
  Building2,
  Loader2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type MedicalProfile = {
  allergies: string | null;
  chronicConditions: string | null;
  currentMeds: string | null;
  notes: string | null;
  lifestyle: unknown;
  familyHistory: unknown;
  pastSurgeries: unknown;
  pastHospitalizations: unknown;
  vaccinations: unknown;
  womensHealth: unknown;
  updatedAt: string;
};

type Allergy = {
  id: string;
  allergen: string;
  severity: string | null;
  reaction: string | null;
  diagnosedAt: string | null;
  createdAt: string;
};

type Vaccination = {
  id: string;
  vaccineName: string;
  dateReceived: string;
  batchNumber: string | null;
  givenBy: string | null;
  notes: string | null;
};

type Analysis = {
  id: string;
  title: string;
  labName: string | null;
  testDate: string | null;
  fileUrl: string | null;
  notes: string | null;
  createdAt: string;
};

type Prescription = {
  id: string;
  content: string;
  createdAt: string;
};

type Certificate = {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
};

type Document = {
  id: string;
  uploadedBy: string;
  uploadedByDoctorId?: string | null;
  uploadedByLabId: string | null;
  category: string | null;
  title: string | null;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  createdAt: string;
  labName: string | null;
  /** Set when doc was shared via inter-clinic exchange (received from another clinic). */
  sharedFromClinicName?: string | null;
  /** Only present on own documents (owned by this clinic's doctors). */
  sharedWithClinicIds?: string[];
};

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  type: string;
  reason: string | null;
  doctorName: string | null;
  practiceCity: string | null;
  doctorId?: string;
};

type LabOrder = {
  id: string;
  urgency: string;
  status: string;
  tests: unknown;
  labName: string | null;
  doctorName: string | null;
  createdAt: string;
};

type TreatingDoctor = {
  doctorId: string;
  name: string | null;
  specialty: string | null;
  photoUrl: string | null;
  lastRdv: string | null;
};

export type DossierData = {
  /** Clinic id of the viewer (injected client-side for inter-clinic UI). */
  _clinicId?: string;
  patient: {
    id: string;
    name: string;
    ageYears: number | null;
    gender: string | null;
    bloodType: string | null;
  };
  medicalProfile: MedicalProfile | null;
  allergies: Allergy[];
  vaccinations: Vaccination[];
  analyses: Analysis[];
  prescriptions: Prescription[];
  certificates: Certificate[];
  documents: Document[];
  appointments: Appointment[];
  labOrders: LabOrder[];
  treatingDoctors?: TreatingDoctor[];
  meta?: { suppressedSections?: string[] };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  completed: "text-emerald-600 bg-emerald-50",
  confirmed: "text-blue-600 bg-blue-50",
  pending: "text-amber-600 bg-amber-50",
  cancelled: "text-red-500 bg-red-50",
  no_show: "text-gray-500 bg-gray-100",
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: "bg-yellow-50 text-yellow-700 border-yellow-200",
  moderate: "bg-orange-50 text-orange-700 border-orange-200",
  severe: "bg-red-50 text-red-700 border-red-200",
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return format(new Date(d), "d MMM yyyy", { locale: fr });
  } catch {
    return d;
  }
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return format(new Date(d), "d MMM yyyy HH:mm", { locale: fr });
  } catch {
    return d;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// ── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-teal-700 text-white shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-gray-800"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={`text-xs font-bold rounded-full px-1.5 ${
            active ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-gray-700 text-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ── Tab panels ───────────────────────────────────────────────────────────────

function OverviewTab({
  data,
  noData,
}: {
  data: DossierData;
  noData: string;
}) {
  const { medicalProfile, patient } = data;
  const items: Array<{ label: string; value: string | null }> = [
    { label: "Groupe sanguin", value: patient.bloodType },
    { label: "Sexe", value: patient.gender },
    { label: "Âge", value: patient.ageYears !== null ? `${patient.ageYears} ans` : null },
  ];

  return (
    <div className="space-y-6">
      {/* Identity chips */}
      <div className="flex flex-wrap gap-3">
        {items.map(({ label, value }) =>
          value ? (
            <div
              key={label}
              className="flex flex-col items-center px-4 py-2 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-sm min-w-[80px]"
            >
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="font-bold text-sm text-foreground mt-0.5">{value}</span>
            </div>
          ) : null
        )}
      </div>

      {!medicalProfile ? (
        <EmptyState label={noData} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Antécédents chroniques", value: medicalProfile.chronicConditions },
            { label: "Médicaments en cours", value: medicalProfile.currentMeds },
            { label: "Allergies (résumé)", value: medicalProfile.allergies },
            { label: "Notes", value: medicalProfile.notes },
          ].map(({ label, value }) =>
            value ? (
              <div
                key={label}
                className="p-4 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {label}
                </p>
                <p className="text-sm text-foreground whitespace-pre-line">{value}</p>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function AllergiesTab({ allergies, noData }: { allergies: Allergy[]; noData: string }) {
  if (allergies.length === 0) return <EmptyState label={noData} />;
  return (
    <div className="space-y-2">
      {allergies.map((a) => (
        <div
          key={a.id}
          className={`p-4 rounded-xl border ${SEVERITY_COLORS[a.severity ?? ""] ?? "border-border bg-white dark:bg-gray-900"} shadow-sm`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">{a.allergen}</p>
              {a.reaction && (
                <p className="text-sm text-muted-foreground mt-0.5">{a.reaction}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              {a.severity && (
                <span className="text-xs font-medium capitalize">{a.severity}</span>
              )}
              {a.diagnosedAt && (
                <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(a.diagnosedAt)}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VaccinsTab({ vaccinations, noData }: { vaccinations: Vaccination[]; noData: string }) {
  if (vaccinations.length === 0) return <EmptyState label={noData} />;
  return (
    <div className="space-y-2">
      {vaccinations.map((v) => (
        <div
          key={v.id}
          className="p-4 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">{v.vaccineName}</p>
              {v.givenBy && (
                <p className="text-sm text-muted-foreground mt-0.5">Par : {v.givenBy}</p>
              )}
              {v.notes && <p className="text-xs text-muted-foreground/70 mt-1">{v.notes}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-foreground font-medium">{fmtDate(v.dateReceived)}</p>
              {v.batchNumber && (
                <p className="text-xs text-muted-foreground mt-0.5">Lot : {v.batchNumber}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalysesTab({
  analyses,
  documents,
  noData,
}: {
  analyses: Analysis[];
  documents: Document[];
  noData: string;
}) {
  const analysisDocs = documents.filter(
    (d) => d.category === "analyse" || d.category === "imagerie"
  );

  if (analyses.length === 0 && analysisDocs.length === 0)
    return <EmptyState label={noData} />;

  return (
    <div className="space-y-4">
      {analyses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Analyses enregistrées
          </p>
          {analyses.map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-sm flex items-start justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-foreground">{a.title}</p>
                {a.labName && (
                  <p className="text-xs text-muted-foreground mt-0.5">{a.labName}</p>
                )}
                {a.notes && <p className="text-xs text-muted-foreground/70 mt-1">{a.notes}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-muted-foreground">{fmtDate(a.testDate)}</p>
                {a.fileUrl && (
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline mt-1 inline-block"
                    style={{ color: "#0891B2" }}
                  >
                    Voir
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {analysisDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Documents (analyses / imagerie)
          </p>
          {analysisDocs.map((d) => (
            <div
              key={d.id}
              className="p-4 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-sm flex items-start justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-foreground">{d.title ?? d.fileName}</p>
                {d.uploadedBy === "lab" && d.labName && (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-full px-2 py-0.5">
                    <FlaskConical className="h-3 w-3" />
                    {d.labName}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{fmtDate(d.createdAt)}</p>
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline mt-1 inline-block"
                  style={{ color: "#0891B2" }}
                >
                  Voir
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrdonnancesTab({
  prescriptions,
  noData,
}: {
  prescriptions: Prescription[];
  noData: string;
}) {
  if (prescriptions.length === 0) return <EmptyState label={noData} />;
  return (
    <div className="space-y-3">
      {prescriptions.map((p) => (
        <div
          key={p.id}
          className="p-4 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{fmtDateTime(p.createdAt)}</p>
              <p className="text-sm text-foreground line-clamp-3 whitespace-pre-line">
                {stripHtml(p.content).slice(0, 300)}
                {stripHtml(p.content).length > 300 ? "…" : ""}
              </p>
            </div>
            <a
              href={`/ordonnance/${p.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1 text-xs underline"
              style={{ color: "#0891B2" }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ouvrir
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function CertificatsTab({
  certificates,
  noData,
}: {
  certificates: Certificate[];
  noData: string;
}) {
  if (certificates.length === 0) return <EmptyState label={noData} />;
  return (
    <div className="space-y-2">
      {certificates.map((c) => (
        <div
          key={c.id}
          className="p-4 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">{c.title}</p>
              {c.content && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {stripHtml(c.content).slice(0, 200)}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground shrink-0">{fmtDate(c.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Inter-clinic share popover ───────────────────────────────────────────────

type ClinicTarget = { id: string; name: string; city: string };

function ShareWithClinicPopover({
  patientId,
  docId,
  currentSharedIds,
  onClose,
}: {
  patientId: string;
  docId: string;
  currentSharedIds: string[];
  onClose: () => void;
}) {
  const t = useTranslations("clinique.dossier.documents");
  const [targets, setTargets] = useState<ClinicTarget[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [shared, setShared] = useState<Set<string>>(new Set(currentSharedIds));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/clinique/patients/${patientId}/exchange-targets`
      );
      if (!res.ok) throw new Error("load failed");
      const data = await res.json() as { clinics: ClinicTarget[] };
      setTargets(data.clinics);
    } catch {
      setError("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  async function toggle(clinicId: string) {
    setToggling(clinicId);
    const nextShare = !shared.has(clinicId);
    try {
      const res = await fetch(
        `/api/clinique/patients/${patientId}/documents/${docId}/share-with-clinic`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetClinicId: clinicId, share: nextShare }),
        }
      );
      if (!res.ok) throw new Error("toggle failed");
      setShared((prev) => {
        const next = new Set(prev);
        if (nextShare) next.add(clinicId);
        else next.delete(clinicId);
        return next;
      });
    } catch {
      setError("Erreur lors du partage.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="absolute z-50 end-0 top-full mt-1 w-72 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("shareInterClinic")}
        </p>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!loading && targets !== null && targets.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("noOtherClinics")}</p>
      )}
      {!loading && targets !== null && targets.map((clinic) => (
        <div
          key={clinic.id}
          className="flex items-center justify-between gap-3 py-1"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{clinic.name}</p>
            <p className="text-xs text-muted-foreground">{clinic.city}</p>
          </div>
          <button
            onClick={() => toggle(clinic.id)}
            disabled={toggling === clinic.id}
            className={`shrink-0 h-7 px-3 rounded-lg text-xs font-bold transition-colors ${
              shared.has(clinic.id)
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "bg-slate-100 text-foreground hover:bg-slate-200"
            } disabled:opacity-60`}
          >
            {toggling === clinic.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : shared.has(clinic.id) ? (
              "Partagé"
            ) : (
              "Partager"
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({
  documents,
  patientId,
  noData,
}: {
  documents: Document[];
  patientId: string;
  noData: string;
}) {
  const t = useTranslations("clinique.dossier.documents");
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const otherDocs = documents.filter(
    (d) => d.category !== "analyse" && d.category !== "imagerie"
  );
  if (otherDocs.length === 0) return <EmptyState label={noData} />;
  return (
    <div className="space-y-2">
      {otherDocs.map((d) => {
        // An "owned" doc: no sharedFromClinicName → this clinic can share it further.
        const isOwned = !d.sharedFromClinicName;
        return (
          <div
            key={d.id}
            className="p-4 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-sm flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{d.title ?? d.fileName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {d.category ?? "autre"}
              </p>
              {d.uploadedBy === "lab" && d.labName && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-full px-2 py-0.5">
                  <FlaskConical className="h-3 w-3" />
                  {d.labName}
                </span>
              )}
              {d.sharedFromClinicName && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                  <Building2 className="h-3 w-3" />
                  {t("sharedByClinic", { name: d.sharedFromClinicName })}
                </span>
              )}
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
              <p className="text-xs text-muted-foreground">{fmtDate(d.createdAt)}</p>
              <a
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
                style={{ color: "#0891B2" }}
              >
                Voir
              </a>
              {isOwned && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenPopover(openPopover === d.id ? null : d.id)
                    }
                    className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-teal-700 hover:text-teal-800"
                    title={t("shareInterClinic")}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("shareInterClinic")}</span>
                  </button>
                  {openPopover === d.id && (
                    <ShareWithClinicPopover
                      patientId={patientId}
                      docId={d.id}
                      currentSharedIds={d.sharedWithClinicIds ?? []}
                      onClose={() => setOpenPopover(null)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RdvTab({
  appointments,
  noData,
}: {
  appointments: Appointment[];
  noData: string;
}) {
  if (appointments.length === 0) return <EmptyState label={noData} />;
  return (
    <div className="space-y-2">
      {appointments.map((a) => (
        <div
          key={a.id}
          className="p-4 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">
                {a.doctorName ? formatDoctorName(a.doctorName) : "—"}
              </p>
              {a.practiceCity && (
                <p className="text-xs text-muted-foreground mt-0.5">{a.practiceCity}</p>
              )}
              {a.reason && (
                <p className="text-xs text-muted-foreground/70 mt-1 italic">{a.reason}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-foreground">{fmtDateTime(a.startsAt)}</p>
              <span
                className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"}`}
              >
                {a.status}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{a.type}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LabOrdersTab({
  labOrders,
  noData,
}: {
  labOrders: LabOrder[];
  noData: string;
}) {
  if (labOrders.length === 0) return <EmptyState label={noData} />;
  return (
    <div className="space-y-2">
      {labOrders.map((o) => {
        const tests = Array.isArray(o.tests) ? (o.tests as Array<{ label?: string }>) : [];
        return (
          <div
            key={o.id}
            className="p-4 rounded-xl border border-border bg-white dark:bg-gray-900 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">
                  {o.labName ?? "Labo non spécifié"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {o.doctorName ? formatDoctorName(o.doctorName) : "—"} · {tests.length} test{tests.length !== 1 ? "s" : ""}
                </p>
                {o.urgency === "urgent" && (
                  <span className="inline-block mt-1 text-xs font-bold text-red-600 bg-red-50 rounded-full px-2 py-0.5">
                    Urgent
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</p>
                <span
                  className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {o.status}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type TabKey =
  | "overview"
  | "allergies"
  | "vaccins"
  | "analyses"
  | "ordonnances"
  | "certificats"
  | "documents"
  | "rdv"
  | "labOrders";

export function DossierTabs({ data }: { data: DossierData }) {
  const t = useTranslations("clinique.dossier");
  const [active, setActive] = useState<TabKey>("overview");
  const [doctorFilter, setDoctorFilter] = useState<string | null>(null);

  const suppressed = data.meta?.suppressedSections ?? [];
  const treatingDoctors = data.treatingDoctors ?? [];

  // Map tab key → section key used by suppressedSections
  const SUPPRESSED_SECTION_MAP: Partial<Record<TabKey, string>> = {
    overview: "profile",
    allergies: "allergies",
    vaccins: "vaccinations",
    analyses: "analyses",
    ordonnances: "prescriptions",
    certificats: "certificates",
    documents: "documents",
    labOrders: "labOrders",
  };

  const tabs: Array<{ key: TabKey; label: string; count?: number; icon: React.ReactNode }> = [
    { key: "overview", label: t("tabOverview"), icon: <FileText className="h-4 w-4" /> },
    {
      key: "allergies",
      label: t("tabAllergies"),
      count: data.allergies.length,
      icon: <ShieldAlert className="h-4 w-4" />,
    },
    {
      key: "vaccins",
      label: t("tabVaccins"),
      count: data.vaccinations.length,
      icon: <Syringe className="h-4 w-4" />,
    },
    {
      key: "analyses",
      label: t("tabAnalyses"),
      count:
        data.analyses.length +
        data.documents.filter(
          (d) => d.category === "analyse" || d.category === "imagerie"
        ).length,
      icon: <FlaskConical className="h-4 w-4" />,
    },
    {
      key: "ordonnances",
      label: t("tabOrdonnances"),
      count: data.prescriptions.length,
      icon: <ScrollText className="h-4 w-4" />,
    },
    {
      key: "certificats",
      label: t("tabCertificates"),
      count: data.certificates.length,
      icon: <Award className="h-4 w-4" />,
    },
    {
      key: "documents",
      label: t("tabDocuments"),
      count: data.documents.filter(
        (d) => d.category !== "analyse" && d.category !== "imagerie"
      ).length,
      icon: <FolderOpen className="h-4 w-4" />,
    },
    {
      key: "rdv",
      label: t("tabRdv"),
      count: data.appointments.length,
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      key: "labOrders",
      label: t("tabLabOrders"),
      count: data.labOrders.length,
      icon: <ClipboardList className="h-4 w-4" />,
    },
  ];

  const noData = t("noData");

  // Filter appointments by doctorFilter if set
  const filteredAppointments = doctorFilter
    ? data.appointments.filter((a) => (a as { doctorId?: string }).doctorId === doctorFilter)
    : data.appointments;

  const isSuppressed = (tabKey: TabKey): boolean => {
    const section = SUPPRESSED_SECTION_MAP[tabKey];
    return section !== undefined && suppressed.includes(section);
  };

  return (
    <div className="space-y-4">
      {/* Treating doctors strip */}
      {treatingDoctors.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
            <Stethoscope className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase tracking-wider">Médecins traitants</span>
          </div>
          {treatingDoctors.map((doc) => (
            <button
              key={doc.doctorId}
              onClick={() =>
                setDoctorFilter(doctorFilter === doc.doctorId ? null : doc.doctorId)
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                doctorFilter === doc.doctorId
                  ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                  : "border-border bg-white hover:border-cyan-300 text-foreground"
              }`}
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                style={{ background: "#0891B2" }}
              >
                {(doc.name ?? "?").charAt(0).toUpperCase()}
              </div>
              <span>{doc.name ? formatDoctorName(doc.name) : "?"}</span>
              {doc.specialty && (
                <span className="text-muted-foreground font-normal">· {doc.specialty}</span>
              )}
              {doc.lastRdv && (
                <span className="text-muted-foreground font-normal">
                  · {format(new Date(doc.lastRdv as string), "d MMM yy", { locale: fr })}
                </span>
              )}
            </button>
          ))}
          {doctorFilter && (
            <button
              onClick={() => setDoctorFilter(null)}
              className="text-xs text-muted-foreground underline ml-1"
            >
              Effacer le filtre
            </button>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => (
          <TabBtn
            key={tab.key}
            label={tab.label}
            active={active === tab.key}
            count={tab.count}
            onClick={() => setActive(tab.key)}
          />
        ))}
      </div>

      {/* Panel */}
      <div>
        {active === "overview" && (
          isSuppressed("overview") ? (
            <SuppressedNotice />
          ) : (
            <OverviewTab data={data} noData={noData} />
          )
        )}
        {active === "allergies" && (
          isSuppressed("allergies") ? (
            <SuppressedNotice />
          ) : (
            <AllergiesTab allergies={data.allergies} noData={noData} />
          )
        )}
        {active === "vaccins" && (
          isSuppressed("vaccins") ? (
            <SuppressedNotice />
          ) : (
            <VaccinsTab vaccinations={data.vaccinations} noData={noData} />
          )
        )}
        {active === "analyses" && (
          isSuppressed("analyses") ? (
            <SuppressedNotice />
          ) : (
            <AnalysesTab
              analyses={data.analyses}
              documents={data.documents}
              noData={noData}
            />
          )
        )}
        {active === "ordonnances" && (
          isSuppressed("ordonnances") ? (
            <SuppressedNotice />
          ) : (
            <OrdonnancesTab prescriptions={data.prescriptions} noData={noData} />
          )
        )}
        {active === "certificats" && (
          isSuppressed("certificats") ? (
            <SuppressedNotice />
          ) : (
            <CertificatsTab certificates={data.certificates} noData={noData} />
          )
        )}
        {active === "documents" && (
          isSuppressed("documents") ? (
            <SuppressedNotice />
          ) : (
            <DocumentsTab documents={data.documents} patientId={data.patient.id} noData={noData} />
          )
        )}
        {active === "rdv" && (
          <RdvTab appointments={filteredAppointments} noData={noData} />
        )}
        {active === "labOrders" && (
          isSuppressed("labOrders") ? (
            <SuppressedNotice />
          ) : (
            <LabOrdersTab labOrders={data.labOrders} noData={noData} />
          )
        )}
      </div>
    </div>
  );
}

function SuppressedNotice() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Lock className="h-8 w-8 text-gray-300" strokeWidth={1.5} />
      <p className="text-sm font-medium">Section non partagée par le médecin traitant</p>
      <p className="text-xs text-center max-w-xs">
        Le médecin traitant a choisi de ne pas partager cette section du dossier avec la clinique.
      </p>
    </div>
  );
}
