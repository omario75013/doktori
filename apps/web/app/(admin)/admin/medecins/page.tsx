import { db, doctors, appointments, reviews } from "@doktori/db";
import { desc, eq, count, avg, sql } from "drizzle-orm";
import { DoctorsTable } from "./doctors-table";

export const dynamic = "force-dynamic";

export default async function AdminDoctorsPage() {
  const list = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      email: doctors.email,
      phone: doctors.phone,
      specialty: doctors.specialty,
      city: doctors.city,
      isActive: doctors.isActive,
      createdAt: doctors.createdAt,
      yearsOfExperience: doctors.yearsOfExperience,
      consultationFee: doctors.consultationFee,
      consultationMode: doctors.consultationMode,
      apptCount: sql<number>`(select count(*) from ${appointments} where ${appointments.doctorId} = ${doctors.id})::int`,
      reviewCount: sql<number>`(select count(*) from ${reviews} where ${reviews.doctorId} = ${doctors.id})::int`,
      avgRating: sql<number | null>`(select avg(${reviews.rating}) from ${reviews} where ${reviews.doctorId} = ${doctors.id})`,
    })
    .from(doctors)
    .orderBy(desc(doctors.createdAt));

  // Unique specialties and cities for filters
  const specialties = Array.from(new Set(list.map((d) => d.specialty))).sort();
  const cities = Array.from(new Set(list.map((d) => d.city))).sort();

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Médecins</h1>
        <p className="text-slate-500 mt-1">
          {list.length} médecin{list.length > 1 ? "s" : ""} sur la plateforme
        </p>
      </div>
      <DoctorsTable
        doctors={list.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
          apptCount: Number(d.apptCount ?? 0),
          reviewCount: Number(d.reviewCount ?? 0),
          avgRating: d.avgRating ? Number(d.avgRating) : null,
          yearsOfExperience: d.yearsOfExperience,
          consultationFee: d.consultationFee,
          consultationMode: d.consultationMode,
        }))}
        specialties={specialties}
        cities={cities}
      />
    </div>
  );
}
