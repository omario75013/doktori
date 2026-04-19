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
} from "lucide-react";

export default function InscriptionPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function canSubmit(): boolean {
    return !!(
      form.name.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
      form.phone.trim().length >= 8 &&
      form.password.length >= 8
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      <div className="flex-1 flex flex-col bg-[#F8FFFE]">
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-foreground font-semibold">Nom complet</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Prénom Nom"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-foreground font-semibold">Adresse email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-foreground font-semibold">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+216 XX XXX XXX"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-foreground font-semibold">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
                {form.password.length > 0 && form.password.length < 8 && (
                  <p className="text-xs text-amber-600 mt-1">Le mot de passe doit contenir au moins 8 caractères</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </p>
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
