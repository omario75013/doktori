import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import {
  User,
  Pencil,
  QrCode,
  MapPin,
  Phone,
  Mail,
  Stethoscope,
  Star,
  Eye,
  ExternalLink,
  GraduationCap,
  Building2,
  Globe,
  Camera,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Video,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { QRCode } from "@/components/qr-code";

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "medecin.profil" });

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, session.user.id))
    .limit(1);

  if (!doctor) redirect("/connexion");

  const specialty = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);

  // Profile completeness
  const checks = [
    { label: "Photo de profil", done: !!doctor.photoUrl, href: null },
    { label: "Biographie", done: !!doctor.bio, href: null },
    { label: "Parcours (formations, expériences)", done: (doctor.educations?.length ?? 0) > 0, href: "/profil/parcours" },
    { label: "Horaires configurés", done: true, href: "/agenda" }, // assume true if they got this far
    { label: "Motifs de consultation", done: true, href: "/motifs" },
  ];
  const completedCount = checks.filter((c) => c.done).length;
  const completeness = Math.round((completedCount / checks.length) * 100);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#134E4A]">{t("title")}</h1>
            <p className="text-sm text-gray-500">Gérez vos informations publiques</p>
          </div>
        </div>
        <Link
          href={`/medecin/${doctor.slug}`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E6F4F1] bg-white px-4 py-2.5 text-sm font-semibold text-[#0891B2] hover:bg-[#F0FDFA] transition-colors"
        >
          <Eye className="h-4 w-4" />
          Voir ma page publique
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-[#E6F4F1] bg-white shadow-sm overflow-hidden">
        {/* Header with gradient */}
        <div className="relative h-32 bg-gradient-to-br from-[#134E4A] via-[#0e3d38] to-[#0891B2]">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-5 -left-5 h-24 w-24 rounded-full bg-white/5" />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end gap-4 -mt-12 mb-4">
            <div className="relative">
              {doctor.photoUrl ? (
                <img
                  src={doctor.photoUrl}
                  alt={doctor.name}
                  className="h-24 w-24 rounded-2xl border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-[#F0FDFA] shadow-lg">
                  <User className="h-10 w-10 text-[#0891B2]/40" />
                </div>
              )}
              <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#0891B2] text-white shadow-sm hover:bg-[#0e7490] transition-colors">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-[#134E4A]">Dr. {doctor.name}</h2>
              <p className="text-sm text-[#0891B2] font-medium">
                {specialty?.label ?? doctor.specialty}
              </p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="flex items-center gap-3 rounded-xl bg-[#F0FDFA] p-3.5">
              <Mail className="h-4 w-4 text-[#0891B2] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-[#134E4A] truncate">{doctor.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#F0FDFA] p-3.5">
              <Phone className="h-4 w-4 text-[#0891B2] shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Téléphone</p>
                <p className="text-sm font-medium text-[#134E4A]">{doctor.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#F0FDFA] p-3.5">
              <MapPin className="h-4 w-4 text-[#0891B2] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Adresse</p>
                <p className="text-sm font-medium text-[#134E4A] truncate">
                  {doctor.address}, {city?.label ?? doctor.city}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#F0FDFA] p-3.5">
              <Stethoscope className="h-4 w-4 text-[#0891B2] shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Mode de consultation</p>
                <p className="text-sm font-medium text-[#134E4A]">
                  {doctor.consultationMode === "both"
                    ? "Cabinet + Téléconsultation"
                    : doctor.consultationMode === "teleconsult"
                    ? "Téléconsultation"
                    : "Cabinet"}
                </p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-5 pt-5 border-t border-[#E6F4F1]">
            {doctor.averageRating != null && doctor.averageRating > 0 && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold text-[#134E4A]">
                  {doctor.averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">
                  ({doctor.reviewCount ?? 0} avis)
                </span>
              </div>
            )}
            {doctor.consultationFee && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-500">Consultation :</span>
                <span className="text-sm font-bold text-[#134E4A]">
                  {doctor.consultationFee / 1000} DT
                </span>
              </div>
            )}
            {doctor.teleconsultFee && (
              <div className="flex items-center gap-1.5">
                <Video className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-bold text-[#134E4A]">
                  {doctor.teleconsultFee / 1000} DT
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile completeness */}
      {completeness < 100 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#134E4A] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Complétez votre profil
            </h3>
            <span className="text-sm font-bold text-amber-600">{completeness}%</span>
          </div>
          <div className="h-2 rounded-full bg-amber-200 mb-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <div className="space-y-2">
            {checks
              .filter((c) => !c.done)
              .map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{c.label}</span>
                  {c.href && (
                    <Link
                      href={c.href}
                      className="text-xs font-semibold text-[#0891B2] hover:underline"
                    >
                      Compléter
                    </Link>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/profil/parcours"
          className="rounded-2xl border border-[#E6F4F1] bg-white p-5 hover:shadow-md transition-shadow group"
        >
          <GraduationCap className="h-8 w-8 text-[#0891B2] mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-sm font-bold text-[#134E4A]">Parcours</h3>
          <p className="text-xs text-gray-500 mt-1">Formations, expériences, langues</p>
        </Link>
        <Link
          href="/cabinets"
          className="rounded-2xl border border-[#E6F4F1] bg-white p-5 hover:shadow-md transition-shadow group"
        >
          <Building2 className="h-8 w-8 text-[#0891B2] mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-sm font-bold text-[#134E4A]">Cabinets</h3>
          <p className="text-xs text-gray-500 mt-1">Gérer vos lieux de pratique</p>
        </Link>
        <Link
          href="/agenda"
          className="rounded-2xl border border-[#E6F4F1] bg-white p-5 hover:shadow-md transition-shadow group"
        >
          <Calendar className="h-8 w-8 text-[#0891B2] mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-sm font-bold text-[#134E4A]">Horaires</h3>
          <p className="text-xs text-gray-500 mt-1">Configurer vos disponibilités</p>
        </Link>
      </div>

      {/* QR code section */}
      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-[#134E4A] mb-1 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-[#0891B2]" />
          Mon QR code
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Affichez ce QR code dans votre cabinet pour que vos patients puissent prendre rendez-vous directement.
        </p>
        <div className="flex items-start gap-6">
          <QRCode url={`https://doktori.tn/rdv/${doctor.slug}`} size={150} />
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Ce QR code renvoie vers votre page de prise de rendez-vous :
            </p>
            <code className="block text-xs text-[#0891B2] bg-[#F0FDFA] px-3 py-2 rounded-lg break-all">
              doktori.tn/rdv/{doctor.slug}
            </code>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://doktori.tn/rdv/${doctor.slug}`)}&format=png`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-[#0891B2] text-[#0891B2] hover:bg-[#F0FDFA] px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <QrCode className="h-4 w-4" />
              Télécharger en PNG
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
