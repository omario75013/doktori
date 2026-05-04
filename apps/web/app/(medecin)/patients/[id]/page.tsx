"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronDown,
  ChevronUp,
  User,
  ArrowLeft,
  Pencil,
  Trash2,
  X as XIcon,
  IdCard,
  ClipboardList,
  History,
  Upload,
  FileText,
  Download,
  Plus,
  Calendar,
  StickyNote,
  Pill,
  FileUp,
  Activity,
  Printer,
  Eye,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { QuillEditor } from "../../modeles/components/quill-editor";
import { TemplateLookup } from "../../modeles/components/template-lookup";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  notes: string | null;
  createdAt: string;
};

type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  cnamNumber: string | null;
  cin: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  heightCm: number | null;
  weightKg: string | number | null;
  occupation: string | null;
  maritalStatus: string | null;
  preferredLanguage: string | null;
  nationality: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  professionNotes: string | null;
  noShowCount: number;
  lastMinuteCancelCount: number;
  createdAt: string;
};

type Lifestyle = {
  smoking?: "never" | "former" | "current" | null;
  smokingPacksPerDay?: number | null;
  alcohol?: "none" | "occasional" | "moderate" | "heavy" | null;
  activity?: "sedentary" | "moderate" | "active" | null;
  diet?: string | null;
};

type FamilyHistory = {
  heart?: boolean;
  diabetes?: boolean;
  cancer?: boolean;
  hypertension?: boolean;
  stroke?: boolean;
  mentalHealth?: boolean;
  notes?: string;
};

type SurgeryEntry = { year?: string; label: string; hospital?: string };
type HospitalEntry = { year?: string; reason: string; days?: number };
type VaccineEntry = { vaccine: string; date?: string; lotNumber?: string };

type WomensHealth = {
  pregnancies?: number | null;
  livingChildren?: number | null;
  lastMenstruation?: string | null;
  contraception?: string | null;
  menopause?: boolean;
  notes?: string;
};

type MedicalProfile = {
  allergies: string | null;
  chronicConditions: string | null;
  currentMeds: string | null;
  notes: string | null;
  lifestyle: Lifestyle | null;
  familyHistory: FamilyHistory | null;
  pastSurgeries: SurgeryEntry[] | null;
  pastHospitalizations: HospitalEntry[] | null;
  vaccinations: VaccineEntry[] | null;
  womensHealth: WomensHealth | null;
  updatedAt: string;
} | null;

type Attachment = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  fileUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  issuedAt: string | null;
  uploadedAt: string;
};

type TimelineEvent = {
  id: string;
  kind:
    | "appointment"
    | "consultation"
    | "prescription"
    | "attachment"
    | "manual"
    | "profile_updated"
    | "medical_updated";
  title: string;
  body: string | null;
  occurredAt: string;
  meta?: Record<string, unknown>;
};

function getAttachmentCategories(t: ReturnType<typeof useTranslations<"medecin.patientDetail">>): Array<{ value: string; label: string }> {
  return [
    { value: "labo", label: t("catLabo") },
    { value: "imagerie", label: t("catImagerie") },
    { value: "ordonnance", label: t("catOrdonnance") },
    { value: "certificat", label: t("catCertificat") },
    { value: "lettre", label: t("catLettre") },
    { value: "autre", label: t("catAutre") },
  ];
}

type Icd10Entry = { code: string; label: string };

type ConsultationNote = {
  id: string;
  appointmentId: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  vitals: Record<string, number> | null;
  icd10Codes: Icd10Entry[] | null;
  startsAt: string;
  updatedAt: string;
};

type Prescription = {
  id: string;
  content: string;
  createdAt: string;
  appointmentId: string;
  verificationToken: string | null;
};

function getStatusLabels(t: ReturnType<typeof useTranslations<"medecin.patientDetail">>): Record<string, string> {
  return {
    pending: t("statusPending"),
    confirmed: t("statusConfirmed"),
    cancelled: t("statusCancelled"),
    completed: t("statusCompleted"),
    no_show: t("statusNoShow"),
  };
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-secondary text-primary",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
};

const HIGHLIGHT_STYLES: Record<string, string> = {
  red: "bg-red-50 border-red-200 text-red-900",
  orange: "bg-orange-50 border-orange-200 text-orange-900",
  blue: "bg-blue-50 border-blue-200 text-blue-900",
  gray: "bg-secondary border-border text-foreground",
};

function MedBlock({
  title,
  value,
  highlight,
}: {
  title: string;
  value?: string | null;
  highlight: "red" | "orange" | "blue" | "gray";
}) {
  const tCommon = useTranslations("medecin.common");
  const hasValue = value && value.trim().length > 0;
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{title}</div>
      {hasValue ? (
        <div className={`rounded-xl border px-3 py-2 whitespace-pre-wrap text-sm ${HIGHLIGHT_STYLES[highlight]}`}>
          {value}
        </div>
      ) : (
        <div className="text-gray-300 italic text-sm">{tCommon("notProvided")}</div>
      )}
    </div>
  );
}

function NotesCell({ appointment }: { appointment: Appointment }) {
  const t = useTranslations("medecin.patientDetail");
  const [notes, setNotes] = useState(appointment.notes ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur sauvegarde");
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSave}
          maxLength={2000}
          rows={3}
          className="w-full text-sm border border-border rounded-xl px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t("notesPrivatePlaceholder")}
          disabled={saving}
        />
        {saveError && <span className="text-xs text-red-500">{saveError}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left w-full min-h-[2rem] text-sm text-gray-600 hover:bg-secondary rounded-xl px-2 py-1 border border-transparent hover:border-border transition-colors"
      title={t("clickToEdit")}
    >
      {notes ? (
        <span className="whitespace-pre-wrap">{notes}</span>
      ) : (
        <span className="text-gray-300 italic">{t("addNoteInline")}</span>
      )}
    </button>
  );
}

const VITALS_LABELS: Record<string, { label: string; unit: string }> = {
  bp_systolic: { label: "PAS", unit: "mmHg" },
  bp_diastolic: { label: "PAD", unit: "mmHg" },
  heart_rate: { label: "FC", unit: "bpm" },
  temperature: { label: "Temp", unit: "°C" },
  weight: { label: "Poids", unit: "kg" },
  height: { label: "Taille", unit: "cm" },
  spo2: { label: "SpO2", unit: "%" },
  respiratory_rate: { label: "FR", unit: "/min" },
};

export default function PatientDetailPage({ listPath = "/patients" }: { listPath?: string } = {}) {
  return <PatientDetail listPath={listPath} />;
}

