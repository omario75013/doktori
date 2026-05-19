import { notFound } from "next/navigation";
import Link from "next/link";
import {
  db,
  doctors,
  appointments,
  reviews,
  adminAuditLogs,
  appointmentTypes,
  doctorInsurance,
  doctorHomeVisitSettings,
  subscriptions,
  doctorPremium,
} from "@doktori/db";
import { eq, desc, and, count, avg } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { DoctorDetailTabs } from "./detail-tabs";
import { SubscriptionPanel } from "@/components/admin/subscription-panel";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";

export const dynamic = "force-dynamic";

export default async function AdminDoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
  if (!doctor) notFound();

  const [
    [{ apptCount }],
    [{ reviewCount, avgRating }],
    recentAppointments,
    recentReviews,
    auditTrail,
    apptTypes,
    insuranceRows,
    [homeVisitRow],
    activeSubscription,
    [premiumRow],
  ] = await Promise.all([
    db
      .select({ apptCount: count() })
      .from(appointments)
      .where(eq(appointments.doctorId, id)),
    db
      .select({ reviewCount: count(), avgRating: avg(reviews.rating) })
      .from(reviews)
      .where(eq(reviews.doctorId, id)),
    db
      .select()
      .from(appointments)
      .where(eq(appointments.doctorId, id))
      .orderBy(desc(appointments.startsAt))
      .limit(20),
    db
      .select()
      .from(reviews)
      .where(eq(reviews.doctorId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(20),
    db
      .select()
      .from(adminAuditLogs)
      .where(
        and(
          eq(adminAuditLogs.resourceType, "doctors"),
          eq(adminAuditLogs.resourceId, id)
        )
      )
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(50),
    db
      .select()
      .from(appointmentTypes)
      .where(eq(appointmentTypes.doctorId, id))
      .orderBy(appointmentTypes.createdAt),
    db
      .select()
      .from(doctorInsurance)
      .where(eq(doctorInsurance.doctorId, id)),
    db
      .select()
      .from(doctorHomeVisitSettings)
      .where(eq(doctorHomeVisitSettings.doctorId, id))
      .limit(1),
    db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.doctorId, id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1),
    db
      .select()
      .from(doctorPremium)
      .where(eq(doctorPremium.doctorId, id))
      .limit(1),
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link
        href="/admin/medecins"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux médecins
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {doctor.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doctor.photoUrl}
                alt={doctor.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center text-2xl font-bold">
                {doctor.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{doctor.name}</h1>
              <p className="text-sm text-slate-500 capitalize">
                {doctor.specialty} · {doctor.city}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {doctor.isActive ? (
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    Actif
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                    En attente
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {Number(apptCount)} RDV · {Number(reviewCount)} avis
                  {avgRating ? ` · ${Number(avgRating).toFixed(1)}★` : ""}
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/medecin/${doctor.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Profil public
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SubscriptionPanel actorType="doctor" actorId={doctor.id} />
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-slate-900">Sécurité</h3>
          <ResetPasswordButton
            actorType="doctor"
            actorId={doctor.id}
            actorName={doctor.name}
            variant="button"
          />
        </div>
      </div>

      <DoctorDetailTabs
        doctor={{
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          phone: doctor.phone,
          specialty: doctor.specialty,
          city: doctor.city,
          address: doctor.address,
          bio: doctor.bio,
          consultationFee: doctor.consultationFee,
          yearsOfExperience: doctor.yearsOfExperience,
          isActive: doctor.isActive,
          educations: doctor.educations as object[],
          experiences: doctor.experiences as object[],
          languages: doctor.languages as string[],
          expertise: doctor.expertise as string[],
        }}
        appointments={recentAppointments.map((a) => ({
          id: a.id,
          startsAt: a.startsAt.toISOString(),
          status: a.status,
          patientId: a.patientId,
        }))}
        reviews={recentReviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        }))}
        audit={auditTrail.map((a) => ({
          id: a.id,
          action: a.action,
          actorEmail: a.actorEmail,
          createdAt: a.createdAt.toISOString(),
          reason: a.reason,
        }))}
        appointmentTypes={apptTypes.map((t) => ({
          id: t.id,
          name: t.name,
          durationMinutes: t.durationMinutes,
          fee: t.fee,
          mode: t.mode,
          isActive: t.isActive,
          isDefault: t.isDefault,
        }))}
        insurance={insuranceRows.map((i) => ({
          id: i.id,
          insuranceType: i.insuranceType,
          isConventioned: i.isConventioned,
        }))}
        homeVisit={
          homeVisitRow
            ? {
                isAvailable: homeVisitRow.isAvailable,
                radiusKm: homeVisitRow.radiusKm,
                fee: homeVisitRow.fee,
              }
            : null
        }
        subscription={
          activeSubscription[0]
            ? {
                id: activeSubscription[0].id,
                plan: activeSubscription[0].plan,
                status: activeSubscription[0].status,
                startsAt: activeSubscription[0].startsAt?.toISOString() ?? null,
                endsAt: activeSubscription[0].endsAt?.toISOString() ?? null,
                billingCycle: activeSubscription[0].billingCycle,
                priceMillimes: activeSubscription[0].priceMillimes,
              }
            : null
        }
        premium={
          premiumRow
            ? {
                id: premiumRow.id,
                isActive: premiumRow.isActive,
                until: premiumRow.until?.toISOString() ?? null,
              }
            : null
        }
      />
    </div>
  );
}
