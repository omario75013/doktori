import { db, doctors, patients, appointments } from "@doktori/db";
import { count, eq, gte, and, sql } from "drizzle-orm";
import {
  Stethoscope,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getKpis() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    [{ total: totalDoctors }],
    [{ total: activeDoctors }],
    [{ total: pendingDoctors }],
    [{ total: totalPatients }],
    [{ total: bookingsToday }],
    [{ total: bookings7d }],
    topSpecialties,
  ] = await Promise.all([
    db.select({ total: count() }).from(doctors),
    db.select({ total: count() }).from(doctors).where(eq(doctors.isActive, true)),
    db.select({ total: count() }).from(doctors).where(eq(doctors.isActive, false)),
    db.select({ total: count() }).from(patients),
    db
      .select({ total: count() })
      .from(appointments)
      .where(gte(appointments.startsAt, startOfToday)),
    db
      .select({ total: count() })
      .from(appointments)
      .where(
        and(
          gte(appointments.createdAt, weekAgo),
          sql`${appointments.status} != 'cancelled'`
        )
      ),
    db
      .select({
        specialty: doctors.specialty,
        total: count(),
      })
      .from(doctors)
      .where(eq(doctors.isActive, true))
      .groupBy(doctors.specialty)
      .orderBy(sql`count(*) desc`)
      .limit(5),
  ]);

  return {
    totalDoctors,
    activeDoctors,
    pendingDoctors,
    totalPatients,
    bookingsToday,
    bookings7d,
    topSpecialties,
  };
}

export default async function AdminDashboardPage() {
  const k = await getKpis();

  const cards = [
    {
      label: "Médecins total",
      value: k.totalDoctors,
      icon: Stethoscope,
      accent: "from-teal-500 to-teal-600",
    },
    {
      label: "Médecins actifs",
      value: k.activeDoctors,
      icon: CheckCircle2,
      accent: "from-green-500 to-green-600",
    },
    {
      label: "En attente",
      value: k.pendingDoctors,
      icon: Clock,
      accent: "from-amber-500 to-amber-600",
    },
    {
      label: "Patients inscrits",
      value: k.totalPatients,
      icon: Users,
      accent: "from-blue-500 to-blue-600",
    },
    {
      label: "RDV aujourd'hui",
      value: k.bookingsToday,
      icon: Calendar,
      accent: "from-purple-500 to-purple-600",
    },
    {
      label: "Réservations 7j",
      value: k.bookings7d,
      icon: TrendingUp,
      accent: "from-pink-500 to-pink-600",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-500 mt-1">Vue d&apos;ensemble de la plateforme</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">{c.label}</p>
                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.accent} flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Top spécialités
        </h2>
        <div className="space-y-3">
          {k.topSpecialties.map((s) => (
            <div key={s.specialty} className="flex items-center gap-3">
              <div className="w-32 text-sm text-slate-700 capitalize">
                {s.specialty}
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-600"
                  style={{
                    width: `${(Number(s.total) / Number(k.topSpecialties[0]?.total ?? 1)) * 100}%`,
                  }}
                />
              </div>
              <div className="w-12 text-sm text-slate-600 text-right">{s.total}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
