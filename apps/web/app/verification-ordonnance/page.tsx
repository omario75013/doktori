import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, XCircle, ShieldCheck } from "lucide-react";
import { SPECIALTIES } from "@doktori/shared";
import { format } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) || "fr";
  const t = await getTranslations({ locale, namespace: "medicalDocs.verification" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

interface VerifyResult {
  valid: boolean;
  doctorName?: string;
  doctorSpecialty?: string;
  patientName?: string;
  date?: string;
  content?: string;
  error?: string;
}

async function verifyToken(token: string): Promise<VerifyResult> {
  try {
    const res = await fetch(
      `https://doktori.tn/api/prescriptions/verify?token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { valid: false };
    return (await res.json()) as VerifyResult;
  } catch {
    return { valid: false };
  }
}

export default async function VerificationOrdonnancePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const locale = (await getLocale()) || "fr";
  const isAr = locale === "ar";
  const dateLocale = isAr ? ar : fr;
  const t = await getTranslations({ locale, namespace: "medicalDocs.verification" });
  const tc = await getTranslations({ locale, namespace: "medicalDocs.common" });

  if (!token) {
    return (
      <main
        dir={isAr ? "rtl" : "ltr"}
        className="min-h-screen bg-secondary flex items-center justify-center px-4"
      >
        <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-sm p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">
            {t("emptyTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {t("emptyDescription")}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-doktori-teal-dark transition-colors"
          >
            {t("backHome")}
          </Link>
        </div>
      </main>
    );
  }

  const result = await verifyToken(token);

  const specialtyLabel = result.doctorSpecialty
    ? (SPECIALTIES.find((s) => s.id === result.doctorSpecialty)?.label ?? result.doctorSpecialty)
    : null;

  const formattedDate = result.date
    ? format(new Date(result.date), "d MMMM yyyy", { locale: dateLocale })
    : null;

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen bg-secondary flex items-center justify-center px-4 py-12"
    >
      <div className="max-w-lg w-full">
        {result.valid ? (
          <div className="bg-white rounded-2xl border-2 border-green-400 shadow-sm overflow-hidden">
            <div className="bg-green-50 px-6 py-5 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
              <div>
                <h1 className="text-xl font-black text-green-800">{t("validTitle")}</h1>
                <p className="text-sm text-green-600">{t("validSubtitle")}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t("doctorLabel")}</p>
                  <p className="text-sm font-bold text-foreground">{result.doctorName}</p>
                  {specialtyLabel && (
                    <p className="text-xs text-primary">{specialtyLabel}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t("patientLabel")}</p>
                  <p className="text-sm font-bold text-foreground">{result.patientName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t("dateLabel")}</p>
                  <p className="text-sm font-bold text-foreground">{formattedDate}</p>
                </div>
              </div>

              {result.content && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("contentLabel")}</p>
                  <div className="bg-secondary rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {result.content}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  {t("verifiedFooter")}{" "}
                  <span className="font-bold text-primary">{tc("brand")}</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-red-300 shadow-sm overflow-hidden">
            <div className="bg-red-50 px-6 py-5 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <h1 className="text-xl font-black text-red-800">{t("invalidTitle")}</h1>
                <p className="text-sm text-red-600">
                  {t("invalidSubtitle")}
                </p>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                {t("invalidExplanation")}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-doktori-teal-dark transition-colors"
              >
                {t("backHome")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
