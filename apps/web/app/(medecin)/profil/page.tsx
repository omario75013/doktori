import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { User, Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

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

  const fields = [
    { label: t("fieldName"), value: doctor.name },
    { label: t("fieldEmail"), value: doctor.email },
    { label: t("fieldPhone"), value: doctor.phone },
    { label: t("fieldSpecialty"), value: specialty?.label },
    { label: t("fieldCity"), value: city?.label },
    { label: t("fieldAddress"), value: doctor.address },
    ...(doctor.consultationFee
      ? [{ label: t("fieldFee"), value: `${doctor.consultationFee / 1000} DT` }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
          <User className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold text-[#134E4A]">{t("title")}</h1>
      </div>

      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-6 shadow-sm max-w-lg">
        <div className="space-y-4">
          {fields.map(({ label, value }) => (
            <div key={label} className="flex items-start gap-3 py-2 border-b border-[#E6F4F1] last:border-0">
              <span className="text-sm text-gray-500 w-24 shrink-0 pt-0.5">{label}</span>
              <span className="text-sm font-medium text-[#134E4A]">{value ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/profil/parcours"
          className="inline-flex items-center gap-2 bg-[#0891B2] hover:bg-[#0E7490] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors h-12"
        >
          <Pencil className="h-4 w-4" />
          {t("editParcours")}
        </Link>
      </div>

      <p className="text-xs text-gray-400">{t("editComingSoon")}</p>
    </div>
  );
}
