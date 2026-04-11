"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  noShowCount: number;
  lastMinuteCancelCount: number;
  createdAt: string;
};

type MedicalProfile = {
  allergies: string | null;
  chronicConditions: string | null;
  currentMeds: string | null;
  notes: string | null;
  updatedAt: string;
} | null;

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

const STATUS_LABELS: Record<string, string> = {
  pending: "À confirmer",
  confirmed: "Confirmé",
  cancelled: "Annulé",
  completed: "Terminé",
  no_show: "Absent",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
};

const HIGHLIGHT_STYLES: Record<string, string> = {
  red: "bg-red-50 border-red-200 text-red-900",
  orange: "bg-orange-50 border-orange-200 text-orange-900",
  blue: "bg-blue-50 border-blue-200 text-blue-900",
  gray: "bg-gray-50 border-gray-200 text-gray-700",
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
  const hasValue = value && value.trim().length > 0;
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase mb-1">{title}</div>
      {hasValue ? (
        <div className={`rounded-lg border px-3 py-2 whitespace-pre-wrap ${HIGHLIGHT_STYLES[highlight]}`}>
          {value}
        </div>
      ) : (
        <div className="text-gray-300 italic">Non renseigné</div>
      )}
    </div>
  );
}

function NotesCell({ appointment }: { appointment: Appointment }) {
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
          className="w-full text-sm border rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="Notes privées..."
          disabled={saving}
        />
        {saveError && <span className="text-xs text-red-500">{saveError}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left w-full min-h-[2rem] text-sm text-gray-600 hover:bg-blue-50 rounded px-2 py-1 border border-transparent hover:border-blue-200 transition-colors"
      title="Cliquer pour modifier"
    >
      {notes ? (
        <span className="whitespace-pre-wrap">{notes}</span>
      ) : (
        <span className="text-gray-300 italic">Ajouter une note...</span>
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

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medical, setMedical] = useState<MedicalProfile>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consultNotes, setConsultNotes] = useState<ConsultationNote[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchPatient = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/patients/${params.id}`);
        if (res.status === 404) {
          setError("Patient introuvable");
          return;
        }
        if (!res.ok) throw new Error("Erreur lors du chargement");
        const data = await res.json();
        setPatient(data.patient);
        setAppointments(data.appointments);
        setMedical(data.medical ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
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

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <p className="text-gray-400 text-sm p-6">Chargement...</p>;
  }

  if (error || !patient) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-red-500 text-sm">{error ?? "Patient introuvable"}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Retour
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{patient.name}</h1>
            {patient.noShowCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700"
                title="Nombre de rendez-vous où ce patient ne s'est pas présenté"
              >
                ⚠ {patient.noShowCount} absence{patient.noShowCount > 1 ? "s" : ""}
              </span>
            )}
            {patient.lastMinuteCancelCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700"
                title="Annulations dans les 2h avant le rendez-vous"
              >
                {patient.lastMinuteCancelCount} annulation{patient.lastMinuteCancelCount > 1 ? "s" : ""} tardive{patient.lastMinuteCancelCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {patient.phone}
            {patient.email ? ` · ${patient.email}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border">
          <div className="text-xs text-gray-500 uppercase">Total visites</div>
          <div className="text-3xl font-bold mt-1">{appointments.length}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border">
          <div className="text-xs text-gray-500 uppercase">Patient depuis</div>
          <div className="text-lg font-semibold mt-1">
            {format(new Date(patient.createdAt), "d MMM yyyy", { locale: fr })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Dossier médical</h2>
          {medical?.updatedAt && (
            <span className="text-xs text-gray-400">
              Mis à jour le {format(new Date(medical.updatedAt), "d MMM yyyy", { locale: fr })}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 border-b text-sm">
          <div>
            <div className="text-xs text-gray-500 uppercase">Date de naissance</div>
            <div className="font-medium">
              {patient.dateOfBirth
                ? format(new Date(patient.dateOfBirth), "d MMM yyyy", { locale: fr })
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Sexe</div>
            <div className="font-medium">
              {patient.gender === "M" ? "Homme" : patient.gender === "F" ? "Femme" : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Groupe sanguin</div>
            <div className="font-medium">{patient.bloodType ?? "—"}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 text-sm">
          <MedBlock title="Allergies" value={medical?.allergies} highlight="red" />
          <MedBlock title="Maladies chroniques" value={medical?.chronicConditions} highlight="orange" />
          <MedBlock title="Traitements en cours" value={medical?.currentMeds} highlight="blue" />
          <MedBlock title="Autres remarques" value={medical?.notes} highlight="gray" />
        </div>
      </div>

      {/* SOAP Consultation History */}
      {consultNotes.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Historique de consultations (SOAP)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Cliquer sur une consultation pour voir la note complète
            </p>
          </div>
          <div className="divide-y">
            {consultNotes.map((cn) => {
              const isExpanded = expandedNotes.has(cn.id);
              return (
                <div key={cn.id} className="p-4">
                  <button
                    onClick={() => toggleNote(cn.id)}
                    className="w-full text-left flex items-center justify-between gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-[#134E4A]">
                        {format(new Date(cn.startsAt), "d MMM yyyy", { locale: fr })}
                      </span>
                      {cn.icd10Codes && cn.icd10Codes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {cn.icd10Codes.map((c) => (
                            <span
                              key={c.code}
                              className="inline-flex items-center gap-1 bg-[#E6F4F1] text-[#0891B2] text-xs px-2 py-0.5 rounded-full font-mono font-bold"
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
                          <div className="text-xs text-gray-500 uppercase mb-1">Constantes</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(cn.vitals).map(([k, v]) => {
                              const meta = VITALS_LABELS[k];
                              if (!meta) return null;
                              return (
                                <span
                                  key={k}
                                  className="bg-[#F0FDFA] border border-[#E6F4F1] rounded px-2 py-1 text-xs text-[#134E4A]"
                                >
                                  <span className="font-medium">{meta.label}</span>{" "}
                                  {v} {meta.unit}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {cn.icd10Codes && cn.icd10Codes.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase mb-1">Codes CIM-10</div>
                          <div className="flex flex-wrap gap-1.5">
                            {cn.icd10Codes.map((c) => (
                              <span
                                key={c.code}
                                className="inline-flex items-center gap-1.5 bg-[#E6F4F1] text-[#134E4A] text-xs px-2 py-1 rounded-full"
                              >
                                <span className="font-mono font-bold text-[#0891B2]">{c.code}</span>
                                {c.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {[
                        { letter: "S", key: "subjective" as const, label: "Subjectif" },
                        { letter: "O", key: "objective" as const, label: "Objectif" },
                        { letter: "A", key: "assessment" as const, label: "Assessment" },
                        { letter: "P", key: "plan" as const, label: "Plan" },
                      ].map(({ letter, key, label }) =>
                        cn[key] ? (
                          <div key={key}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-5 h-5 rounded-full bg-[#0891B2] text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {letter}
                              </span>
                              <span className="text-xs text-gray-500 uppercase">{label}</span>
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

      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Historique des rendez-vous</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Cliquer sur une note pour la modifier — sauvegarde automatique
          </p>
        </div>
        {appointments.length === 0 ? (
          <p className="p-6 text-gray-400 text-center text-sm">Aucun rendez-vous.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Motif</th>
                  <th className="px-4 py-3 font-medium text-gray-600 w-64">
                    Notes privées
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {format(new Date(appt.startsAt), "d MMM yyyy HH:mm", {
                        locale: fr,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
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
