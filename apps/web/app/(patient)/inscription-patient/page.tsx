"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const STRENGTH_CONFIG: Record<PasswordStrength, { label: string; color: string; width: string }> = {
  weak: { label: "Faible", color: "bg-red-500", width: "w-1/3" },
  medium: { label: "Moyen", color: "bg-amber-400", width: "w-2/3" },
  strong: { label: "Fort", color: "bg-green-500", width: "w-full" },
};

function validateEmail(email: string): string | null {
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "Format d'email invalide";
}

function validatePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? null : "Le numéro doit contenir au moins 8 chiffres";
}

export default function InscriptionPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

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
        setError(typeof data.error === "string" ? data.error : "Veuillez vérifier les informations saisies.");
        return;
      }

      localStorage.setItem("doktori_patient_token", data.token);
      router.push("/mon-espace");
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
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
            Votre santé, <br />à portée de main
          </h1>
          <p className="mt-4 text-white/70 text-sm leading-relaxed max-w-sm">
            Créez votre espace patient et gérez tous vos rendez-vous médicaux en ligne, en toute simplicité.
          </p>
        </div>

        <div className="relative z-10 space-y-5 mt-auto">
          {[
            { icon: Calendar, text: "Prenez RDV en ligne 24h/24 avec les meilleurs médecins" },
            { icon: FileText, text: "Accédez à votre dossier médical et ordonnances" },
            { icon: Heart, text: "Suivi personnalisé de votre santé" },
            { icon: UserRound, text: "Gérez les RDV de toute votre famille" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-white/80">{text}</span>
            </div>
          ))}
        </div>

        <div aria-hidden className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/5" />
        <div aria-hidden className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-accent/10" />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col bg-[#F8FFFE] dark:bg-gray-900">
        <div className="lg:hidden bg-gradient-to-r from-primary to-foreground px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="h-5 w-5" />
            <span className="font-bold">Doktori</span>
          </div>
          <h1 className="text-lg font-bold">Créer votre espace patient</h1>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-foreground">Créer mon compte</h2>
              <p className="text-sm text-muted-foreground mt-1">Accédez à tous vos services de santé en ligne.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Full name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-foreground font-semibold">
                  Nom complet <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Prénom Nom"
                  required
                  value={form.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
                {touched.name && form.name.trim().length > 0 && form.name.trim().length < 2 && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    Le nom doit contenir au moins 2 caractères
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-foreground font-semibold">
                  Adresse email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
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
                  Numéro de téléphone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+216 XX XXX XXX"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`h-12 rounded-xl border-border focus-visible:ring-primary ${phoneError ? "border-red-400 focus-visible:ring-red-400" : ""}`}
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
                  Mot de passe <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimum 8 caractères"
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
                      Sécurité : {STRENGTH_CONFIG[passwordStrength].label}
                    </p>
                  </div>
                )}
                {passwordTooShort && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    Le mot de passe doit contenir au moins 8 caractères
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
                  J'accepte les{" "}
                  <a href="/cgu" className="text-primary font-semibold hover:underline">
                    Conditions Générales d'Utilisation
                  </a>{" "}
                  et la{" "}
                  <a href="/confidentialite" className="text-primary font-semibold hover:underline">
                    Politique de confidentialité
                  </a>{" "}
                  de Doktori.
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    Créer mon espace patient
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Déjà inscrit ?{" "}
              <a href="/connexion-patient" className="font-bold text-primary hover:underline">
                Se connecter
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
