import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-sm text-gray-500 mt-1">
          {patientList.length} patient{patientList.length !== 1 ? "s" : ""}
        </p>
      </div>

      {patientList.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucun patient pour le moment.</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="px-4 py-3 font-medium text-gray-600">Téléphone</th>
                <th className="px-4 py-3 font-medium text-gray-600">Visites</th>
                <th className="px-4 py-3 font-medium text-gray-600">Dernière visite</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {patientList.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.phone}</td>
                  <td className="px-4 py-3 text-gray-700">{p.total_visits}</td>
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
