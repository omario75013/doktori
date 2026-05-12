"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import {
  Stethoscope,
  Calendar,
  FileText,
  Heart,
  Loader2,
  Check,
  UserRound,
  AlertCircle,
} from "lucide-react";

type PasswordStrength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength | null {
  if (password.length === 0) return null;
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const score = [password.length >= 8, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (score <= 1) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

const STRENGTH_CONFIG: Record<PasswordStrength, { color: string; width: string }> = {
  weak: { color: "bg-red-500", width: "w-1/3" },
  medium: { color: "bg-amber-400", width: "w-2/3" },
  strong: { color: "bg-green-500", width: "w-full" },
};

export function InscriptionPatientClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("patientAuth.inscription");
  const STRENGTH_LABEL: Record<PasswordStrength, string> = {
    weak: t("strength.weak"),
    medium: t("strength.medium"),
    strong: t("strength.strong"),
  };
  function validateEmail(email: string): string | null {
    if (!email) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : t("errors.emailFormat");
  }
  function validatePhone(phone: string): string | null {
    if (!phone) return null;
    const normalized = phone.replace(/[\s\-()]/g, "");
    return /^(\+216|216|0)?[2-9]\d{7}$/.test(normalized) ? null : t("errors.phoneFormat");
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Capture referral code from URL (?ref=CODE) and persist in localStorage
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      try {
        localStorage.setItem("doktori_referral_code", ref.toUpperCase());
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  // If a patient is already logged in, redirect to their space.
  useEffect(() => {
    try {
      const token = sessionStorage.getItem("doktori_patient_session");
      if (!token) return;
      fetch("/api/patients/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => {
          if (r.ok) router.replace("/mon-espace");
        })
        .catch(() => {});
    } catch {
      // ignore
    }
  }, [router]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    password: false,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }

  const emailError = touched.email ? validateEmail(form.email) : null;
  const phoneError = touched.phone ? validatePhone(form.phone) : null;
  const passwordStrength = getPasswordStrength(form.password);
  const passwordTooShort = touched.password && form.password.length > 0 && form.password.length < 8;

  function canSubmit(): boolean {
    return !!(
      form.name.trim().length >= 2 &&
      validateEmail(form.email) === null &&
      form.email.length > 0 &&
      validatePhone(form.phone) === null &&
      form.phone.length > 0 &&
      form.password.length >= 8 &&
      termsAccepted
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true });
    if (!canSubmit()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/patients/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("errors.checkInfo"));
        return;
      }

      /* token now set via httpOnly cookie by the API */
      try { sessionStorage.setItem("doktori_patient_session", "1"); } catch { /* ignore */ }
      try { localStorage.removeItem("doktori_patient_token"); } catch { /* ignore */ }

      // Track referral if a code was captured during onboarding
      try {
        const referrerCode = localStorage.getItem("doktori_referral_code");
        if (referrerCode) {
          await fetch("/api/me/referral/track", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.token}`,
            },
            body: JSON.stringify({ referrerCode }),
          }).catch(() => {});
          localStorage.removeItem("doktori_referral_code");
        }
      } catch {
        // ignore tracking errors — they shouldn't block signup
      }

      router.push("/mon-espace");
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-gradient-to-br from-primary via-doktori-teal-dark to-foreground text-white p-10 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-heading text-xl font-black tracking-tight">Doktori</span>
          </div>

          <h1 className="font-heading text-3xl xl:text-4xl font-black leading-tight tracking-tight">
            {t.rich("heroTitle", { br: () => <br /> })}
          </h1>
          <p className="mt-4 text-white/70 text-sm leading-relaxed max-w-sm">
            {t("heroSubtitle")}
          </p>
        </div>

        <div className="relative z-10 space-y-5 mt-auto">
          {[
            { icon: Calendar, text: t("feature.1") },
            { icon: FileText, text: t("feature.2") },
            { icon: Heart, text: t("feature.3") },
            { icon: UserRound, text: t("feature.4") },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-white/80">{text}</span>
            </div>
          ))}
        </div>

        <div aria-hidden className="absolute -bottom-20 -end-20 h-64 w-64 rounded-full bg-white/5" />
        <div aria-hidden className="absolute -top-10 -end-10 h-40 w-40 rounded-full bg-accent/10" />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col bg-[#F8FFFE] dark:bg-gray-900">
        <div className="lg:hidden bg-gradient-to-r from-primary to-foreground px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="h-5 w-5" />
            <span className="font-bold">Doktori</span>
          </div>
          <h1 className="text-lg font-bold">{t("mobileTitle")}</h1>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-foreground">{t("formTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("formSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Full name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-foreground font-semibold">
                  {t("nameLabel")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t("namePlaceholder")}
                  required
                  value={form.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
                {touched.name && form.name.trim().length > 0 && form.name.trim().length < 2 && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {t("errors.nameMin")}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-foreground font-semibold">
                  {t("emailLabel")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`h-12 rounded-xl border-border focus-visible:ring-primary ${emailError ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                />
                {emailError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {emailError}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-foreground font-semibold">
                  {t("phoneLabel")} <span className="text-red-500">*</span>
                </Label>
                <PhoneInput
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={(v) =>
                    handleChange({
                      target: { name: "phone", value: v },
                    } as React.ChangeEvent<HTMLInputElement>)
                  }
                  required
                />
                {phoneError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Password + strength indicator */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-foreground font-semibold">
                  {t("passwordLabel")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
                {/* Password strength bar */}
                {form.password.length > 0 && passwordStrength && (
                  <div className="space-y-1 pt-1">
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${STRENGTH_CONFIG[passwordStrength].color} ${STRENGTH_CONFIG[passwordStrength].width}`}
                      />
                    </div>
                    <p className={`text-xs font-medium ${
                      passwordStrength === "weak" ? "text-red-600" :
                      passwordStrength === "medium" ? "text-amber-600" :
                      "text-green-600"
                    }`}>
                      {t("securityLabel")} : {STRENGTH_LABEL[passwordStrength]}
                    </p>
                  </div>
                )}
                {passwordTooShort && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {t("errors.passwordMin")}
                  </p>
                )}
              </div>

              {/* Terms checkbox */}
              <div className="flex items-start gap-3 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                />
                <Label htmlFor="terms" className="text-sm text-foreground/70 leading-relaxed cursor-pointer font-normal">
                  {t.rich("terms", {
                    cgu: (chunks) => (
                      <a href="/legal/cgu" className="text-primary font-semibold hover:underline">
                        {chunks}
                      </a>
                    ),
                    privacy: (chunks) => (
                      <a href="/confidentialite" className="text-primary font-semibold hover:underline">
                        {chunks}
                      </a>
                    ),
                  })}
                </Label>
              </div>

              {error && (
                <div className="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !canSubmit()}
                className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold shadow-lg shadow-primary/20 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  <>
                    {t("submitBtn")}
                    <Check className="h-4 w-4 ms-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {t("alreadyAccount")}{" "}
              <a href="/connexion-patient" className="font-bold text-primary hover:underline">
                {t("login")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
