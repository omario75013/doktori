import { notFound } from "next/navigation";
import Link from "next/link";
import {
  db,
  patients,
  patientMedicalProfile,
  patientDependents,
  appointments,
  reviews,
  doctors,
} from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft, Ban, CheckCircle2 } from "lucide-react";
import { PatientDetailTabs } from "./detail-tabs";

export const dynamic = "force-dynamic";

export default async function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [patient] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  if (!patient) notFound();

  const [medProfile, dependentsList, recentAppointments, patientReviews] = await Promise.all([
    db
      .select()
      .from(patientMedicalProfile)
      .where(eq(patientMedicalProfile.patientId, id))
      .limit(1),
    db
      .select()
      .from(patientDependents)
      .where(eq(patientDependents.patientId, id))
      .orderBy(desc(patientDependents.createdAt)),
    db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        status: appointments.status,
        type: appointments.type,
        doctorName: doctors.name,
        doctorSpecialty: doctors.specialty,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(eq(appointments.patientId, id))
      .orderBy(desc(appointments.startsAt))
      .limit(20),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        status: reviews.status,
        createdAt: reviews.createdAt,
        doctorName: doctors.name,
      })
      .from(reviews)
      .innerJoin(doctors, eq(reviews.doctorId, doctors.id))
      .where(eq(reviews.patientId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(20),
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link
        href="/admin/patients"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux patients
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
              <p className="text-sm text-slate-500">{patient.phone}</p>
              {patient.email && (
                <p className="text-sm text-slate-500">{patient.email}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {patient.isSuspended ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                    <Ban className="w-3 h-3" />
                    Suspendu
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Actif
                  </span>
                )}
                {patient.noShowCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                    {patient.noShowCount} no-show{patient.noShowCount > 1 ? "s" : ""}
                  </span>
                )}
                {patient.lastMinuteCancelCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                    {patient.lastMinuteCancelCount} annulation{patient.lastMinuteCancelCount > 1 ? "s" : ""} tardive{patient.lastMinuteCancelCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PatientDetailTabs
        patient={{
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
          email: patient.email ?? null,
          dateOfBirth: patient.dateOfBirth ?? null,
          gender: patient.gender ?? null,
          bloodType: patient.bloodType ?? null,
          cnamNumber: patient.cnamNumber ?? null,
          noShowCount: patient.noShowCount,
          lastMinuteCancelCount: patient.lastMinuteCancelCount,
          isSuspended: patient.isSuspended,
          suspensionReason: patient.suspensionReason ?? null,
          suspendedAt: patient.suspendedAt?.toISOString() ?? null,
        }}
        medicalProfile={
          medProfile[0]
            ? {
                allergies: medProfile[0].allergies ?? null,
                chronicConditions: medProfile[0].chronicConditions ?? null,
                currentMeds: medProfile[0].currentMeds ?? null,
                notes: medProfile[0].notes ?? null,
              }
            : null
        }
        dependents={dependentsList.map((d) => ({
          id: d.id,
          name: d.name,
          dateOfBirth: d.dateOfBirth ?? null,
          gender: d.gender ?? null,
          relation: d.relation ?? null,
          createdAt: d.createdAt.toISOString(),
        }))}
        appointments={recentAppointments.map((a) => ({
          id: a.id,
          startsAt: a.startsAt.toISOString(),
          status: a.status,
          type: a.type,
          doctorName: a.doctorName,
          doctorSpecialty: a.doctorSpecialty,
        }))}
        reviews={patientReviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment ?? null,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          doctorName: r.doctorName,
        }))}
      />
    </div>
  );
}
