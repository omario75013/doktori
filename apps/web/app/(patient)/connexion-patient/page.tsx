"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Stethoscope,
  Loader2,
  Calendar,
  Phone,
  Mail,
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
    <div className="min-h-screen bg-[#F8FFFE] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0891B2]/10 mb-4">
            <Stethoscope className="h-7 w-7 text-[#0891B2]" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-black text-[#134E4A]">Mon espace patient</h1>
          <p className="text-sm text-[#134E4A]/60 mt-1">Connectez-vous pour accéder à vos rendez-vous</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white rounded-2xl border border-[#E6F4F1] p-1 mb-6 shadow-sm">
          <button
            onClick={() => { setActiveTab("phone"); clearError(); setPhoneStep("phone"); }}
            className={`flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "phone"
                ? "bg-[#0891B2] text-white shadow-sm"
                : "text-[#134E4A]/60 hover:text-[#134E4A] hover:bg-[#F0FDFA]"
            }`}
          >
            <Phone className="h-4 w-4" />
            Par téléphone
          </button>
          <button
            onClick={() => { setActiveTab("email"); clearError(); }}
            className={`flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "email"
                ? "bg-[#0891B2] text-white shadow-sm"
                : "text-[#134E4A]/60 hover:text-[#134E4A] hover:bg-[#F0FDFA]"
            }`}
          >
            <Mail className="h-4 w-4" />
            Par email
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6F4F1] shadow-sm p-6">
          {/* Phone OTP tab */}
          {activeTab === "phone" && phoneStep === "phone" && (
            <form onSubmit={requestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[#134E4A] font-semibold text-sm">
                  Numéro de téléphone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  required
                  className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] font-bold text-white"
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

          {activeTab === "phone" && phoneStep === "code" && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-[#134E4A] font-semibold text-sm">
                  Code SMS
                </Label>
                <p className="text-xs text-[#5E7574]">
                  Code envoyé au <span className="font-semibold">{phone}</span>
                </p>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2] text-center text-xl tracking-widest font-bold"
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] font-bold text-white"
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
                className="w-full text-sm text-[#134E4A]/60 hover:text-[#0891B2] transition-colors"
              >
                Changer de numéro
              </button>
            </form>
          )}

          {/* Email tab */}
          {activeTab === "email" && (
            <form onSubmit={loginWithEmail} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[#134E4A] font-semibold text-sm">
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
                  className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[#134E4A] font-semibold text-sm">
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
                  className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] font-bold text-white"
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

        <p className="text-center text-sm text-[#5E7574] mt-6">
          Pas encore de compte ?{" "}
          <a href="/inscription-patient" className="font-bold text-[#0891B2] hover:underline">
            Créer un compte
          </a>
        </p>
      </div>
    </div>
  );
}
