"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { fr, arSA } from "date-fns/locale";
import {
  Check,
  X,
  CalendarPlus,
  FileText,
  Loader2,
  Info,
  Phone,
  CalendarClock,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

// Per-referral actions + "Voir les détails" modal. All copy goes through
// medecin.reseau translations so the page mirrors in Arabic with RTL.
export function ReferralActions({
  referralId,
  patientId,
  patientName,
  patientPhone,
  counterpartName,
  counterpartSpecialty,
  direction,
  status,
  consentStatus,
  shareMedicalRecord,
  reason,
  notesForReceivingDoctor,
  suggestedAppointmentAt,
  createdAt,
}: {
  referralId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  counterpartName: string;
  counterpartSpecialty: string | null;
  direction: "in" | "out";
  status: string;
  consentStatus: string;
  shareMedicalRecord: boolean;
  reason: string;
  notesForReceivingDoctor: string | null;
  suggestedAppointmentAt: string | null;
  createdAt: string;
}) {
  const t = useTranslations("medecin.reseau");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? arSA : fr;
  const router = useRouter();
  const [busy, setBusy] = useState<null | "accept" | "decline" | "complete">(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  async function call(action: "accept" | "decline" | "complete") {
    setBusy(action);
    try {
      const r = await fetch(`/api/doctor/referrals/${referralId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? t("errorGeneric"));
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("errorGeneric"));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function acceptAndBook() {
    const ok = await call("accept");
    if (!ok) return;
    toast.success(t("actionAccepted"));
    router.push(
      `/rendez-vous?newRdvFor=${patientId}&newRdvName=${encodeURIComponent(patientName)}`,
    );
  }

  async function decline() {
    if (!confirm(t("actionDeclineConfirm"))) return;
    const ok = await call("decline");
    if (ok) {
      toast.success(t("actionDeclined"));
      router.refresh();
    }
  }

  async function markCompleted() {
    const ok = await call("complete");
    if (ok) {
      toast.success(t("actionCompleted"));
      router.refresh();
    }
  }

  const canViewDossier = shareMedicalRecord && consentStatus === "granted";
  const isIncoming = direction === "in";

  function statusLabel(s: string) {
    switch (s) {
      case "pending":
        return t("statusPending");
      case "accepted":
        return t("statusAccepted");
      case "declined":
        return t("statusDeclined");
      case "completed":
        return t("statusCompleted");
      default:
        return s;
    }
  }

  function dossierLabel() {
    if (!shareMedicalRecord) return t("dossierNotShared");
    if (consentStatus === "granted") return t("dossierShared");
    if (consentStatus === "denied") return t("dossierDenied");
    return t("dossierPending");
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white hover:bg-secondary text-gray-700 px-3 py-1.5 text-xs font-medium"
        >
          <Info className="h-3.5 w-3.5" />
          {t("detailsButton")}
        </button>

        {isIncoming && status === "pending" && (
          <>
            <button
              type="button"
              disabled={busy !== null}
              onClick={acceptAndBook}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {busy === "accept" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CalendarPlus className="h-3.5 w-3.5" />
              )}
              {t("actionAcceptAndBook")}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={decline}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white hover:bg-secondary text-gray-700 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {busy === "decline" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              {t("actionDecline")}
            </button>
          </>
        )}

        {isIncoming && status === "accepted" && (
          <>
            <a
              href={`/rendez-vous?newRdvFor=${patientId}&newRdvName=${encodeURIComponent(patientName)}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-3 py-1.5 text-xs font-medium hover:opacity-90"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              {t("actionBookRdv")}
            </a>
            <button
              type="button"
              disabled={busy !== null}
              onClick={markCompleted}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white hover:bg-secondary text-gray-700 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {busy === "complete" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {t("actionMarkCompleted")}
            </button>
          </>
        )}

        {isIncoming && canViewDossier && (
          <a
            href={`/patients/${patientId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium"
          >
            <FileText className="h-3.5 w-3.5" />
            {t("actionViewDossier")}
          </a>
        )}
      </div>

      {detailsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.45)" }}
          onClick={() => setDetailsOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                {t("detailsTitle")}
              </h3>
              <button
                onClick={() => setDetailsOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 text-sm">
              <section>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  {t("patientLabel")}
                </p>
                <p className="font-semibold text-foreground">{patientName}</p>
                <p className="text-xs text-gray-500 inline-flex items-center gap-1" dir="ltr">
                  <Phone className="w-3 h-3" />
                  {patientPhone}
                </p>
              </section>

              <section>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  {isIncoming ? t("referredByLabel") : t("referredToLabel")}
                </p>
                <p className="text-foreground">
                  Dr. {counterpartName.replace(/^Dr\.?\s*/i, "")}
                  {counterpartSpecialty && (
                    <span className="text-gray-500"> · {counterpartSpecialty}</span>
                  )}
                </p>
              </section>

              <section>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  {t("reasonLabel")}
                </p>
                <p className="text-foreground whitespace-pre-wrap">{reason}</p>
              </section>

              {notesForReceivingDoctor && (
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 inline-flex items-center gap-1">
                    <StickyNote className="w-3 h-3" />
                    {t("notesLabel")}
                  </p>
                  <p className="text-foreground whitespace-pre-wrap">
                    {notesForReceivingDoctor}
                  </p>
                </section>
              )}

              {suggestedAppointmentAt && (
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 inline-flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    {t("suggestedRdvLabel")}
                  </p>
                  <p className="text-foreground">
                    {format(
                      new Date(suggestedAppointmentAt),
                      "EEEE d MMMM yyyy 'à' HH:mm",
                      { locale: dateLocale },
                    )}
                  </p>
                </section>
              )}

              <section className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                    {t("statusLabel")}
                  </p>
                  <p className="text-foreground">{statusLabel(status)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                    {t("dossierLabel")}
                  </p>
                  <p className="text-foreground">{dossierLabel()}</p>
                </div>
              </section>

              <p className="text-[11px] text-gray-400 pt-1">
                {t("sentOn", {
                  date: format(new Date(createdAt), "d MMMM yyyy 'à' HH:mm", {
                    locale: dateLocale,
                  }),
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
