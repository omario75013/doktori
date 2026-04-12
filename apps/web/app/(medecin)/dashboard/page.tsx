import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const doctorId = session.user.id;
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
      type: appointments.type,
      reason: appointments.reason,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, doctorId),
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
      type: appointments.type,
      reason: appointments.reason,
      patientName: patients.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, doctorId),
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
        eq(appointments.doctorId, doctorId),
        eq(appointments.status, "no_show"),
        gte(appointments.startsAt, monthStart),
      ),
    );

  const toConfirm = todayAppts.filter((a) => a.status === "pending").length;

  // Fetch doctor consultation mode + teleconsult stats using raw SQL (new columns)
  const [doctorRow, teleconsultCountRow, walletRow] = await Promise.all([
    db.execute(
      sql`SELECT consultation_mode FROM doctors WHERE id = ${doctorId} LIMIT 1`
    ),
    db.execute(
      sql`SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ${doctorId} AND type = 'teleconsult' AND starts_at >= ${monthStart}`
    ),
    db.execute(
      sql`SELECT balance FROM doctor_wallets WHERE doctor_id = ${doctorId} LIMIT 1`
    ),
  ]);

  const consultationMode =
    ((doctorRow as unknown as Array<{ consultation_mode: string | null }>)[0])
      ?.consultation_mode ?? "cabinet";

  const teleconsultCount = Number(
    ((teleconsultCountRow as unknown as Array<{ count: string }>)[0])?.count ?? 0
  );

  const walletBalance = Number(
    ((walletRow as unknown as Array<{ balance: number | null }>)[0])?.balance ?? 0
  );

  const hasTeleconsult = consultationMode === "teleconsult" || consultationMode === "both";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenue, {session.user.name}</p>
      </div>

      <div className={`grid gap-4 ${hasTeleconsult ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3"}`}>
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
        {hasTeleconsult && (
          <div className="bg-white rounded-xl p-5 border border-purple-100">
            <div className="text-xs text-purple-600 uppercase">Téléconsultations ce mois</div>
            <div className="text-3xl font-bold mt-1 text-purple-700">{teleconsultCount}</div>
            <div className="text-xs text-gray-500 mt-1">vidéo</div>
          </div>
        )}
      </div>

      {hasTeleconsult && (
        <div className="bg-white rounded-xl border border-purple-100 p-5">
          <Link href="/wallet" className="flex items-center justify-between group">
            <div>
              <div className="text-xs text-purple-600 uppercase">Solde disponible</div>
              <div className="text-3xl font-bold mt-1 text-purple-700">
                {(walletBalance / 1000).toFixed(3)} DT
              </div>
              <div className="text-xs text-gray-500 mt-1">portefeuille</div>
            </div>
            <span className="text-purple-500 text-sm group-hover:underline">
              Voir le portefeuille →
            </span>
          </Link>
        </div>
      )}

      {consultationMode === "cabinet" && (
        <div className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 rounded-lg p-2.5 shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                Vous exercez depuis l&apos;étranger&nbsp;?
              </h3>
              <p className="text-white/80 text-sm mt-1 max-w-md">
                Activez la téléconsultation pour recevoir des patients en vidéo. Doktori
                gère les paiements et vous reverse 85% du tarif.
              </p>
            </div>
          </div>
          <Link
            href="/teleconsultation"
            className="shrink-0 bg-white text-purple-700 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            Activer la téléconsultation →
          </Link>
        </div>
      )}

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
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    {format(a.startsAt, "HH:mm")} — {a.patientName}
                    <TypeBadge type={a.type} mode={consultationMode} appointmentId={a.id} />
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
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    {format(a.startsAt, "EEE d MMM HH:mm", { locale: fr })} — {a.patientName}
                    <TypeBadge type={a.type} mode={consultationMode} appointmentId={a.id} />
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

function TypeBadge({
  type,
  mode,
  appointmentId,
}: {
  type: string;
  mode: string;
  appointmentId: string;
}) {
  if (type === "teleconsult") {
    return (
      <Link
        href={`/teleconsult-medecin/${appointmentId}`}
        className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
      >
        Vidéo
      </Link>
    );
  }
  if (mode === "both") {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
        Cabinet
      </span>
    );
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-orange-100 text-orange-700",
    confirmed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
    completed: "bg-blue-100 text-blue-700",
    no_show: "bg-red-100 text-red-700",
    doctor_noshow: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    pending: "À confirmer",
    confirmed: "Confirmé",
    cancelled: "Annulé",
    completed: "Terminé",
    no_show: "Absent",
    doctor_noshow: "Médecin absent",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded ${styles[status] ?? "bg-gray-100"}`}>
      {labels[status] ?? status}
    </span>
  );
}
