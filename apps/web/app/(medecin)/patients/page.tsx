import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users } from "lucide-react";

type PatientRow = {
  id: string;
  name: string;
  phone: string;
  total_visits: number;
  last_visit: string;
};

export default async function PatientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const result = await db.execute(sql`
    SELECT p.id, p.name, p.phone,
           COUNT(a.id)::int AS total_visits,
           MAX(a.starts_at) AS last_visit
    FROM patients p
    INNER JOIN appointments a ON a.patient_id = p.id
    WHERE a.doctor_id = ${session.user.id}
    GROUP BY p.id, p.name, p.phone
    ORDER BY last_visit DESC
    LIMIT 100
  `);

  const patientList = result as unknown as PatientRow[];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-gray-500">
            {patientList.length} patient{patientList.length !== 1 ? "s" : ""} suivis
          </p>
        </div>
      </div>

      {patientList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">Aucun patient pour le moment</p>
          <p className="text-sm text-gray-400">Les patients apparaîtront ici après leurs premiers rendez-vous.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-left">
                <th className="px-4 py-3 font-medium text-foreground">Patient</th>
                <th className="px-4 py-3 font-medium text-foreground">Téléphone</th>
                <th className="px-4 py-3 font-medium text-foreground">Visites</th>
                <th className="px-4 py-3 font-medium text-foreground">Dernière visite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {patientList.map((p) => (
                <tr key={p.id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium text-primary hover:text-doktori-teal-dark hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.phone}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-secondary text-primary text-xs font-bold">
                      {p.total_visits}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {format(new Date(p.last_visit), "d MMM yyyy", { locale: fr })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
