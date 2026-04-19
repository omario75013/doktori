import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { db, clinics, clinicDoctors, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { getAvailableSlots } from "@/lib/queries/appointments";
import { SPECIALTIES } from "@doktori/shared";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  MapPin,
  BadgeCheck,
  Building2,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  params: Promise<{ slug: string }>;
}

interface SlotResult {
  doctorId: string;
  doctorName: string;
  doctorSlug: string;
  doctorPhotoUrl: string | null;
  specialty: string;
  date: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
}

async function findNextSlotForDoctor(
  doctor: {
    id: string;
    name: string;
    slug: string;
    specialty: string | null;
    photoUrl: string | null;
  },
  daysAhead = 7,
): Promise<SlotResult | null> {
  for (let d = 0; d < daysAhead; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    const slots = await getAvailableSlots(doctor.id, dateStr);
    const first = slots.find((s) => s.available);
    if (first) {
      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSlug: doctor.slug,
        doctorPhotoUrl: doctor.photoUrl,
        specialty: SPECIALTIES.find((s) => s.id === doctor.specialty)?.label ?? (doctor.specialty ?? "Médecin"),
        date: dateStr,
        dateLabel: format(new Date(dateStr + "T12:00:00"), "EEEE d MMMM", { locale: fr }),
        startTime: first.startTime,
        endTime: first.endTime,
      };
    }
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [clinic] = await db.select({ name: clinics.name }).from(clinics).where(eq(clinics.slug, slug)).limit(1);
  if (!clinic) return { title: "Centre médical introuvable" };
  return {
    title: `Premier créneau disponible — ${clinic.name} | Doktori`,
    description: `Réservez le premier créneau disponible au ${clinic.name}. Consultation rapide avec le premier médecin libre.`,
  };
}

export default async function RdvCliniqueePage({ params }: Props) {
  const { slug } = await params;

  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);

  if (!clinic) notFound();

  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const doctorIds = clinicDoctorRows.map((r) => r.doctorId);

  const allDoctors =
    doctorIds.length > 0
      ? await db
          .select({
            id: doctors.id,
            name: doctors.name,
            slug: doctors.slug,
            specialty: doctors.specialty,
            photoUrl: doctors.photoUrl,
          })
          .from(doctors)
          .innerJoin(clinicDoctors, eq(clinicDoctors.doctorId, doctors.id))
          .where(eq(clinicDoctors.clinicId, clinic.id))
      : [];

  // Find next available slot per doctor (in parallel)
  const results = await Promise.all(allDoctors.map((doc) => findNextSlotForDoctor(doc)));

  const available = results
    .filter((r): r is SlotResult => r !== null)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

  const [recommended, ...alternatives] = available;

  return (
    <div className="min-h-screen bg-[#F8FFFE]">
      {/* Header */}
      <div className="bg-gradient-to-br from-foreground via-doktori-teal-dark to-primary">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Link
            href={`/centre-medical/${clinic.slug}`}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#A7F3D0] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
            Retour au centre médical
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/30">
              {clinic.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clinic.logoUrl} alt={clinic.name} className="h-10 w-10 rounded-xl object-contain" />
              ) : (
                <Building2 className="h-7 w-7 text-white" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#A7F3D0]">{clinic.name}</p>
              <h1 className="font-heading text-2xl font-black text-white sm:text-3xl">
                Premier créneau disponible
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {available.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-10 text-center">
            <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
            <h2 className="mt-4 font-heading text-lg font-bold text-foreground">
              Aucun créneau disponible
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Aucun médecin n'a de disponibilité dans les 7 prochains jours. Consultez les profils individuels.
            </p>
            <Link
              href={`/centre-medical/${clinic.slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-doktori-teal-dark transition-colors"
            >
              Voir les médecins
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>
        ) : (
          <>
            {/* Recommended slot */}
            {recommended && (
              <div className="mb-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">
                  Créneau recommandé
                </p>
                <div className="rounded-2xl border-2 border-primary bg-white p-6 shadow-md shadow-primary/10">
                  <DoctorSlotCard slot={recommended} clinicSlug={clinic.slug} isPrimary />
                </div>
              </div>
            )}

            {/* Alternative slots */}
            {alternatives.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Autres disponibilités
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {alternatives.slice(0, 4).map((slot) => (
                    <div
                      key={slot.doctorId}
                      className="rounded-2xl border border-border bg-white p-5 hover:border-primary/40 hover:shadow-md transition-all"
                    >
                      <DoctorSlotCard slot={slot} clinicSlug={clinic.slug} isPrimary={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Clinic address */}
        <div className="mt-8 rounded-2xl border border-border bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <MapPin className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="font-semibold text-foreground">{clinic.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{clinic.address}</p>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(`${clinic.name} ${clinic.address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
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

function DoctorSlotCard({
  slot,
  clinicSlug,
  isPrimary,
}: {
  slot: SlotResult;
  clinicSlug: string;
  isPrimary: boolean;
}) {
  const initials = slot.doctorName
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-start gap-4">
      {/* Avatar */}
      <div className="relative shrink-0">
        {slot.doctorPhotoUrl ? (
          <div className={`${isPrimary ? "h-16 w-16" : "h-14 w-14"} overflow-hidden rounded-xl ring-1 ring-border`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slot.doctorPhotoUrl} alt={slot.doctorName} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className={`${isPrimary ? "h-16 w-16" : "h-14 w-14"} flex items-center justify-center rounded-xl bg-primary font-heading text-sm font-black text-white`}>
            {initials}
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white">
          <BadgeCheck className="h-4 w-4 fill-accent text-white" strokeWidth={2.5} />
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={`font-heading font-bold text-foreground ${isPrimary ? "text-base" : "text-sm"}`}>
          {slot.doctorName}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-primary">{slot.specialty}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-doktori-teal-dark">
            <CalendarClock className="h-3.5 w-3.5" strokeWidth={2.5} />
            {slot.dateLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-doktori-teal-dark">
            <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
            {slot.startTime}
          </span>
        </div>

        <Link
          href={`/rdv/${slot.doctorSlug}?date=${slot.date}&time=${slot.startTime}&from=clinique&clinic=${clinicSlug}`}
          className={`mt-4 inline-flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:bg-doktori-teal-dark ${
            isPrimary
              ? "bg-primary px-6 py-3 text-sm"
              : "bg-primary px-4 py-2 text-xs"
          }`}
        >
          Réserver ce créneau
          <ArrowRight className={`${isPrimary ? "h-4 w-4" : "h-3.5 w-3.5"}`} strokeWidth={3} />
        </Link>
      </div>
    </div>
  );
}
