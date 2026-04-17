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
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Patients</h1>
          <p className="text-sm text-gray-500">
            {patientList.length} patient{patientList.length !== 1 ? "s" : ""} suivis
          </p>
        </div>
      </div>

      {patientList.length === 0 ? (
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-12 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-[#F0FDFA] flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-[#0891B2]" />
          </div>
          <p className="text-[#134E4A] font-medium mb-1">Aucun patient pour le moment</p>
          <p className="text-sm text-gray-400">Les patients apparaîtront ici après leurs premiers rendez-vous.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E6F4F1] bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6F4F1] bg-[#F0FDFA] text-left">
                <th className="px-4 py-3 font-medium text-[#134E4A]">Patient</th>
                <th className="px-4 py-3 font-medium text-[#134E4A]">Téléphone</th>
                <th className="px-4 py-3 font-medium text-[#134E4A]">Visites</th>
                <th className="px-4 py-3 font-medium text-[#134E4A]">Dernière visite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6F4F1]">
              {patientList.map((p) => (
                <tr key={p.id} className="hover:bg-[#F0FDFA] transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium text-[#0891B2] hover:text-[#0E7490] hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.phone}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#F0FDFA] text-[#0891B2] text-xs font-bold">
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
