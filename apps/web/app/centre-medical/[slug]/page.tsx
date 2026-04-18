import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { db, clinics, clinicDoctors, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  BadgeCheck,
  Users,
} from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);

  if (!clinic) {
    return { title: "Centre médical introuvable" };
  }

  return {
    title: `${clinic.name} — Centre médical à ${clinic.city} | Doktori`,
    description: `Prenez rendez-vous avec les médecins du ${clinic.name} à ${clinic.city}. Consultez les spécialités disponibles et réservez en ligne.`,
    openGraph: {
      title: clinic.name,
      description: `Centre médical à ${clinic.city} — Réservation en ligne`,
      images: clinic.logoUrl ? [clinic.logoUrl] : [],
    },
  };
}

export default async function CentreMedicalPage({ params }: Props) {
  const { slug } = await params;

  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);

  if (!clinic) notFound();

  // Fetch all doctors in the clinic via join
  const clinicDoctorRows = await db
    .select({
      doctorId: clinicDoctors.doctorId,
      role: clinicDoctors.role,
    })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const doctorIds = clinicDoctorRows.map((r) => r.doctorId);
  const roleByDoctorId = Object.fromEntries(
    clinicDoctorRows.map((r) => [r.doctorId, r.role])
  );

  // Fetch doctor details for all doctors in this clinic
  const allDoctorsInClinic =
    doctorIds.length > 0
      ? await db
          .select({
            id: doctors.id,
            name: doctors.name,
            slug: doctors.slug,
            specialty: doctors.specialty,
            city: doctors.city,
            address: doctors.address,
            photoUrl: doctors.photoUrl,
          })
          .from(doctors)
          .innerJoin(clinicDoctors, eq(clinicDoctors.doctorId, doctors.id))
          .where(eq(clinicDoctors.clinicId, clinic.id))
      : [];

  const cityLabel = CITIES.find((c) => c.id === clinic.city)?.label ?? clinic.city;

  return (
    <div className="min-h-screen bg-[#F8FFFE]">
      {/* ─── Header ─── */}
      <div className="bg-gradient-to-br from-[#134E4A] via-[#0E7490] to-[#0891B2]">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="flex items-start gap-6">
            {/* Logo / icon */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-2 ring-white/30">
              {clinic.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clinic.logoUrl}
                  alt={clinic.name}
                  className="h-14 w-14 rounded-xl object-contain"
                />
              ) : (
                <Building2 className="h-10 w-10 text-white" strokeWidth={1.5} />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#22D3EE]">
                <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                Centre médical agréé
              </div>
              <h1 className="font-heading text-3xl font-black text-white sm:text-4xl">
                {clinic.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#A7F3D0]">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {clinic.address}, {cityLabel}
                </span>
                {clinic.phone && (
                  <a
                    href={`tel:${clinic.phone}`}
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Phone className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {clinic.phone}
                  </a>
                )}
                {clinic.email && (
                  <a
                    href={`mailto:${clinic.email}`}
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Mail className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {clinic.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Doctors section */}
        <div className="mb-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0891B2]/10 text-[#0891B2]">
              <Users className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-heading text-xl font-black text-[#134E4A]">
                Nos médecins
              </h2>
              <p className="text-sm text-[#5E7574]">
                {allDoctorsInClinic.length} praticien
                {allDoctorsInClinic.length !== 1 ? "s" : ""} disponible
                {allDoctorsInClinic.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {allDoctorsInClinic.length === 0 ? (
            <div className="rounded-2xl border border-[#E6F4F1] bg-white p-10 text-center">
              <Building2 className="mx-auto h-10 w-10 text-[#5E7574]/40" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-[#5E7574]">
                Aucun médecin associé pour le moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allDoctorsInClinic.map((doctor) => {
                const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
                const role = roleByDoctorId[doctor.id];
                const initials = doctor.name
                  .replace(/^Dr\.?\s*/i, "")
                  .split(" ")
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={doctor.id}
                    className="group relative overflow-hidden rounded-2xl border border-[#E6F4F1] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#0891B2]/40 hover:shadow-lg hover:shadow-[#0891B2]/8"
                  >
                    {/* Role badge */}
                    {role === "admin" && (
                      <div className="absolute right-3 top-3 rounded-full bg-[#0891B2]/10 px-2 py-0.5 text-[10px] font-bold text-[#0891B2]">
                        Responsable
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {doctor.photoUrl ? (
                          <div className="h-14 w-14 overflow-hidden rounded-xl ring-1 ring-[#E6F4F1]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={doctor.photoUrl}
                              alt={doctor.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0891B2] font-heading text-sm font-black text-white">
                            {initials}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white">
                          <BadgeCheck className="h-4 w-4 fill-[#22C55E] text-white" strokeWidth={2.5} />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm font-bold text-[#134E4A] truncate">
                          {doctor.name}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-[#0891B2]">
                          {spec?.label ?? doctor.specialty}
                        </p>
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/medecin/${doctor.slug}`}
                      className="mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#0891B2] text-xs font-bold text-white transition-all hover:bg-[#0E7490] group-hover:gap-2"
                    >
                      Prendre rendez-vous
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Address / map placeholder */}
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-6">
          <h3 className="mb-4 font-heading text-base font-bold text-[#134E4A]">
            Localisation
          </h3>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0891B2]">
              <MapPin className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="font-semibold text-[#134E4A]">{clinic.name}</p>
              <p className="mt-0.5 text-sm text-[#5E7574]">
                {clinic.address}
              </p>
              <p className="text-sm text-[#5E7574]">{cityLabel}, Tunisie</p>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(`${clinic.name} ${clinic.address} ${cityLabel} Tunisie`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#0891B2] hover:underline"
              >
                Voir sur Google Maps
                <ArrowRight className="h-3 w-3" strokeWidth={3} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
