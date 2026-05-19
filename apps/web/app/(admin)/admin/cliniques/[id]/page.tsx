import { notFound } from "next/navigation";
import Link from "next/link";
import { db, clinics, clinicDoctors, doctors, appointments } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { ArrowLeft, Building2 } from "lucide-react";
import { ClinicDetailClient } from "./clinic-detail-client";
import { SubscriptionPanel } from "@/components/admin/subscription-panel";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";

export const dynamic = "force-dynamic";

export default async function AdminClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id)).limit(1);
  if (!clinic) notFound();

  const clinicDoctorRows = await db
    .select({
      id: clinicDoctors.id,
      role: clinicDoctors.role,
      createdAt: clinicDoctors.createdAt,
      doctorId: doctors.id,
      doctorName: doctors.name,
      doctorEmail: doctors.email,
      doctorSpecialty: doctors.specialty,
    })
    .from(clinicDoctors)
    .innerJoin(doctors, eq(clinicDoctors.doctorId, doctors.id))
    .where(eq(clinicDoctors.clinicId, id));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [{ apptCount }] = await db
    .select({ apptCount: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      sql`${appointments.doctorId} IN (
        SELECT doctor_id FROM clinic_doctors WHERE clinic_id = ${id}
      ) AND ${appointments.startsAt} >= ${monthStart}`
    );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link
        href="/admin/cliniques"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux cliniques
      </Link>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          {clinic.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinic.logoUrl}
              alt={clinic.name}
              className="w-20 h-20 rounded-xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center">
              <Building2 className="w-10 h-10" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{clinic.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5 capitalize">
              {clinic.city} · {clinic.address}
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
              <span>{clinic.phone}</span>
              <span>{clinic.email}</span>
              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full capitalize">
                Plan {clinic.plan}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">{Number(apptCount ?? 0)}</div>
            <div className="text-xs text-slate-500">RDV ce mois</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SubscriptionPanel actorType="clinic" actorId={id} />
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-slate-900">Sécurité</h3>
          <ResetPasswordButton
            actorType="clinic"
            actorId={id}
            actorName={clinic.name}
            variant="button"
          />
        </div>
      </div>

      <ClinicDetailClient
        clinicId={id}
        initialDoctors={clinicDoctorRows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
