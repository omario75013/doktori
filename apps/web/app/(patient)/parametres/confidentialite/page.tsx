"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, Info } from "lucide-react";

type ConsentType = "cookies_analytics" | "cookies_marketing" | "marketing_email" | "research_anonymized";

interface ConsentState {
  cookies_analytics: boolean;
  cookies_marketing: boolean;
  marketing_email: boolean;
  research_anonymized: boolean;
}

const CONSENT_TYPES: ConsentType[] = [
  "cookies_analytics",
  "cookies_marketing",
  "marketing_email",
  "research_anonymized",
];

export default function ConfidentialiteParametresPage() {
  const router = useRouter();
  const t = useTranslations("patient.parametres.confidentialite");
  const [token, setToken] = useState<string | null>(null);

  const CONSENT_LABELS: Record<ConsentType, { label: string; description: string }> = {
    cookies_analytics: { label: t("consents.cookiesAnalytics.label"), description: t("consents.cookiesAnalytics.desc") },
    cookies_marketing: { label: t("consents.cookiesMarketing.label"), description: t("consents.cookiesMarketing.desc") },
    marketing_email: { label: t("consents.marketingEmail.label"), description: t("consents.marketingEmail.desc") },
    research_anonymized: { label: t("consents.researchAnonymized.label"), description: t("consents.researchAnonymized.desc") },
  };
  const [consents, setConsents] = useState<ConsentState>({
    cookies_analytics: false,
    cookies_marketing: false,
    marketing_email: false,
    research_anonymized: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("doktori_patient_session");
    if (!stored) {
      router.replace("/connexion-patient");
      return;
    }
    setToken(stored);

    fetch("/api/me/consents", {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const loaded: ConsentState = {
          cookies_analytics: false,
          cookies_marketing: false,
          marketing_email: false,
          research_anonymized: false,
        };
        // Take the most recent grant for each type
        const rows: Array<{ consentType: string; granted: boolean; grantedAt: string }> =
          data.consents ?? [];
        rows.forEach((row) => {
          if (row.consentType in loaded) {
            loaded[row.consentType as ConsentType] = row.granted;
          }
        });
        setConsents(loaded);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/consents", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ consents }),
      });
      if (res.ok) {
        toast.success(t("toast.saved"));
      } else {
        toast.error(t("toast.saveError"));
      }
    } catch {
      toast.error(t("toast.networkError"));
    } finally {
      setSaving(false);
    }
  }

  function toggle(type: ConsentType) {
    setConsents((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  return (
    <div className="min-h-screen bg-secondary dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-foreground transition-colors">
            ← {t("back")}
          </button>
          <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        </div>

        <div className="rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">{t("myConsents")}</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            {t("intro")}
          </p>

          {/* Essential — forced on */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 mb-2">
            <div className="flex-1 me-4">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-sm font-medium text-foreground">{t("essential.label")}</p>
                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded-full">{t("essential.required")}</span>
              </div>
              <p className="text-xs text-gray-400">{t("essential.desc")}</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full opacity-60 cursor-not-allowed shrink-0 relative">
              <span className="block w-4 h-4 rounded-full bg-white absolute end-1 top-1" />
            </div>
          </div>

          {/* Other consent types */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {CONSENT_TYPES.map((type) => {
                const { label, description } = CONSENT_LABELS[type];
                const value = consents[type];
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3"
                  >
                    <div className="flex-1 me-4">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={value}
                      onClick={() => toggle(type)}
                      className={`w-10 h-6 rounded-full transition-colors shrink-0 relative ${
                        value ? "bg-primary" : "bg-gray-200 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          value ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex items-start gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {t.rich("gdprNotice", {
                a: (chunks) => <a href="mailto:rgpd@doktori.tn" className="text-primary hover:underline">{chunks}</a>,
              })}
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full rounded-xl h-12 bg-primary hover:bg-primary/90 font-semibold"
        >
          {saving ? t("saving") : t("savePrefs")}
        </Button>
      </div>
    </div>
  );
}
