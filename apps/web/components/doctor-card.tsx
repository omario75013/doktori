import Link from "next/link";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { MapPin, ArrowRight, Star, Clock } from "lucide-react";

interface Props {
  doctor: {
    slug: string;
    name: string;
    specialty: string;
    city: string;
    address: string;
    consultationFee: number | null;
    photoUrl: string | null;
  };
}

// Deterministic gradient based on name to avoid hydration mismatch
function avatarGradient(name: string): string {
  const gradients = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-purple-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-red-600",
    "from-cyan-500 to-blue-600",
  ];
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

export function DoctorCard({ doctor }: Props) {
  const specialty = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);
  const gradient = avatarGradient(doctor.name);
  const initials = doctor.name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/medecin/${doctor.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
    >
      {/* Subtle gradient shine on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/0 via-blue-50/0 to-blue-50/50 opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="relative flex items-start gap-4">
        {/* Avatar with gradient */}
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-lg font-bold text-white shadow-sm ring-1 ring-black/5`}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-gray-900">{doctor.name}</h3>
          <p className="mt-0.5 text-sm font-medium text-blue-600">{specialty?.label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {city?.label}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-700">4.8</span>
              <span className="text-gray-400">(24)</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-green-600" />
              <span className="font-medium text-green-700">Dispo aujourd'hui</span>
            </span>
          </div>
        </div>

        {/* Price */}
        {doctor.consultationFee && (
          <div className="shrink-0 text-right">
            <div className="rounded-xl bg-blue-50 px-3 py-2 ring-1 ring-blue-100">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                Consultation
              </div>
              <div className="mt-0.5 flex items-baseline gap-0.5">
                <span className="text-xl font-extrabold text-blue-900">
                  {doctor.consultationFee / 1000}
                </span>
                <span className="text-xs font-semibold text-blue-700">DT</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA row */}
      <div className="relative mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="truncate text-xs text-gray-500">{doctor.address}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 transition-all group-hover:gap-1.5">
          Prendre RDV
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
