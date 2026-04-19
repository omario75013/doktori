"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Stethoscope,
  Loader2,
  Phone,
  Mail,
  AlertCircle,
  Calendar,
  FileText,
  Heart,
  UserRound,
} from "lucide-react";

type Tab = "phone" | "email";
type PhoneStep = "phone" | "code";

export default function ConnexionPatientPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("phone");

  // OTP flow
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  // Email flow
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearError() {
    setError(null);
  }

  // OTP handlers
  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Erreur lors de l'envoi du code");
      return;
    }
    setPhoneStep("code");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Code invalide");
      return;
    }
    const data = await res.json();
    localStorage.setItem("doktori_patient_token", data.token);
    router.push("/mon-espace");
  }

  // Email login handler
  async function loginWithEmail(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      const res = await fetch("/api/patients/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Identifiants invalides");
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
      {/* Left gradient panel */}
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
            Bienvenue <br />sur votre espace patient
          </h1>
          <p className="mt-4 text-white/70 text-sm leading-relaxed max-w-sm">
            Connectez-vous pour gérer vos rendez-vous médicaux, consulter vos ordonnances et suivre votre santé.
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
        {/* Mobile top bar */}
        <div className="lg:hidden bg-gradient-to-r from-primary to-foreground px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="h-5 w-5" />
            <span className="font-bold">Doktori</span>
          </div>
          <h1 className="text-lg font-bold">Mon espace patient</h1>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 hidden lg:block">
              <h2 className="text-2xl font-black text-foreground">Se connecter</h2>
              <p className="text-sm text-muted-foreground mt-1">Accédez à vos rendez-vous et votre dossier médical.</p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 p-1 mb-6 shadow-sm">
              <button
                onClick={() => { setActiveTab("phone"); clearError(); setPhoneStep("phone"); }}
                className={`flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "phone"
                    ? "bg-primary text-white shadow-sm"
                    : "text-foreground/60 hover:text-foreground hover:bg-secondary dark:hover:bg-gray-700"
                }`}
              >
                <Phone className="h-4 w-4" />
                Par téléphone
              </button>
              <button
                onClick={() => { setActiveTab("email"); clearError(); }}
                className={`flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "email"
                    ? "bg-primary text-white shadow-sm"
                    : "text-foreground/60 hover:text-foreground hover:bg-secondary dark:hover:bg-gray-700"
                }`}
              >
                <Mail className="h-4 w-4" />
                Par email
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 shadow-sm p-6">
              {/* Error banner — visible across all steps */}
              {error && (
                <div className="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Phone OTP — step 1 */}
              {activeTab === "phone" && phoneStep === "phone" && (
                <form onSubmit={requestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-foreground font-semibold text-sm">
                      Numéro de téléphone
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+216 XX XXX XXX"
                      required
                      className="h-12 rounded-xl border-border focus-visible:ring-primary"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark font-bold text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi...</>
                    ) : (
                      "Recevoir le code par SMS"
                    )}
                  </Button>
                </form>
              )}

              {/* Phone OTP — step 2 */}
              {activeTab === "phone" && phoneStep === "code" && (
                <form onSubmit={verifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="code" className="text-foreground font-semibold text-sm">
                      Code SMS
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Code envoyé au <span className="font-semibold">{phone}</span>
                    </p>
                    <Input
                      id="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      required
                      className="h-12 rounded-xl border-border focus-visible:ring-primary text-center text-xl tracking-widest font-bold"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark font-bold text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Vérification...</>
                    ) : (
                      "Valider"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setPhoneStep("phone"); setCode(""); clearError(); }}
                    className="w-full text-sm text-foreground/60 hover:text-primary transition-colors"
                  >
                    Changer de numéro
                  </button>
                </form>
              )}

              {/* Email tab */}
              {activeTab === "email" && (
                <form onSubmit={loginWithEmail} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-foreground font-semibold text-sm">
                      Adresse email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      autoComplete="email"
                      required
                      className="h-12 rounded-xl border-border focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-foreground font-semibold text-sm">
                      Mot de passe
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      autoComplete="current-password"
                      required
                      className="h-12 rounded-xl border-border focus-visible:ring-primary"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark font-bold text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connexion...</>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                </form>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Pas encore de compte ?{" "}
              <a href="/inscription-patient" className="font-bold text-primary hover:underline">
                Créer un compte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
