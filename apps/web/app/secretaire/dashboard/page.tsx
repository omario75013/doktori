"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  Users,
  CalendarPlus,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
  patientPhone: string;
  patientId: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-teal-50 text-teal-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "À confirmer",
  confirmed: "Confirmé",
  cancelled: "Annulé",
  completed: "Terminé",
  no_show: "Absent",
};

function StatCard({
  label,
  value,
  iconColor,
  children,
}: {
  label: string;
  value: number;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "#F0FDFA" }}
        >
          <span style={{ color: iconColor }} className="flex items-center">
            {children}
          </span>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-3xl font-black text-foreground">{value}</div>
    </div>
  );
}

export default function SecretaireDashboardPage() {
  const { data: session, status } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/secretaire/appointments")
      .then((r) => {
        if (!r.ok) return r.json().then((d: { error: string }) => Promise.reject(d.error));
        return r.json() as Promise<Appointment[]>;
      })
      .then((data) => setAppointments(data))
      .catch((err: string) => setError(err ?? "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-7 w-56 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-40 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-border animate-pulse">
              <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500 text-sm">Erreur : {error}</div>
    );
  }

  const todayAppointments = appointments.filter((a) => isToday(new Date(a.startsAt)));
  const pendingCount = todayAppointments.filter((a) => a.status === "pending").length;
  const confirmedCount = todayAppointments.filter((a) => a.status === "confirmed").length;

  const todayStr = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">
          Bonjour, {session?.user?.name ?? "Secrétaire"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{todayStr}</p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/secretaire/rendez-vous"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: "#0891B2" }}
        >
          <CalendarPlus className="h-4 w-4" strokeWidth={2.5} />
          Nouveau RDV
        </Link>
        <Link
          href="/secretaire/patients"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border bg-white text-foreground hover:bg-secondary transition-colors"
        >
          <UserPlus className="h-4 w-4" strokeWidth={2.5} />
          Ajouter un patient
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="RDV aujourd'hui" value={todayAppointments.length} iconColor="#0891B2">
          <CalendarDays className="h-4 w-4" strokeWidth={2.5} />
        </StatCard>
        <StatCard label="À confirmer" value={pendingCount} iconColor="#D97706">
          <Clock className="h-4 w-4" strokeWidth={2.5} />
        </StatCard>
        <StatCard label="Confirmés" value={confirmedCount} iconColor="#059669">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
        </StatCard>
        <StatCard
          label="Absences"
          value={todayAppointments.filter((a) => a.status === "no_show").length}
          iconColor="#DC2626"
        >
          <AlertCircle className="h-4 w-4" strokeWidth={2.5} />
        </StatCard>
      </div>

      {/* Today's appointments */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            <h2 className="font-bold text-foreground">Rendez-vous du jour</h2>
          </div>
          <Link
            href="/secretaire/rendez-vous"
            className="text-xs font-medium hover:underline"
            style={{ color: "#0891B2" }}
          >
            Voir tout
          </Link>
        </div>

        {todayAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="font-medium text-sm">Aucun rendez-vous aujourd&apos;hui</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Le planning est libre pour cette journée.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {todayAppointments.map((appt) => (
              <div key={appt.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 text-white text-xs font-bold"
                    style={{ background: "#0891B2" }}
                  >
                    {format(new Date(appt.startsAt), "HH:mm")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">
                      {appt.patientName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {appt.patientPhone}
                      {appt.reason ? ` · ${appt.reason}` : ""}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${
                    STATUS_STYLES[appt.status] ?? "bg-gray-100"
                  }`}
                >
                  {STATUS_LABELS[appt.status] ?? appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick link to all patients */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: "#F0FDFA" }}
          >
            <Users className="h-5 w-5" style={{ color: "#0891B2" }} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Liste des patients</p>
            <p className="text-xs text-muted-foreground">Consulter et gérer les patients du médecin</p>
          </div>
        </div>
        <Link
          href="/secretaire/patients"
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-secondary transition-colors text-foreground"
        >
          Accéder
        </Link>
      </div>
    </div>
  );
}
