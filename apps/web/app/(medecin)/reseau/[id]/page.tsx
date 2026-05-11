import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Star,
  MapPin,
  Stethoscope,
  Phone,
  Mail,
  Clock,
  Languages,
  GraduationCap,
  Briefcase,
  Award,
} from "lucide-react";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DoctorActions } from "./doctor-actions";

type DoctorDetail = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  city: string | null;
  address: string | null;
  photoUrl: string | null;
  bio: string | null;
  consultationFee: number | null;
  teleconsultFee: number | null;
  languages: string[] | null;
  expertise: string[] | null;
  yearsOfExperience: number | null;
  educations: Array<{ school?: string; degree?: string; year?: string }> | null;
  experiences: Array<{ place?: string; role?: string; years?: string }> | null;
  averageRating: string | number | null;
  reviewCount: number | null;
  verificationStatus: string | null;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    redirect("/connexion");
  }

  const { id } = await params;

  if (id === session.user.id) {
    redirect("/profil");
  }

  const [doctor] = (await db.execute(sql`
    SELECT
      id, name, slug, email, phone, specialty, city, address,
      photo_url           AS "photoUrl",
      bio,
      consultation_fee    AS "consultationFee",
      teleconsult_fee     AS "teleconsultFee",
      languages,
      expertise,
      years_of_experience AS "yearsOfExperience",
      educations,
      experiences,
      average_rating      AS "averageRating",
      review_count        AS "reviewCount",
      verification_status AS "verificationStatus"
    FROM doctors
    WHERE id = ${id}
      AND is_active = true
    LIMIT 1
  `)) as unknown as DoctorDetail[];

  if (!doctor) notFound();

  const reviews = (await db.execute(sql`
    SELECT id, rating, comment, created_at AS "createdAt"
    FROM reviews
    WHERE doctor_id = ${id}
      AND status = 'published'
    ORDER BY created_at DESC
    LIMIT 5
  `)) as unknown as Review[];

  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "medecin.reseau" });
  const tCommon = await getTranslations({ locale, namespace: "medecin.common" });

  const rating = Number(doctor.averageRating ?? 0);
  const reviewCount = Number(doctor.reviewCount ?? 0);
  const initials = doctor.name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        href="/reseau"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToNetwork")}
      </Link>

      <div className="ds-card overflow-hidden">
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 h-32" />
        <div className="p-6 relative">
          <div className="-mt-20 flex flex-col md:flex-row md:items-end gap-5 md:gap-6">
            {doctor.photoUrl ? (
              <Image
                src={doctor.photoUrl}
                alt={doctor.name}
                width={128}
                height={128}
                className="h-32 w-32 rounded-3xl ring-4 ring-white object-cover shadow-lg"
              />
            ) : (
              <div className="h-32 w-32 rounded-3xl ring-4 ring-white bg-teal-500 text-white flex items-center justify-center text-4xl font-bold shadow-lg">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{doctor.name}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                {doctor.specialty && (
                  <span className="inline-flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4" />
                    {doctor.specialty}
                  </span>
                )}
                {doctor.city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {doctor.city}
                  </span>
                )}
                {doctor.yearsOfExperience != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Award className="h-4 w-4" />
                    {t("yearsExperience", { count: doctor.yearsOfExperience! })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="inline-flex items-center gap-1 rounded-full bg-yellow-50 text-yellow-700 px-2.5 py-1 text-sm font-semibold border border-yellow-200">
                  <Star className="h-4 w-4 fill-current" />
                  {rating.toFixed(1)}
                </div>
                <span className="text-sm text-gray-500">
                  {t("patientReviews", { count: reviewCount })}
                </span>
              </div>
            </div>

            <DoctorActions doctorId={doctor.id} doctorName={doctor.name} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {doctor.bio && (
            <Section title={tCommon("about")}>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {doctor.bio}
              </p>
            </Section>
          )}

          {Array.isArray(doctor.expertise) && doctor.expertise.length > 0 && (
            <Section title={t("expertiseDomains")}>
              <div className="flex flex-wrap gap-2">
                {doctor.expertise.map((e) => (
                  <span
                    key={e}
                    className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 text-xs font-medium"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {Array.isArray(doctor.educations) && doctor.educations.length > 0 && (
            <Section title={tCommon("education")} icon={<GraduationCap className="h-4 w-4" />}>
              <ul className="space-y-2">
                {doctor.educations.map((e, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium text-foreground">{e.degree ?? "—"}</p>
                    <p className="text-xs text-gray-500">
                      {[e.school, e.year].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {Array.isArray(doctor.experiences) && doctor.experiences.length > 0 && (
            <Section title={tCommon("experience")} icon={<Briefcase className="h-4 w-4" />}>
              <ul className="space-y-2">
                {doctor.experiences.map((e, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium text-foreground">{e.role ?? "—"}</p>
                    <p className="text-xs text-gray-500">
                      {[e.place, e.years].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {reviews.length > 0 && (
            <Section title={t("recentReviews")} icon={<Star className="h-4 w-4" />}>
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < r.rating
                                ? "text-yellow-500 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(r.createdAt), "d MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="mt-1.5 text-sm text-gray-700">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <Section title={t("contact")}>
            <div className="space-y-2 text-sm">
              <InfoRow icon={<Mail className="h-4 w-4" />} label={t("emailLabel")} value={doctor.email} />
              {doctor.phone && (
                <InfoRow icon={<Phone className="h-4 w-4" />} label={t("phoneLabel")} value={doctor.phone} />
              )}
              {doctor.address && (
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label={t("addressLabel")}
                  value={doctor.address}
                />
              )}
            </div>
          </Section>

          <Section title={tCommon("pricing")}>
            <div className="space-y-2 text-sm">
              {doctor.consultationFee != null && (
                <InfoRow
                  icon={<Clock className="h-4 w-4" />}
                  label={t("consultation")}
                  value={`${doctor.consultationFee} DT`}
                />
              )}
              {doctor.teleconsultFee != null && (
                <InfoRow
                  icon={<Clock className="h-4 w-4" />}
                  label={t("teleconsultation")}
                  value={`${doctor.teleconsultFee} DT`}
                />
              )}
            </div>
          </Section>

          {Array.isArray(doctor.languages) && doctor.languages.length > 0 && (
            <Section title={t("languages")} icon={<Languages className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                {doctor.languages.map((l) => (
                  <span
                    key={l}
                    className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2.5 py-1 text-xs font-medium"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ds-card p-5">
      <h2 className="flex items-center gap-2 font-semibold text-foreground mb-3">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-foreground break-all">{value}</p>
      </div>
    </div>
  );
}
