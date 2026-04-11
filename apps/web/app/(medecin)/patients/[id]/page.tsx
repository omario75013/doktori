"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  createdAt: string;
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

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [params.id]);

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
        <div>
          <h1 className="text-2xl font-bold">{patient.name}</h1>
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
