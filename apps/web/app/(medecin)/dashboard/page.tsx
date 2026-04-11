import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, gte, lte } from "drizzle-orm";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayAppts = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      reason: appointments.reason,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, session.user.id),
        gte(appointments.startsAt, todayStart),
        lte(appointments.startsAt, todayEnd),
      ),
    )
    .orderBy(appointments.startsAt);

  const upcomingAppts = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      reason: appointments.reason,
      patientName: patients.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, session.user.id),
        gte(appointments.startsAt, todayEnd),
        lte(appointments.startsAt, weekEnd),
      ),
    )
    .orderBy(appointments.startsAt)
    .limit(20);

  const monthNoShows = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, session.user.id),
        eq(appointments.status, "no_show"),
        gte(appointments.startsAt, monthStart),
      ),
    );

  const toConfirm = todayAppts.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenue, {session.user.name}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border">
          <div className="text-xs text-gray-500 uppercase">{"Aujourd'hui"}</div>
          <div className="text-3xl font-bold mt-1">{todayAppts.length}</div>
          <div className="text-xs text-gray-500 mt-1">rendez-vous</div>
        </div>
        <div className="bg-white rounded-xl p-5 border">
          <div className="text-xs text-gray-500 uppercase">À confirmer</div>
          <div className="text-3xl font-bold mt-1 text-orange-600">{toConfirm}</div>
          <div className="text-xs text-gray-500 mt-1">en attente</div>
        </div>
        <div className="bg-white rounded-xl p-5 border">
          <div className="text-xs text-gray-500 uppercase">No-shows ce mois</div>
          <div className="text-3xl font-bold mt-1 text-red-600">{monthNoShows.length}</div>
          <div className="text-xs text-gray-500 mt-1">manqués</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">{"RDV d'aujourd'hui"}</h2>
        </div>
        <div className="divide-y">
          {todayAppts.length === 0 ? (
            <p className="p-6 text-gray-400 text-center text-sm">
              {"Aucun rendez-vous aujourd'hui"}
            </p>
          ) : (
            todayAppts.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {format(a.startsAt, "HH:mm")} — {a.patientName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {a.patientPhone}
                    {a.reason ? ` · ${a.reason}` : ""}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Prochains RDV (7 jours)</h2>
          <Link href="/rendez-vous" className="text-sm text-blue-600 hover:underline">
            Tout voir →
          </Link>
        </div>
        <div className="divide-y">
          {upcomingAppts.length === 0 ? (
            <p className="p-6 text-gray-400 text-center text-sm">
              Aucun rendez-vous à venir
            </p>
          ) : (
            upcomingAppts.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {format(a.startsAt, "EEE d MMM HH:mm", { locale: fr })} — {a.patientName}
                  </div>
                  {a.reason && <div className="text-sm text-gray-500">{a.reason}</div>}
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-orange-100 text-orange-700",
    confirmed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
    completed: "bg-blue-100 text-blue-700",
    no_show: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    pending: "À confirmer",
    confirmed: "Confirmé",
    cancelled: "Annulé",
    completed: "Terminé",
    no_show: "Absent",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded ${styles[status] ?? "bg-gray-100"}`}>
      {labels[status] ?? status}
    </span>
  );
}
