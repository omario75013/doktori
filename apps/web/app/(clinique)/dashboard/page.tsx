"use client";

import { useEffect, useState } from "react";

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
    slug: string;
    city: string;
    plan: string;
  };
  totalDoctors: number;
  totalAppointmentsThisMonth: number;
  perDoctor: DoctorStat[];
}

export default function CliniqueDashboardPage() {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read clinicId from URL on mount (avoids useSearchParams Suspense requirement)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setClinicId(params.get("id"));
  }, []);

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

  if (!clinicId) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg font-medium mb-2">Aucune clinique sélectionnée</p>
        <p className="text-sm">
          Ajoutez <code className="bg-gray-100 px-1 rounded">?id=&lt;clinicId&gt;</code> à l&apos;URL pour charger le tableau de bord.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">Chargement…</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500 text-sm">
        Erreur : {error}
      </div>
    );
  }

  if (!stats) return null;

  const { clinic, totalDoctors, totalAppointmentsThisMonth, perDoctor } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{clinic.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {clinic.city} · Plan <span className="capitalize">{clinic.plan}</span>
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border">
          <div className="text-xs text-gray-500 uppercase">Médecins</div>
          <div className="text-3xl font-bold mt-1">{totalDoctors}</div>
          <div className="text-xs text-gray-500 mt-1">dans la clinique</div>
        </div>
        <div className="bg-white rounded-xl p-5 border">
          <div className="text-xs text-gray-500 uppercase">RDV ce mois</div>
          <div className="text-3xl font-bold mt-1">{totalAppointmentsThisMonth}</div>
          <div className="text-xs text-gray-500 mt-1">total agrégé</div>
        </div>
      </div>

      {/* Per-doctor breakdown */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Répartition par médecin — mois en cours</h2>
        </div>
        <div className="divide-y">
          {perDoctor.length === 0 ? (
            <p className="p-6 text-gray-400 text-center text-sm">
              Aucun médecin associé à cette clinique
            </p>
          ) : (
            perDoctor.map((doc) => (
              <div key={doc.doctorId} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{doc.name}</div>
                  <div className="text-sm text-gray-500">
                    {doc.specialty}
                    {doc.role === "admin" && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{doc.appointmentsThisMonth}</div>
                  <div className="text-xs text-gray-500">RDV</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
