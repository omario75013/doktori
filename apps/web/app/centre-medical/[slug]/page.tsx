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
  CalendarClock,
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

  // Count doctors in clinic for description
  const clinicDoctorCount = await db
    .select({ count: clinicDoctors.id })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));
  const doctorCount = clinicDoctorCount.length;

  const cityLabel = CITIES.find((c) => c.id === clinic.city)?.label ?? clinic.city;

  return {
    title: `${clinic.name} — Centre médical à ${cityLabel} | Doktori`,
    description: `Prenez rendez-vous au ${clinic.name} à ${cityLabel}. ${doctorCount} médecins disponibles. Réservation en ligne sur Doktori.`,
    alternates: {
      canonical: `https://doktori.tn/centre-medical/${slug}`,
    },
    openGraph: {
      title: clinic.name,
      description: `Centre médical à ${cityLabel} — ${doctorCount} praticiens`,
      url: `https://doktori.tn/centre-medical/${clinic.slug}`,
      siteName: "Doktori",
      type: "website",
      images: clinic.logoUrl ? [{ url: clinic.logoUrl }] : [],
    },
    twitter: {
      card: "summary",
      title: `${clinic.name} — Centre médical à ${cityLabel}`,
      description: `${doctorCount} médecins disponibles — Doktori`,
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

  const clinicJsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: clinic.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: clinic.address,
      addressLocality: cityLabel,
      addressCountry: "TN",
    },
    telephone: clinic.phone,
    email: clinic.email,
    url: `https://doktori.tn/centre-medical/${clinic.slug}`,
    ...(clinic.logoUrl && { logo: clinic.logoUrl }),
    department: allDoctorsInClinic.map((d) => ({
      "@type": "Physician",
      name: d.name,
      medicalSpecialty:
        SPECIALTIES.find((s) => s.id === d.specialty)?.label ?? d.specialty,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(clinicJsonLd) }}
      />
    <div className="min-h-screen bg-[#F8FFFE]">
      {/* ─── Header ─── */}
      <div className="bg-gradient-to-br from-foreground via-doktori-teal-dark to-primary">
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
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-doktori-teal-light">
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
        {/* ─── "Premier créneau disponible" CTA ─── */}
        {allDoctorsInClinic.length > 0 && (
          <div className="rounded-2xl border-2 border-primary bg-gradient-to-r from-secondary to-white p-5 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarClock className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Premier créneau disponible</h3>
                  <p className="text-sm text-muted-foreground">Réservez avec le premier médecin disponible</p>
                </div>
              </div>
              <Link
                href={`/rdv-clinique/${clinic.slug}`}
                className="shrink-0 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-doktori-teal-dark transition-colors text-sm"
              >
                Réserver
              </Link>
            </div>
          </div>
        )}

        {/* Doctors section */}
        <div className="mb-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-heading text-xl font-black text-foreground">
                Nos médecins
              </h2>
              <p className="text-sm text-muted-foreground">
                {allDoctorsInClinic.length} praticien
                {allDoctorsInClinic.length !== 1 ? "s" : ""} disponible
                {allDoctorsInClinic.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {allDoctorsInClinic.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-10 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-muted-foreground">
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
                    className="group relative overflow-hidden rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/8"
                  >
                    {/* Role badge */}
                    {role === "admin" && (
                      <div className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Responsable
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {doctor.photoUrl ? (
                          <div className="h-14 w-14 overflow-hidden rounded-xl ring-1 ring-border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={doctor.photoUrl}
                              alt={doctor.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary font-heading text-sm font-black text-white">
                            {initials}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white">
                          <BadgeCheck className="h-4 w-4 fill-accent text-white" strokeWidth={2.5} />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm font-bold text-foreground truncate">
                          {doctor.name}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-primary">
                          {spec?.label ?? doctor.specialty}
                        </p>
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/medecin/${doctor.slug}`}
                      className="mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-bold text-white transition-all hover:bg-doktori-teal-dark group-hover:gap-2"
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
        <div className="rounded-2xl border border-border bg-white p-6">
          <h3 className="mb-4 font-heading text-base font-bold text-foreground">
            Localisation
          </h3>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <MapPin className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="font-semibold text-foreground">{clinic.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {clinic.address}
              </p>
              <p className="text-sm text-muted-foreground">{cityLabel}, Tunisie</p>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(`${clinic.name} ${clinic.address} ${cityLabel} Tunisie`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                Voir sur Google Maps
                <ArrowRight className="h-3 w-3" strokeWidth={3} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
