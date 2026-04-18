"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import {
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  User,
  MapPin,
  Shield,
  Check,
  Loader2,
  BadgeCheck,
  Calendar,
  Video,
  Users,
  Camera,
  Upload,
} from "lucide-react";

const STEPS = [
  { id: "identity", label: "Identité", icon: User },
  { id: "practice", label: "Cabinet", icon: MapPin },
  { id: "finish", label: "Finaliser", icon: Shield },
];

const fadeSlide = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function InscriptionPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    specialty: "",
    city: "",
    address: "",
    consultationFee: "",
    bio: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("La photo ne doit pas dépasser 5 Mo");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function next() {
    setDir(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prev() {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function canProceed(): boolean {
    if (step === 0) return !!(form.name && form.email && form.phone && form.password && form.password.length >= 8);
    if (step === 1) return !!(form.specialty && form.city && form.address);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        specialty: form.specialty,
        city: form.city,
        address: form.address,
        consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
        bio: form.bio || undefined,
      };

      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Veuillez vérifier les informations saisies.");
        return;
      }

      const loginResult = await signIn("doctor-credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      // Upload photo if provided (after successful login so we have a session)
      if (!loginResult?.error && photoFile && data.id) {
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("doctorId", data.id);
        await fetch("/api/doctors/photo", { method: "POST", body: formData });
      }

      if (!loginResult?.error) {
        router.push("/dashboard");
      } else {
        router.push(`/connexion?registered=1&email=${encodeURIComponent(form.email)}`);
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ═══ Left panel — brand + benefits ═══ */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-gradient-to-br from-[#0891B2] via-[#0E7490] to-[#134E4A] text-white p-10 relative overflow-hidden">
        {/* Decorative grid */}
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
            Rejoignez la plateforme médicale n°1 en Tunisie
          </h1>
          <p className="mt-4 text-white/70 text-sm leading-relaxed max-w-sm">
            Des milliers de patients vous cherchent chaque jour. Créez votre profil en 2 minutes et recevez vos premiers rendez-vous.
          </p>
        </div>

        <div className="relative z-10 space-y-5 mt-auto">
          {[
            { icon: Calendar, text: "Agenda en ligne avec créneaux en temps réel" },
            { icon: Video, text: "Téléconsultation vidéo intégrée" },
            { icon: Users, text: "Gérez vos patients, SOAP notes, et CNAM" },
            { icon: Shield, text: "Données sécurisées et conformes" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-white/80">{text}</span>
            </div>
          ))}
        </div>

        {/* Decorative circles */}
        <div aria-hidden className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/5" />
        <div aria-hidden className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#22C55E]/10" />
      </div>

      {/* ═══ Right panel — form ═══ */}
      <div className="flex-1 flex flex-col bg-[#F8FFFE]">
        {/* Mobile header */}
        <div className="lg:hidden bg-gradient-to-r from-[#0891B2] to-[#134E4A] px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="h-5 w-5" />
            <span className="font-bold">Doktori</span>
          </div>
          <h1 className="text-lg font-bold">Créer votre espace médecin</h1>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-lg">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = i < step;
                const active = i === step;
                return (
                  <div key={s.id} className="flex items-center gap-2 flex-1">
                    <motion.div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                        done
                          ? "bg-[#22C55E] text-white"
                          : active
                            ? "bg-[#0891B2] text-white shadow-lg shadow-[#0891B2]/25"
                            : "bg-[#E6F4F1] text-[#5E7574]"
                      }`}
                      animate={{ scale: active ? 1.05 : 1 }}
                    >
                      {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </motion.div>
                    <div className="hidden sm:block">
                      <div className={`text-xs font-bold ${active ? "text-[#134E4A]" : "text-[#5E7574]"}`}>
                        {s.label}
                      </div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 rounded-full mx-1 ${done ? "bg-[#22C55E]" : "bg-[#E6F4F1]"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={fadeSlide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                >
                  {/* ── Step 1: Identity ── */}
                  {step === 0 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold text-[#134E4A]">Vos informations personnelles</h2>
                        <p className="text-sm text-[#5E7574] mt-1">Ces informations apparaîtront sur votre profil public.</p>
                      </div>

                      {/* Photo upload */}
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          {photoPreview ? (
                            <img
                              src={photoPreview}
                              alt="Photo de profil"
                              className="w-24 h-24 rounded-2xl object-cover ring-2 ring-[#E6F4F1]"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-2xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
                              <Camera className="w-8 h-8" />
                            </div>
                          )}
                          <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#0891B2] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#0E7490] transition-colors">
                            <Upload className="w-4 h-4 text-white" />
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={handlePhotoChange}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-[#5E7574]">Photo de profil (recommandé)</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-[#134E4A] font-semibold">{t("fullName")}</Label>
                        <Input
                          id="name" name="name" placeholder="Dr. Prénom Nom" required
                          value={form.name} onChange={handleChange}
                          className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-[#134E4A] font-semibold">{t("email")}</Label>
                          <Input
                            id="email" name="email" type="email" placeholder="votre@email.com"
                            autoComplete="email" required value={form.email} onChange={handleChange}
                            className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-[#134E4A] font-semibold">{t("phone")}</Label>
                          <Input
                            id="phone" name="phone" type="tel" placeholder="+216 XX XXX XXX"
                            required value={form.phone} onChange={handleChange}
                            className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-[#134E4A] font-semibold">{t("password")}</Label>
                        <Input
                          id="password" name="password" type="password" placeholder="Minimum 8 caractères"
                          autoComplete="new-password" required value={form.password} onChange={handleChange}
                          className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
                        />
                        {form.password.length > 0 && form.password.length < 8 && (
                          <p className="text-xs text-amber-600 mt-1">Le mot de passe doit contenir au moins 8 caractères</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Step 2: Practice ── */}
                  {step === 1 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold text-[#134E4A]">Votre cabinet</h2>
                        <p className="text-sm text-[#5E7574] mt-1">Ces informations aident les patients à vous trouver.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[#134E4A] font-semibold">{t("specialty")}</Label>
                          <Select
                            value={form.specialty}
                            onValueChange={(v) => setForm((p) => ({ ...p, specialty: v ?? "" }))}
                          >
                            <SelectTrigger className="h-12 rounded-xl border-[#E6F4F1]">
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                            <SelectContent>
                              {SPECIALTIES.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[#134E4A] font-semibold">{t("city")}</Label>
                          <Select
                            value={form.city}
                            onValueChange={(v) => setForm((p) => ({ ...p, city: v ?? "" }))}
                          >
                            <SelectTrigger className="h-12 rounded-xl border-[#E6F4F1]">
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CITIES.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="address" className="text-[#134E4A] font-semibold">{t("address")}</Label>
                        <Input
                          id="address" name="address" placeholder="Rue, numéro, quartier"
                          required value={form.address} onChange={handleChange}
                          className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
                        />
                      </div>
                    </div>
                  )}

                  {/* ── Step 3: Finish ── */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold text-[#134E4A]">Derniers détails</h2>
                        <p className="text-sm text-[#5E7574] mt-1">Optionnel — vous pouvez compléter plus tard.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="bio" className="text-[#134E4A] font-semibold">
                          Biographie <span className="text-[#5E7574] font-normal">(optionnel)</span>
                        </Label>
                        <textarea
                          id="bio" name="bio" rows={4} maxLength={500}
                          placeholder="Présentez-vous en quelques mots : parcours, spécialités, approche..."
                          value={form.bio} onChange={handleChange}
                          className="w-full rounded-xl border border-[#E6F4F1] bg-white px-4 py-3 text-sm transition-colors outline-none placeholder:text-[#5E7574]/50 focus:border-[#0891B2] focus:ring-2 focus:ring-[#0891B2]/20 resize-none"
                        />
                        <p className="text-xs text-[#5E7574]">{form.bio.length}/500</p>
                      </div>

                      {/* Summary card */}
                      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5 space-y-3">
                        <h3 className="text-sm font-bold text-[#134E4A] flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4 text-[#22C55E]" />
                          Récapitulatif
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-[#5E7574]">Nom:</span> <span className="font-medium text-[#134E4A]">{form.name || "—"}</span></div>
                          <div><span className="text-[#5E7574]">Email:</span> <span className="font-medium text-[#134E4A]">{form.email || "—"}</span></div>
                          <div><span className="text-[#5E7574]">Spécialité:</span> <span className="font-medium text-[#134E4A]">{SPECIALTIES.find((s) => s.id === form.specialty)?.label || "—"}</span></div>
                          <div><span className="text-[#5E7574]">Ville:</span> <span className="font-medium text-[#134E4A]">{CITIES.find((c) => c.id === form.city)?.label || "—"}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-4"
                >
                  {error}
                </motion.p>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={prev}
                    className="flex items-center gap-1 text-sm font-semibold text-[#5E7574] hover:text-[#134E4A] transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour
                  </button>
                ) : (
                  <div />
                )}

                {step < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={next}
                    disabled={!canProceed()}
                    className="h-12 px-8 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white font-bold shadow-lg shadow-[#0891B2]/20 disabled:opacity-40"
                  >
                    Continuer
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-8 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold shadow-lg shadow-[#22C55E]/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Création...
                      </>
                    ) : (
                      <>
                        Créer mon espace
                        <Check className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>

            <p className="text-center text-sm text-[#5E7574] mt-8">
              Déjà inscrit ?{" "}
              <a href="/connexion" className="font-bold text-[#0891B2] hover:underline">
                Se connecter
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