function PatientDetail({ listPath }: { listPath: string }) {
  const t = useTranslations("medecin.patientDetail");
  const tCommon = useTranslations("medecin.common");
  const STATUS_LABELS = getStatusLabels(t);
  const ATTACHMENT_CATEGORIES = getAttachmentCategories(t);
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medical, setMedical] = useState<MedicalProfile>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consultNotes, setConsultNotes] = useState<ConsultationNote[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewerRole, setViewerRole] = useState<"doctor" | "secretary">("doctor");
  const [viewerPerms, setViewerPerms] = useState<Record<string, boolean> | null>(null);
  const [tab, setTab] = useState<"general" | "dossier" | "rdv" | "ordonnances" | "documents" | "timeline">("general");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescModalOpen, setPrescModalOpen] = useState(false);

  useEffect(() => {
    const fetchPatient = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/patients/${params.id}`);
        if (res.status === 404) {
          setError(t("patientNotFound"));
          return;
        }
        if (!res.ok) throw new Error(t("loadError"));
        const data = await res.json();
        setPatient(data.patient);
        setAppointments(data.appointments);
        setMedical(data.medical ?? null);
        if (data.viewerRole) setViewerRole(data.viewerRole);
        if (data.viewerPermissions) setViewerPerms(data.viewerPermissions);
      } catch (e) {
        setError(e instanceof Error ? e.message : tCommon("unknownError"));
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [params.id]);

  useEffect(() => {
    const fetchConsultNotes = async () => {
      try {
        const res = await fetch(`/api/patients/${params.id}/consultation-notes`);
        if (res.ok) {
          const data = await res.json();
          setConsultNotes(data);
        }
      } catch {
        // Silently ignore — consultation notes are supplementary
      }
    };

    if (params.id) {
      fetchConsultNotes();
    }
  }, [params.id]);

  const loadAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${params.id}/attachments`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data.attachments ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [params.id]);

  const loadTimeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${params.id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.events ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [params.id]);

  const loadPrescriptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/prescriptions?patientId=${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setPrescriptions(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    if (tab === "dossier") {
      void loadAttachments();
      void loadPrescriptions();
    }
    if (tab === "rdv") {
      // appointments already loaded on mount
    }
    if (tab === "ordonnances") {
      void loadPrescriptions();
    }
    if (tab === "documents") {
      void loadAttachments();
    }
    if (tab === "timeline") {
      void loadTimeline();
      void loadAttachments();
    }
  }, [tab, params.id, loadAttachments, loadTimeline, loadPrescriptions]);

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <p className="text-primary text-sm p-6">{tCommon("loading")}</p>;
  }

  if (error || !patient) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-red-500 text-sm">{error ?? t("patientNotFound")}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="h-9 w-9 rounded-xl border border-border hover:bg-secondary flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
            {patient.noShowCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700"
                title="Nombre de rendez-vous où ce patient ne s'est pas présenté"
              >
                ⚠ {t("noShowBadge", { count: patient.noShowCount, s: patient.noShowCount > 1 ? "s" : "" })}
              </span>
            )}
            {patient.lastMinuteCancelCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700"
                title="Annulations dans les 2h avant le rendez-vous"
              >
                {t("lateCancelBadge", { count: patient.lastMinuteCancelCount, s: patient.lastMinuteCancelCount > 1 ? "s" : "" })}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {patient.phone}
            {patient.email ? ` · ${patient.email}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(viewerRole === "doctor" || viewerPerms?.patientsEdit) && (
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Pencil className="h-4 w-4" />
              {tCommon("edit")}
            </button>
          )}
          {(viewerRole === "doctor" || viewerPerms?.patientsDelete) && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              {tCommon("delete")}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 -mx-1 px-1 pt-1 pb-0 bg-background/95 backdrop-blur-sm">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-gray-800 rounded-lg flex-wrap">
          {([
            { id: "general", label: t("tabGeneral"), icon: IdCard },
            { id: "dossier", label: t("tabDossier"), icon: ClipboardList },
            { id: "rdv", label: t("tabAppointments"), icon: Calendar },
            { id: "ordonnances", label: t("tabPrescriptions"), icon: Pill },
            { id: "documents", label: t("tabDocuments"), icon: FileUp },
          ] as const).map((tabItem) => {
            const Icon = tabItem.icon;
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  tab === tabItem.id
                    ? "bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tabItem.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "general" && (
        <GeneralTab patient={patient} appointments={appointments} />
      )}

      {tab === "dossier" && (
        <DossierTab
          patient={patient}
          medical={medical}
          attachments={attachments}
          consultNotes={consultNotes}
          expandedNotes={expandedNotes}
          toggleNote={toggleNote}
          appointments={appointments}
          onUploadClick={() => setUploadOpen(true)}
          onAttachmentDelete={async (attId) => {
            if (!confirm("Supprimer ce document ?")) return;
            const res = await fetch(
              `/api/patients/${params.id}/attachments/${attId}`,
              { method: "DELETE" }
            );
            if (res.ok) {
              setAttachments((prev) => prev.filter((a) => a.id !== attId));
              toast.success(t("docDeleted"));
            } else {
              toast.error(t("docDeleteFailed"));
            }
          }}
          viewerRole={viewerRole}
          viewerPerms={viewerPerms}
          prescriptions={prescriptions}
          onNewPrescription={() => setPrescModalOpen(true)}
        />
      )}

      {tab === "rdv" && (
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">{t("rdvHistoryTitle")}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t("rdvHistorySubtitle")}</p>
          </div>
          {appointments.length === 0 ? (
            <p className="p-6 text-gray-400 text-center text-sm">{t("rdvEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary text-start">
                    <th className="px-4 py-3 font-medium text-foreground">{t("colDate")}</th>
                    <th className="px-4 py-3 font-medium text-foreground">{t("colStatus")}</th>
                    <th className="px-4 py-3 font-medium text-foreground">{t("colReason")}</th>
                    <th className="px-4 py-3 font-medium text-foreground w-64">{t("colPrivateNotes")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-secondary transition-colors align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {format(new Date(appt.startsAt), "d MMM yyyy HH:mm", { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            STATUS_STYLES[appt.status] ?? "bg-gray-100"
                          }`}
                        >
                          {STATUS_LABELS[appt.status] ?? appt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {appt.reason ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <NotesCell appointment={appt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "ordonnances" && viewerRole === "doctor" && (
        <OrdonnancesSection
          prescriptions={prescriptions}
          onNewPrescription={() => setPrescModalOpen(true)}
        />
      )}
      {tab === "ordonnances" && viewerRole !== "doctor" && (
        <div className="rounded-2xl border border-border bg-white shadow-sm p-10 text-center text-sm text-gray-400">
          Accès aux ordonnances réservé au médecin.
        </div>
      )}

      {tab === "documents" && (
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{t("docsTitle")}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t("docsSubtitle")}</p>
            </div>
            {(viewerRole === "doctor" || viewerPerms?.patientsEdit) && (
              <button
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-3 py-2 text-sm font-medium hover:opacity-90"
              >
                <Upload className="h-4 w-4" />
                {t("addDocument")}
              </button>
            )}
          </div>
          {attachments.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">
              {t("noDocumentsYet")}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {attachments.map((a) => (
                <li key={a.id} className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{a.title}</span>
                      <span className="text-xs rounded-full bg-border px-2 py-0.5 text-gray-600">
                        {ATTACHMENT_CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {a.filename} · {(a.sizeBytes / 1024).toFixed(0)} Ko ·{" "}
                      {format(new Date(a.uploadedAt), "d MMM yyyy HH:mm", { locale: fr })}
                    </div>
                    {a.description && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.description}</div>
                    )}
                  </div>
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-xl border border-border hover:bg-secondary flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
                    title="Ouvrir"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  {(viewerRole === "doctor" || viewerPerms?.patientsEdit) && (
                    <button
                      onClick={async () => {
                        if (!confirm("Supprimer ce document ?")) return;
                        const res = await fetch(`/api/patients/${params.id}/attachments/${a.id}`, { method: "DELETE" });
                        if (res.ok) {
                          setAttachments((prev) => prev.filter((att) => att.id !== a.id));
                          toast.success("Document supprimé");
                        } else {
                          toast.error("Suppression échouée");
                        }
                      }}
                      className="h-9 w-9 rounded-xl border border-red-200 hover:bg-red-50 flex items-center justify-center text-red-500 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "timeline" && (
        <TimelineTab
          patientId={params.id!}
          events={timeline}
          onRefresh={loadTimeline}
        />
      )}

      {editOpen && (
        <PatientEditDialog
          patient={patient}
          medical={medical}
          onClose={() => setEditOpen(false)}
          onSaved={(updatedPatient, updatedMedical) => {
            setPatient((p) => (p ? { ...p, ...updatedPatient } : p));
            if (updatedMedical) setMedical(updatedMedical);
            setEditOpen(false);
            toast.success(t("patientUpdated"));
          }}
        />
      )}

      {uploadOpen && (
        <UploadDialog
          patientId={params.id!}
          onClose={() => setUploadOpen(false)}
          onUploaded={(att) => {
            setAttachments((prev) => [att, ...prev]);
            setUploadOpen(false);
            toast.success(t("docAdded"));
          }}
        />
      )}

      {prescModalOpen && (
        <PrescriptionModal
          patientId={params.id!}
          patientName={patient?.name ?? "—"}
          completedAppointments={appointments.filter((a) => a.status === "completed")}
          onClose={() => setPrescModalOpen(false)}
          onCreated={(presc) => {
            setPrescriptions((prev) => [presc, ...prev]);
            setPrescModalOpen(false);
            toast.success(t("prescCreated"));
          }}
        />
      )}

      {confirmDelete && (
        <DeleteDialog
          loading={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setDeleting(true);
            try {
              const res = await fetch(`/api/patients/${params.id}`, { method: "DELETE" });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error ?? "Suppression échouée");
              }
              const data = await res.json();
              toast.success(
                data.removedFutureAppointments > 0
                  ? t("removedAppointments", { count: data.removedFutureAppointments })
                  : t("patientRemoved")
              );
              router.push(listPath);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Erreur");
            } finally {
              setDeleting(false);
              setConfirmDelete(false);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function PatientEditDialog({
  patient,
  medical,
  onClose,
  onSaved,
}: {
  patient: Patient;
  medical: MedicalProfile;
  onClose: () => void;
  onSaved: (patient: Partial<Patient>, medical: MedicalProfile) => void;
}) {
  const t = useTranslations("medecin.patientDetail");
  const tCommon = useTranslations("medecin.common");
  const [form, setForm] = useState({
    name: patient.name,
    phone: patient.phone,
    email: patient.email ?? "",
    dateOfBirth: patient.dateOfBirth ?? "",
    gender: patient.gender ?? "",
    bloodType: patient.bloodType ?? "",
    cnamNumber: patient.cnamNumber ?? "",
    cin: patient.cin ?? "",
    insuranceProvider: patient.insuranceProvider ?? "",
    insuranceNumber: patient.insuranceNumber ?? "",
    emergencyContactName: patient.emergencyContactName ?? "",
    emergencyContactPhone: patient.emergencyContactPhone ?? "",
    emergencyContactRelation: patient.emergencyContactRelation ?? "",
    heightCm: patient.heightCm != null ? String(patient.heightCm) : "",
    weightKg: patient.weightKg != null ? String(patient.weightKg) : "",
    occupation: patient.occupation ?? "",
    maritalStatus: patient.maritalStatus ?? "",
    preferredLanguage: patient.preferredLanguage ?? "fr",
    allergies: medical?.allergies ?? "",
    chronicConditions: medical?.chronicConditions ?? "",
    currentMeds: medical?.currentMeds ?? "",
    notes: medical?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() === "" ? null : form.email.trim(),
        dateOfBirth: form.dateOfBirth === "" ? null : form.dateOfBirth,
        gender: form.gender === "" ? null : form.gender,
        bloodType: form.bloodType === "" ? null : form.bloodType,
        cnamNumber: form.cnamNumber.trim() === "" ? null : form.cnamNumber.trim(),
        cin: form.cin.trim() === "" ? null : form.cin.trim(),
        insuranceProvider: form.insuranceProvider.trim() === "" ? null : form.insuranceProvider.trim(),
        insuranceNumber: form.insuranceNumber.trim() === "" ? null : form.insuranceNumber.trim(),
        emergencyContactName:
          form.emergencyContactName.trim() === "" ? null : form.emergencyContactName.trim(),
        emergencyContactPhone:
          form.emergencyContactPhone.trim() === "" ? null : form.emergencyContactPhone.trim(),
        emergencyContactRelation:
          form.emergencyContactRelation.trim() === "" ? null : form.emergencyContactRelation.trim(),
        heightCm: form.heightCm.trim() === "" ? null : Number(form.heightCm),
        weightKg: form.weightKg.trim() === "" ? null : Number(form.weightKg),
        occupation: form.occupation.trim() === "" ? null : form.occupation.trim(),
        maritalStatus: form.maritalStatus === "" ? null : form.maritalStatus,
        preferredLanguage: form.preferredLanguage === "" ? null : form.preferredLanguage,
        medical: {
          allergies: form.allergies.trim() === "" ? null : form.allergies.trim(),
          chronicConditions:
            form.chronicConditions.trim() === "" ? null : form.chronicConditions.trim(),
          currentMeds: form.currentMeds.trim() === "" ? null : form.currentMeds.trim(),
          notes: form.notes.trim() === "" ? null : form.notes.trim(),
        },
      };
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Mise à jour échouée");
      }
      const data = await res.json();
      onSaved(data.patient, {
        allergies: payload.medical && (payload.medical as { allergies?: string }).allergies ? (payload.medical as { allergies: string }).allergies : null,
        chronicConditions: (payload.medical as { chronicConditions?: string }).chronicConditions ?? null,
        currentMeds: (payload.medical as { currentMeds?: string }).currentMeds ?? null,
        notes: (payload.medical as { notes?: string }).notes ?? null,
        lifestyle: null,
        familyHistory: null,
        pastSurgeries: null,
        pastHospitalizations: null,
        vaccinations: null,
        womensHealth: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">{t("editTitle")}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-gray-500"
            aria-label={tCommon("close")}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-3" disabled={saving}>
            <Field label={t("fieldFullName")}>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label={t("fieldPhone")}>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label={t("fieldEmail")}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label={t("fieldDateOfBirth")}>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label={t("fieldGender")}>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">—</option>
                <option value="M">{t("genderMale")}</option>
                <option value="F">{t("genderFemale")}</option>
              </select>
            </Field>
            <Field label={t("fieldBloodType")}>
              <select
                value={form.bloodType}
                onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">—</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("fieldCNAM")}>
              <input
                type="text"
                value={form.cnamNumber}
                onChange={(e) => setForm({ ...form, cnamNumber: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label={t("fieldCIN")}>
              <input
                type="text"
                value={form.cin}
                onChange={(e) => setForm({ ...form, cin: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label={t("fieldOccupation")}>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label={t("fieldMaritalStatus")}>
              <select
                value={form.maritalStatus}
                onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">—</option>
                <option value="single">{t("maritalSingle")}</option>
                <option value="married">{t("maritalMarried")}</option>
                <option value="divorced">{t("maritalDivorced")}</option>
                <option value="widowed">{t("maritalWidowed")}</option>
              </select>
            </Field>
            <Field label={t("fieldLanguage")}>
              <select
                value={form.preferredLanguage}
                onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="fr">{t("langFr")}</option>
                <option value="ar">{t("langAr")}</option>
                <option value="en">{t("langEn")}</option>
              </select>
            </Field>
            <Field label={t("fieldHeight")}>
              <input
                type="number"
                min={30}
                max={260}
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label={t("fieldWeight")}>
              <input
                type="number"
                min={1}
                max={400}
                step={0.1}
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-3" disabled={saving}>
            <h3 className="md:col-span-2 text-sm font-semibold text-foreground">{t("sectionInsurance")}</h3>
            <Field label={t("fieldInsuranceOrg")}>
              <select
                value={form.insuranceProvider}
                onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">—</option>
                <option value="CNAM">CNAM</option>
                <option value="STAR">STAR</option>
                <option value="COMAR">COMAR</option>
                <option value="GAT">GAT</option>
                <option value="MAGHREBIA">Maghrebia</option>
                <option value="AMI">AMI</option>
                <option value="AUTRE">Autre</option>
              </select>
            </Field>
            <Field label={t("fieldInsuranceNum")}>
              <input
                type="text"
                value={form.insuranceNumber}
                onChange={(e) => setForm({ ...form, insuranceNumber: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-3" disabled={saving}>
            <h3 className="md:col-span-3 text-sm font-semibold text-foreground">{t("sectionEmergency")}</h3>
            <Field label={t("fieldEmergencyName")}>
              <input
                type="text"
                value={form.emergencyContactName}
                onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label={t("fieldEmergencyPhone")}>
              <input
                type="tel"
                value={form.emergencyContactPhone}
                onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label={t("fieldEmergencyRelation")}>
              <input
                type="text"
                value={form.emergencyContactRelation}
                onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })}
                placeholder={t("emergencyPlaceholder")}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
          </fieldset>

          <fieldset className="space-y-3" disabled={saving}>
            <h3 className="text-sm font-semibold text-foreground">{t("sectionMedical")}</h3>
            <Field label={t("fieldAllergies")}>
              <textarea
                rows={2}
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </Field>
            <Field label={t("fieldChronicConditions")}>
              <textarea
                rows={2}
                value={form.chronicConditions}
                onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </Field>
            <Field label={t("fieldCurrentMeds")}>
              <textarea
                rows={2}
                value={form.currentMeds}
                onChange={(e) => setForm({ ...form, currentMeds: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </Field>
            <Field label={t("fieldMedNotes")}>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </Field>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? tCommon("saving") : tCommon("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function DeleteDialog({
  loading,
  onCancel,
  onConfirm,
}: {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("medecin.patientDetail");
  const tCommon = useTranslations("medecin.common");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{t("deleteTitle")}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {t("deleteMessage")}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            {tCommon("cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? t("deletingButton") : tCommon("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: General ──────────────────────────────────────────────────────────────

function GeneralTab({
  patient,
  appointments,
}: {
  patient: Patient;
  appointments: Appointment[];
}) {
  const t = useTranslations("medecin.patientDetail");
  const lastVisit = appointments.find((a) => a.status === "completed");
  const upcomingVisit = appointments.find(
    (a) => new Date(a.startsAt) > new Date() && (a.status === "confirmed" || a.status === "pending")
  );
  const heightM = patient.heightCm ? patient.heightCm / 100 : null;
  const weightKg = patient.weightKg ? Number(patient.weightKg) : null;
  const bmi = heightM && weightKg ? (weightKg / (heightM * heightM)).toFixed(1) : null;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label={t("kpiTotalVisits")} value={String(appointments.length)} />
        <Kpi
          label={t("kpiPatientSince")}
          value={format(new Date(patient.createdAt), "MMM yyyy", { locale: fr })}
        />
        <Kpi
          label={t("kpiLastVisit")}
          value={
            lastVisit
              ? format(new Date(lastVisit.startsAt), "d MMM yyyy", { locale: fr })
              : "—"
          }
        />
        <Kpi
          label={t("kpiNextAppt")}
          value={
            upcomingVisit
              ? format(new Date(upcomingVisit.startsAt), "d MMM HH:mm", { locale: fr })
              : "—"
          }
        />
      </div>

      {/* Identity */}
      <Card title={t("cardIdentity")}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Info label={t("fieldFullNameDisplay")} value={patient.name} />
          <Info
            label={t("fieldDateOfBirthDisplay")}
            value={
              patient.dateOfBirth
                ? format(new Date(patient.dateOfBirth), "d MMM yyyy", { locale: fr })
                : null
            }
          />
          <Info
            label={t("fieldGenderDisplay")}
            value={patient.gender === "M" ? t("genderMale") : patient.gender === "F" ? t("genderFemale") : null}
          />
          <Info label={t("fieldCINDisplay")} value={patient.cin} mono />
          <Info label={t("fieldNationality")} value={patient.nationality} />
          <Info
            label={t("fieldMaritalStatusDisplay")}
            value={
              patient.maritalStatus === "single"
                ? t("maritalSingle")
                : patient.maritalStatus === "married"
                ? t("maritalMarried")
                : patient.maritalStatus === "divorced"
                ? t("maritalDivorced")
                : patient.maritalStatus === "widowed"
                ? t("maritalWidowedDisplay")
                : null
            }
          />
        </div>
      </Card>

      {/* Contact */}
      <Card title={t("cardContact")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Info label={t("fieldPhoneDisplay")} value={patient.phone} mono />
          <Info label={t("fieldEmailDisplay")} value={patient.email} />
          <Info
            label={t("fieldAddress")}
            value={
              [patient.addressStreet, patient.addressPostalCode, patient.addressCity]
                .filter(Boolean)
                .join(", ") || null
            }
          />
          <Info
            label={t("fieldPrefLang")}
            value={
              patient.preferredLanguage === "ar"
                ? t("langArDisplay")
                : patient.preferredLanguage === "en"
                ? t("langEnDisplay")
                : t("langFrDisplay")
            }
          />
        </div>
      </Card>

      {/* Insurance */}
      <Card title={t("cardInsurance")}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Info label={t("fieldCNAMDisplay")} value={patient.cnamNumber} mono />
          <Info label={t("fieldInsurer")} value={patient.insuranceProvider} />
          <Info label={t("fieldInsuranceNumDisplay")} value={patient.insuranceNumber} mono />
        </div>
      </Card>

      {/* Emergency contact */}
      <Card title={t("cardEmergency")}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Info label={t("fieldEmergencyName")} value={patient.emergencyContactName} />
          <Info label={t("fieldEmergencyPhone")} value={patient.emergencyContactPhone} mono />
          <Info label={t("fieldEmergencyRelation")} value={patient.emergencyContactRelation} />
        </div>
      </Card>

      {/* Biometrics */}
      <Card title={t("cardMorphology")}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Info label={t("fieldBloodTypeDisplay")} value={patient.bloodType} />
          <Info label={t("fieldHeightDisplay")} value={patient.heightCm ? `${patient.heightCm} cm` : null} />
          <Info
            label={t("fieldWeightDisplay")}
            value={weightKg ? `${weightKg} kg` : null}
          />
          <Info label={t("fieldBMI")} value={bmi ? bmi : null} />
        </div>
      </Card>

      {/* Profession */}
      <Card title={t("cardOccupation")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Info label={t("fieldOccupation")} value={patient.occupation} />
          <Info label={t("fieldProfessionNotes")} value={patient.professionNotes} />
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold mt-0.5 text-foreground">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  const tCommon = useTranslations("medecin.common");
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div
        className={`mt-0.5 ${value ? "text-foreground font-medium" : "text-gray-300 italic"} ${
          mono ? "font-mono" : ""
        }`}
      >
        {value ?? tCommon("notProvided")}
      </div>
    </div>
  );
}

// ─── Tab: Dossier ──────────────────────────────────────────────────────────────

function DossierTab({
  patient,
  medical,
  attachments,
  consultNotes,
  expandedNotes,
  toggleNote,
  appointments,
  onUploadClick,
  onAttachmentDelete,
  viewerRole,
  viewerPerms,
  prescriptions,
  onNewPrescription,
}: {
  patient: Patient;
  medical: MedicalProfile;
  attachments: Attachment[];
  consultNotes: ConsultationNote[];
  expandedNotes: Set<string>;
  toggleNote: (id: string) => void;
  appointments: Appointment[];
  onUploadClick: () => void;
  onAttachmentDelete: (attachmentId: string) => void;
  viewerRole: "doctor" | "secretary";
  viewerPerms: Record<string, boolean> | null;
  prescriptions: Prescription[];
  onNewPrescription: () => void;
}) {
  const t = useTranslations("medecin.patientDetail");
  const tCommon = useTranslations("medecin.common");
  const STATUS_LABELS = getStatusLabels(t);
  const ATTACHMENT_CATEGORIES = getAttachmentCategories(t);
  const canUpload = viewerRole === "doctor" || viewerPerms?.patientsEdit;
  const fam = medical?.familyHistory;
  const lifestyle = medical?.lifestyle;

  return (
    <div className="space-y-4">
      {/* Medical summary */}
      <Card title={t("cardMedicalSummary")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <MedBlock title={t("fieldAllergiesDisplay")} value={medical?.allergies} highlight="red" />
          <MedBlock
            title={t("fieldChronicDisplay")}
            value={medical?.chronicConditions}
            highlight="orange"
          />
          <MedBlock
            title={t("fieldCurrentMedsDisplay")}
            value={medical?.currentMeds}
            highlight="blue"
          />
          <MedBlock title={t("fieldNotesDisplay")} value={medical?.notes} highlight="gray" />
        </div>
        {medical?.updatedAt && (
          <div className="text-xs text-gray-400 mt-4">
            {t("updatedAt")} {format(new Date(medical.updatedAt), "d MMM yyyy", { locale: fr })}
          </div>
        )}
      </Card>

      {/* Family history */}
      <Card title={t("cardFamilyHistory")}>
        {fam && Object.values(fam).some(Boolean) ? (
          <div className="flex flex-wrap gap-2 text-sm">
            {fam.heart && <Tag label={t("famHeart")} tone="red" />}
            {fam.diabetes && <Tag label={t("famDiabetes")} tone="blue" />}
            {fam.cancer && <Tag label={t("famCancer")} tone="purple" />}
            {fam.hypertension && <Tag label={t("famHypertension")} tone="orange" />}
            {fam.stroke && <Tag label={t("famStroke")} tone="red" />}
            {fam.mentalHealth && <Tag label={t("famMentalHealth")} tone="teal" />}
            {fam.notes && (
              <div className="w-full mt-2 text-gray-700 whitespace-pre-wrap">{fam.notes}</div>
            )}
          </div>
        ) : (
          <EmptyInline />
        )}
      </Card>

      {/* Lifestyle */}
      <Card title={t("cardLifestyle")}>
        {lifestyle && Object.values(lifestyle).some((v) => v != null) ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Info
              label={t("fieldSmoking")}
              value={
                lifestyle.smoking === "never"
                  ? t("smokingNever")
                  : lifestyle.smoking === "former"
                  ? t("smokingFormer")
                  : lifestyle.smoking === "current"
                  ? lifestyle.smokingPacksPerDay
                    ? t("smokingCurrent", { packs: lifestyle.smokingPacksPerDay })
                    : t("smokingCurrentNoCount")
                  : null
              }
            />
            <Info
              label={t("fieldAlcohol")}
              value={
                lifestyle.alcohol === "none"
                  ? t("alcoholNone")
                  : lifestyle.alcohol === "occasional"
                  ? t("alcoholOccasional")
                  : lifestyle.alcohol === "moderate"
                  ? t("alcoholModerate")
                  : lifestyle.alcohol === "heavy"
                  ? t("alcoholHeavy")
                  : null
              }
            />
            <Info
              label={t("fieldActivity")}
              value={
                lifestyle.activity === "sedentary"
                  ? t("activitySedentary")
                  : lifestyle.activity === "moderate"
                  ? t("activityModerate")
                  : lifestyle.activity === "active"
                  ? t("activityActive")
                  : null
              }
            />
            <Info label={t("fieldDiet")} value={lifestyle.diet ?? null} />
          </div>
        ) : (
          <EmptyInline />
        )}
      </Card>

      {/* Past surgeries */}
      <Card title={t("cardSurgeries")}>
        {medical?.pastSurgeries && medical.pastSurgeries.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {medical.pastSurgeries.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2"
              >
                {s.year && (
                  <span className="font-mono text-xs text-gray-500 pt-0.5">{s.year}</span>
                )}
                <div className="flex-1">
                  <div className="font-medium text-foreground">{s.label}</div>
                  {s.hospital && <div className="text-xs text-gray-500">{s.hospital}</div>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyInline />
        )}
      </Card>

      {/* Past hospitalizations */}
      <Card title={t("cardHospitalizations")}>
        {medical?.pastHospitalizations && medical.pastHospitalizations.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {medical.pastHospitalizations.map((h, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2"
              >
                {h.year && (
                  <span className="font-mono text-xs text-gray-500 pt-0.5">{h.year}</span>
                )}
                <div className="flex-1">
                  <div className="font-medium text-foreground">{h.reason}</div>
                  {h.days && <div className="text-xs text-gray-500">{t("hospitalizationDays", { count: h.days })}</div>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyInline />
        )}
      </Card>

      {/* Vaccinations */}
      <Card title={t("cardVaccinations")}>
        {medical?.vaccinations && medical.vaccinations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-border">
                  <th className="pb-2 pr-4 font-medium">{t("vaccineHeader")}</th>
                  <th className="pb-2 pr-4 font-medium">{tCommon("date")}</th>
                  <th className="pb-2 font-medium">{t("lotHeader")}</th>
                </tr>
              </thead>
              <tbody>
                {medical.vaccinations.map((v, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-medium text-foreground">{v.vaccine}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {v.date
                        ? format(new Date(v.date), "d MMM yyyy", { locale: fr })
                        : "—"}
                    </td>
                    <td className="py-2 text-gray-600 font-mono text-xs">{v.lotNumber ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyInline />
        )}
      </Card>

      {/* Women's health (only if gender=F) */}
      {patient.gender === "F" && (
        <Card title={t("cardWomensHealth")}>
          {medical?.womensHealth && Object.values(medical.womensHealth).some((v) => v != null) ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Info
                label={t("fieldPregnancies")}
                value={
                  medical.womensHealth.pregnancies != null
                    ? String(medical.womensHealth.pregnancies)
                    : null
                }
              />
              <Info
                label={t("fieldLivingChildren")}
                value={
                  medical.womensHealth.livingChildren != null
                    ? String(medical.womensHealth.livingChildren)
                    : null
                }
              />
              <Info
                label={t("fieldLastMenstruation")}
                value={
                  medical.womensHealth.lastMenstruation
                    ? format(new Date(medical.womensHealth.lastMenstruation), "d MMM yyyy", {
                        locale: fr,
                      })
                    : null
                }
              />
              <Info label={t("fieldContraception")} value={medical.womensHealth.contraception ?? null} />
              {medical.womensHealth.menopause && (
                <div className="md:col-span-4">
                  <Tag label={t("tagMenopause")} tone="orange" />
                </div>
              )}
              {medical.womensHealth.notes && (
                <div className="md:col-span-4 text-gray-700 whitespace-pre-wrap">
                  {medical.womensHealth.notes}
                </div>
              )}
            </div>
          ) : (
            <EmptyInline />
          )}
        </Card>
      )}

      {/* Attachments */}
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("cardDocuments")}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("documentsSubtitle")}
            </p>
          </div>
          {canUpload && (
            <button
              onClick={onUploadClick}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-3 py-2 text-sm font-medium hover:opacity-90"
            >
              <Upload className="h-4 w-4" />
              {t("addDocumentButton")}
            </button>
          )}
        </div>
        {attachments.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            {t("noDocuments")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {attachments.map((a) => (
              <li key={a.id} className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{a.title}</span>
                    <span className="text-xs rounded-full bg-border px-2 py-0.5 text-gray-600">
                      {ATTACHMENT_CATEGORIES.find((c) => c.value === a.category)?.label ??
                        a.category}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {a.filename} · {(a.sizeBytes / 1024).toFixed(0)} Ko ·{" "}
                    {format(new Date(a.uploadedAt), "d MMM yyyy HH:mm", { locale: fr })}
                  </div>
                  {a.description && (
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.description}</div>
                  )}
                </div>
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-xl border border-border hover:bg-secondary flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
                  title="Ouvrir"
                >
                  <Download className="h-4 w-4" />
                </a>
                {canUpload && (
                  <button
                    onClick={() => onAttachmentDelete(a.id)}
                    className="h-9 w-9 rounded-xl border border-red-200 hover:bg-red-50 flex items-center justify-center text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* SOAP consultations */}
      {consultNotes.length > 0 && (
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">{t("cardSOAP")}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("soapSubtitle")}
            </p>
          </div>
          <div className="divide-y divide-border">
            {consultNotes.map((cn) => {
              const isExpanded = expandedNotes.has(cn.id);
              return (
                <div key={cn.id} className="p-4">
                  <button
                    onClick={() => toggleNote(cn.id)}
                    className="w-full text-left flex items-center justify-between gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {format(new Date(cn.startsAt), "d MMM yyyy", { locale: fr })}
                      </span>
                      {cn.icd10Codes && cn.icd10Codes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {cn.icd10Codes.map((c) => (
                            <span
                              key={c.code}
                              className="inline-flex items-center gap-1 bg-border text-primary text-xs px-2 py-0.5 rounded-full font-mono font-bold"
                            >
                              {c.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 text-sm">
                      {cn.vitals && Object.keys(cn.vitals).length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            {t("soapVitals")}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(cn.vitals).map(([k, v]) => {
                              const meta = VITALS_LABELS[k];
                              if (!meta) return null;
                              return (
                                <span
                                  key={k}
                                  className="bg-secondary border border-border rounded-xl px-2 py-1 text-xs text-foreground"
                                >
                                  <span className="font-medium">{meta.label}</span> {v} {meta.unit}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {[
                        { letter: "S", key: "subjective" as const, label: t("soapSubjective") },
                        { letter: "O", key: "objective" as const, label: t("soapObjective") },
                        { letter: "A", key: "assessment" as const, label: t("soapAssessment") },
                        { letter: "P", key: "plan" as const, label: t("soapPlan") },
                      ].map(({ letter, key, label }) =>
                        cn[key] ? (
                          <div key={key}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {letter}
                              </span>
                              <span className="text-xs text-gray-500 uppercase tracking-wide">
                                {label}
                              </span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap pl-6">{cn[key]}</p>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ordonnances */}
      {viewerRole === "doctor" && (
        <OrdonnancesSection
          prescriptions={prescriptions}
          onNewPrescription={onNewPrescription}
        />
      )}

      {/* Appointments table */}
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{t("cardApptHistory")}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("apptHistorySubtitle")}
          </p>
        </div>
        {appointments.length === 0 ? (
          <p className="p-6 text-gray-400 text-center text-sm">{t("noAppointments")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th className="px-4 py-3 font-medium text-foreground">{tCommon("date")}</th>
                  <th className="px-4 py-3 font-medium text-foreground">{tCommon("status")}</th>
                  <th className="px-4 py-3 font-medium text-foreground">{t("colReason")}</th>
                  <th className="px-4 py-3 font-medium text-foreground w-64">{t("colNotes")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-secondary transition-colors align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {format(new Date(appt.startsAt), "d MMM yyyy HH:mm", { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          STATUS_STYLES[appt.status] ?? "bg-gray-100"
                        }`}
                      >
                        {STATUS_LABELS[appt.status] ?? appt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {appt.reason ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <NotesCell appointment={appt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({
  label,
  tone,
}: {
  label: string;
  tone: "red" | "orange" | "blue" | "teal" | "purple";
}) {
  const tones: Record<string, string> = {
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-blue-100 text-blue-700",
    teal: "bg-secondary text-primary",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${tones[tone]}`}>
      {label}
    </span>
  );
}

function EmptyInline() {
  const t = useTranslations("medecin.patientDetail");
  return <div className="text-sm text-gray-300 italic">{t("noData")}</div>;
}

// ─── Ordonnances section ──────────────────────────────────────────────────────

function OrdonnancesSection({
  prescriptions,
  onNewPrescription,
}: {
  prescriptions: Prescription[];
  onNewPrescription: () => void;
}) {
  const t = useTranslations("medecin.patientDetail");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {t("cardPrescriptions")}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("prescSubtitle")}
          </p>
        </div>
        <button
          onClick={onNewPrescription}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-3 py-2 text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("newPrescriptionButton")}
        </button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-400">
          {t("noPrescriptions")}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {prescriptions.map((p) => {
            const isExpanded = expandedId === p.id;
            const excerpt = p.content.length > 120 ? p.content.slice(0, 120) + "…" : p.content;
            return (
              <li key={p.id} className="p-4">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="w-full text-left flex items-start justify-between gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {format(new Date(p.createdAt), "d MMM yyyy", { locale: fr })}
                      </div>
                      {!isExpanded && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                          {excerpt}
                        </div>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-gray-400 shrink-0 mt-1" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />
                  )}
                </button>
                {isExpanded && (
                  <>
                    <div className="mt-3 ml-11 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
                      {p.content}
                    </div>
                    <div className="mt-2 ml-11 flex items-center gap-2">
                      <a
                        href={`/ordonnance/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Imprimer
                      </a>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Prescription modal ───────────────────────────────────────────────────────

function PrescriptionModal({
  patientId,
  patientName,
  completedAppointments,
  onClose,
  onCreated,
}: {
  patientId: string;
  patientName: string;
  completedAppointments: Appointment[];
  onClose: () => void;
  onCreated: (presc: Prescription) => void;
}) {
  const t = useTranslations("medecin.patientDetail");
  const tCommon = useTranslations("medecin.common");
  const [appointmentId, setAppointmentId] = useState(
    completedAppointments[0]?.id ?? ""
  );
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [usedTemplateId, setUsedTemplateId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [withoutAppointment, setWithoutAppointment] = useState(
    completedAppointments.length === 0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!withoutAppointment && !appointmentId) {
      toast.error(t("prescRequireAppt"));
      return;
    }
    if (content.trim().length < 3) {
      toast.error(t("prescTooShort"));
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { content: content.trim() };
      if (withoutAppointment) {
        body.patientId = patientId;
      } else {
        body.appointmentId = appointmentId;
      }
      if (usedTemplateId && usedTemplateId !== "__blank__") body.templateId = usedTemplateId;
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erreur");
      }
      const created = await res.json() as Prescription;
      onCreated(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white px-5 py-4 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("newPrescModalTitle")}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-gray-500"
            aria-label={tCommon("close")}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={withoutAppointment}
              onChange={(e) => setWithoutAppointment(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            {t("withoutAppointment")}
          </label>
          {!withoutAppointment && (
            <Field label={t("fieldAppointment")}>
              {completedAppointments.length === 0 ? (
                <p className="text-sm text-gray-400 italic">{t("noCompletedAppts")}</p>
              ) : (
                <select
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {completedAppointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {format(new Date(a.startsAt), "d MMM yyyy HH:mm", { locale: fr })}
                      {a.reason ? ` — ${a.reason}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 block">
                {t("fieldMedications")}
              </label>
              <button
                type="button"
                onClick={() => setPreviewing((p) => !p)}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium border border-primary/40 text-primary hover:bg-primary/5 transition-colors"
              >
                {previewing ? (
                  <>
                    <Edit3 className="h-3 w-3" />
                    {t("editPrescription")}
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    {t("previewPrescription")}
                  </>
                )}
              </button>
            </div>
            {!previewing && (
              <TemplateLookup
                patientId={patientId}
                appointmentId={appointmentId || undefined}
                onPick={(rendered, templateId) => {
                  if (templateId === "__blank__") {
                    setContent("");
                  } else {
                    setContent((prev) =>
                      prev.trim() ? prev + rendered : rendered
                    );
                  }
                  setUsedTemplateId(templateId);
                }}
              />
            )}
            {previewing ? (
              <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-white to-gray-50/50 shadow-sm overflow-hidden">
                <div className="px-5 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-bold">
                  <Eye className="h-3 w-3" />
                  {t("previewLabel")}
                </div>
                <div className="p-6">
                  <div className="border-b-2 border-primary pb-3 mb-5 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Patient</p>
                      <p className="text-base font-semibold text-gray-800">{patientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Date</p>
                      <p className="text-base font-semibold text-gray-800">
                        {format(new Date(), "d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  {content.trim() ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-800 [&>h1]:mt-0 [&>h1]:mb-3 [&>h2]:mt-4 [&>p]:my-2 [&>hr]:my-4"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  ) : (
                    <p className="text-sm text-gray-400 italic">{t("previewEmpty")}</p>
                  )}
                  <div className="mt-10 flex justify-end">
                    <div className="text-center min-w-[180px]">
                      <div className="h-14 border-b border-gray-300" />
                      <p className="text-[11px] text-gray-500 mt-1.5">{t("signatureLabel")}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <QuillEditor
                value={content}
                onChange={setContent}
                placeholder={t("prescPlaceholder")}
                minHeight="240px"
              />
            )}
            {!previewing && (
              <div className="flex items-center justify-between">
                {usedTemplateId && usedTemplateId !== "__blank__" && (
                  <p className="text-xs text-primary">{t("templateApplied")}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving || (!withoutAppointment && completedAppointments.length === 0)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? tCommon("saving") : t("saveOrdonnance")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Timeline ──────────────────────────────────────────────────────────────

function TimelineTab({
  patientId,
  events,
  onRefresh,
}: {
  patientId: string;
  events: TimelineEvent[];
  onRefresh: () => void | Promise<void>;
}) {
  const t = useTranslations("medecin.patientDetail");
  const tCommon = useTranslations("medecin.common");
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      setTitle("");
      setBody("");
      setAddOpen(false);
      toast.success(t("noteAdded"));
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("cardTimeline")}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("timelineSubtitle")}
            </p>
          </div>
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-3 py-2 text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t("addNoteButton")}
          </button>
        </div>

        {addOpen && (
          <div className="p-4 border-b border-border bg-secondary/40">
            <div className="space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("detailsPlaceholder")}
                rows={3}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setAddOpen(false);
                    setTitle("");
                    setBody("");
                  }}
                  className="rounded-xl border border-border bg-white px-3 py-1.5 text-sm hover:bg-secondary"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  onClick={submit}
                  disabled={saving || !title.trim()}
                  className="rounded-xl bg-primary text-white px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? t("addingButton") : tCommon("add")}
                </button>
              </div>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            {t("noEvents")}
          </div>
        ) : (
          <ol className="relative p-5">
            <div className="absolute left-[34px] top-5 bottom-5 w-px bg-border" aria-hidden />
            {events.map((e) => (
              <li key={e.id} className="relative pl-12 pb-5 last:pb-0">
                <span
                  className={`absolute left-5 top-1 h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-white ${
                    TIMELINE_TONES[e.kind]?.bg ?? "bg-gray-200 text-gray-500"
                  }`}
                >
                  {(() => {
                    const Ic = TIMELINE_ICONS[e.kind] ?? StickyNote;
                    return <Ic className="h-3.5 w-3.5" />;
                  })()}
                </span>
                <div className="rounded-xl border border-border bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{e.title}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(e.occurredAt), "d MMM yyyy HH:mm", { locale: fr })}
                    </span>
                  </div>
                  {e.body && (
                    <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap line-clamp-4">
                      {e.body}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

const TIMELINE_ICONS: Record<TimelineEvent["kind"], typeof Calendar> = {
  appointment: Calendar,
  consultation: Activity,
  prescription: Pill,
  attachment: FileUp,
  manual: StickyNote,
  profile_updated: User,
  medical_updated: ClipboardList,
};

const TIMELINE_TONES: Record<TimelineEvent["kind"], { bg: string }> = {
  appointment: { bg: "bg-blue-100 text-blue-700" },
  consultation: { bg: "bg-teal-100 text-teal-700" },
  prescription: { bg: "bg-indigo-100 text-indigo-700" },
  attachment: { bg: "bg-amber-100 text-amber-700" },
  manual: { bg: "bg-slate-100 text-slate-700" },
  profile_updated: { bg: "bg-gray-100 text-gray-700" },
  medical_updated: { bg: "bg-rose-100 text-rose-700" },
};

// ─── Upload dialog ──────────────────────────────────────────────────────────────

function UploadDialog({
  patientId,
  onClose,
  onUploaded,
}: {
  patientId: string;
  onClose: () => void;
  onUploaded: (a: Attachment) => void;
}) {
  const t = useTranslations("medecin.patientDetail");
  const tCommon = useTranslations("medecin.common");
  const ATTACHMENT_CATEGORIES = getAttachmentCategories(t);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("labo");
  const [description, setDescription] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [uploading, setUploading] = useState(false);

  async function submit() {
    if (!file || !title.trim()) {
      toast.error(t("uploadFileRequired"));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title);
      fd.append("category", category);
      if (description) fd.append("description", description);
      if (issuedAt) fd.append("issuedAt", issuedAt);
      const res = await fetch(`/api/patients/${patientId}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? t("uploadFailed"));
      }
      const data = await res.json();
      onUploaded(data.attachment);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">{t("uploadTitle")}</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl hover:bg-secondary flex items-center justify-center text-gray-500"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">{t("fileLabel")}</label>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t("fileHint")}
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">{t("titleLabel")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titleDocPlaceholder")}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">{t("categoryLabel")}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ATTACHMENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">{t("issuedAtLabel")}</label>
              <input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">{t("descriptionLabel")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button
            onClick={onClose}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            {tCommon("cancel")}
          </button>
          <button
            onClick={submit}
            disabled={uploading}
            className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {uploading ? t("uploadingButton") : t("uploadButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
