import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { PatientsClient } from "./patients-client";

type PatientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  cin: string | null;
  cnam_number: string | null;
  insurance_provider: string | null;
  occupation: string | null;
  total_visits: number;
  last_visit: string;
};

// ---------------------------------------------------------------------------
// Skeleton shown while the server fetches patient data
// ---------------------------------------------------------------------------
function PatientsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-gray-100 animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-28 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-4 w-20 rounded-md bg-gray-100 animate-pulse" />
        </div>
      </div>

      {/* Search bar skeleton */}
      <div className="h-10 w-full rounded-2xl bg-gray-100 animate-pulse" />

      {/* Table skeleton */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="border-b border-border bg-secondary px-4 py-3 grid grid-cols-4 gap-4">
          {["Patient", "Téléphone", "Visites", "Dernière visite"].map((col) => (
            <div key={col} className="h-4 w-20 rounded-md bg-gray-200 animate-pulse" />
          ))}
        </div>
        {/* Skeleton rows */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-border last:border-0 px-4 py-3 grid grid-cols-4 gap-4 items-center"
          >
            <div className="h-4 w-32 rounded-md bg-gray-100 animate-pulse" />
            <div className="h-4 w-24 rounded-md bg-gray-100 animate-pulse" />
            <div className="h-6 w-6 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-4 w-24 rounded-md bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Async component that fetches and renders data
// ---------------------------------------------------------------------------
async function PatientsData() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const result = await db.execute(sql`
    SELECT p.id, p.name, p.phone, p.email,
           p.date_of_birth, p.gender, p.blood_type,
           p.cin, p.cnam_number, p.insurance_provider, p.occupation,
           COUNT(a.id)::int AS total_visits,
           MAX(a.starts_at) AS last_visit
    FROM patients p
    INNER JOIN appointments a ON a.patient_id = p.id
    WHERE a.doctor_id = ${session.user.id}
      AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.phone, p.email,
             p.date_of_birth, p.gender, p.blood_type,
             p.cin, p.cnam_number, p.insurance_provider, p.occupation
    ORDER BY last_visit DESC
    LIMIT 500
  `);

  const patientList = result as unknown as PatientRow[];

  return <PatientsClient patients={patientList} />;
}

// ---------------------------------------------------------------------------
// Page entry point
// ---------------------------------------------------------------------------
export default function PatientsPage() {
  return (
    <Suspense fallback={<PatientsSkeleton />}>
      <PatientsData />
    </Suspense>
  );
}
