"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface DoctorStat {
  doctorId: string;
  name: string;
  specialty: string;
  role: string;
  appointmentsThisMonth: number;
}

interface ClinicStats {
  clinic: {
    id: string;
    name: string;
    city: string;
  };
  totalDoctors: number;
  perDoctor: DoctorStat[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  member: "Membre",
};

export default function CliniqueMedecinsPage() {
  const { data: session } = useSession();
  const clinicId = session?.user?.id ?? null;
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/clinics/stats?id=${encodeURIComponent(clinicId)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d: { error: string }) => Promise.reject(d.error));
        return res.json() as Promise<ClinicStats>;
      })
      .then((data) => setStats(data))
      .catch((err: string) => setError(err ?? "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400 text-sm">Chargement…</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500 text-sm">Erreur : {error}</div>
    );
  }

  if (!stats) return null;

  const { clinic, totalDoctors, perDoctor } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Médecins — {clinic.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {totalDoctors} médecin{totalDoctors !== 1 ? "s" : ""} associé{totalDoctors !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Spécialité</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rôle</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">RDV ce mois</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {perDoctor.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Aucun médecin associé à cette clinique
                </td>
              </tr>
            ) : (
              perDoctor.map((doc) => (
                <tr key={doc.doctorId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{doc.name}</td>
                  <td className="px-4 py-3 text-gray-600">{doc.specialty}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        doc.role === "admin"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {ROLE_LABELS[doc.role] ?? doc.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {doc.appointmentsThisMonth}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
