import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDoctorBySlug, getDoctorSchedule, getAllDoctorSlugs } from "@doktori/db";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { buttonVariants } from "@/components/ui/button";

// Day index 0 = Sunday ... 6 = Saturday
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;

function formatTime(time: string): string {
  // PostgreSQL TIME returns "HH:mm:ss" — slice to "HH:mm"
  return time.slice(0, 5);
}

function getSpecialtyLabel(specialtyId: string): string {
  const found = SPECIALTIES.find((s) => s.id === specialtyId);
  return found ? found.label : specialtyId;
}

function getCityLabel(cityId: string): string {
  const found = CITIES.find((c) => c.id === cityId);
  return found ? found.label : cityId;
}

// ─── Static Params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const slugs = await getAllDoctorSlugs();
  return slugs.map((row) => ({ slug: row.slug }));
}

// ─── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doctor = await getDoctorBySlug(slug);

  if (!doctor) {
    return { title: "Médecin introuvable | Doktori" };
  }

  const specialtyLabel = getSpecialtyLabel(doctor.specialty);
  const cityLabel = getCityLabel(doctor.city);

  return {
    title: `${doctor.name} — ${specialtyLabel} à ${cityLabel} | Doktori`,
    description: `Prenez rendez-vous en ligne avec ${doctor.name}, ${specialtyLabel} à ${cityLabel}. Consultez les disponibilités et réservez en 2 clics sur Doktori.`,
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function DoctorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doctor = await getDoctorBySlug(slug);

  if (!doctor) {
    notFound();
  }

  const schedule = await getDoctorSchedule(doctor.id);
  const specialtyLabel = getSpecialtyLabel(doctor.specialty);
  const cityLabel = getCityLabel(doctor.city);

  // Group schedule rows by day of week
  const scheduleByDay = schedule.reduce<
    Record<number, Array<{ startTime: string; endTime: string }>>
  >((acc, row) => {
    if (!row.isActive) return acc;
    const entries = acc[row.dayOfWeek] ?? [];
    entries.push({ startTime: row.startTime, endTime: row.endTime });
    acc[row.dayOfWeek] = entries;
    return acc;
  }, {});

  // Schema.org structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doctor.name,
    medicalSpecialty: specialtyLabel,
    address: {
      "@type": "PostalAddress",
      streetAddress: doctor.address,
      addressLocality: cityLabel,
      addressCountry: "TN",
    },
    url: `https://doktori.tn/medecin/${doctor.slug}`,
  };

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-12">
          {/* ── Doctor header ── */}
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Photo or initials placeholder */}
              {doctor.photoUrl ? (
                <img
                  src={doctor.photoUrl}
                  alt={`Photo de ${doctor.name}`}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-zinc-200 sm:h-28 sm:w-28"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-2xl font-semibold text-zinc-500 ring-2 ring-zinc-200 sm:h-28 sm:w-28">
                  {doctor.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
              )}

              <div className="flex-1 space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                  {doctor.name}
                </h1>
                <p className="text-base font-medium text-zinc-600">{specialtyLabel}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
                  <span>{cityLabel}</span>
                  <span>{doctor.address}</span>
                </div>

                {doctor.consultationFee !== null && (
                  <p className="text-sm font-medium text-zinc-700">
                    Consultation :{" "}
                    <span className="text-zinc-900">
                      {(doctor.consultationFee / 1000).toFixed(0)} DT
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6">
              <Link
                href={`/rdv/${doctor.slug}`}
                className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}
              >
                Prendre RDV
              </Link>
            </div>
          </div>

          {/* ── Bio ── */}
          {doctor.bio && (
            <section className="mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900">À propos</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                {doctor.bio}
              </p>
            </section>
          )}

          {/* ── Weekly schedule ── */}
          {Object.keys(scheduleByDay).length > 0 && (
            <section className="mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">Horaires</h2>
              <ul className="space-y-2">
                {(Object.entries(scheduleByDay) as [string, Array<{ startTime: string; endTime: string }>][])
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, slots]) => (
                    <li key={day} className="flex items-start gap-3 text-sm">
                      <span className="w-8 font-medium text-zinc-700">
                        {DAY_NAMES[Number(day)]}
                      </span>
                      <span className="text-zinc-500">
                        {slots
                          .map((s) => `${formatTime(s.startTime)} – ${formatTime(s.endTime)}`)
                          .join(", ")}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
