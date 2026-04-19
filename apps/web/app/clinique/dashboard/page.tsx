"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Users, CalendarCheck, UserX } from "lucide-react";

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

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-border animate-pulse">
      <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-24 bg-gray-100 rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="p-4 flex items-center justify-between animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-36 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
      </div>
      <div className="h-8 w-10 bg-gray-200 rounded" />
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function CliniqueDashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clinicId = session?.user?.id ?? null;

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

  // Session still loading
  if (status === "loading" || (status === "authenticated" && loading && !stats)) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-7 w-56 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-40 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="bg-white rounded-2xl border">
          <div className="p-4 border-b animate-pulse">
            <div className="h-4 w-64 bg-gray-200 rounded" />
          </div>
          {[1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">{clinic.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {clinic.city} · Plan{" "}
          <span className="capitalize font-medium">{clinic.plan}</span>
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#F0FDFA" }}>
              <Users className="h-4 w-4" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Médecins
            </span>
          </div>
          <div className="text-3xl font-black text-foreground">{totalDoctors}</div>
          <div className="text-xs text-muted-foreground mt-1">dans la clinique</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#F0FDFA" }}>
              <CalendarCheck className="h-4 w-4" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              RDV ce mois
            </span>
          </div>
          <div className="text-3xl font-black text-foreground">{totalAppointmentsThisMonth}</div>
          <div className="text-xs text-muted-foreground mt-1">total agrégé</div>
        </div>
      </div>

      {/* Per-doctor breakdown */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-foreground">
            Répartition par médecin — mois en cours
          </h2>
        </div>
        <div className="divide-y divide-border">
          {perDoctor.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <UserX className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
              <p className="font-medium text-sm">Aucun médecin associé</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Ajoutez des médecins dans les Paramètres.
              </p>
            </div>
          ) : (
            perDoctor.map((doc) => (
              <div key={doc.doctorId} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground">{doc.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{doc.specialty}</span>
                    {doc.role === "admin" && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "#E0F2FE", color: "#0891B2" }}>
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-foreground">
                    {doc.appointmentsThisMonth}
                  </div>
                  <div className="text-xs text-muted-foreground">RDV</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
