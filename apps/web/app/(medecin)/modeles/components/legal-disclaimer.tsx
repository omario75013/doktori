"use client";

import { useTranslations } from "next-intl";

export function LegalDisclaimer() {
  const t = useTranslations("medecin.modeles");
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-start gap-2">
        <span aria-hidden="true">⚠️</span>
        <span>
          {t("legalIntro")} <strong>{t("legalAids")}</strong> {t("legalMid")}{" "}
          <strong>{t("legalResp")}</strong>
          {t("legalEnd")}
        </span>
      </p>
    </div>
  );
}
