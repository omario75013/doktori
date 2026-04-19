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
  Building2,
} from "lucide-react";

// ─── Doctor steps ────────────────────────────────────────────────────────────

const DOCTOR_STEPS = [
  { id: "identity", label: "Identité", icon: User },
  { id: "practice", label: "Cabinet", icon: MapPin },
  { id: "finish", label: "Finaliser", icon: Shield },
];

const CLINIC_STEPS = [
  { id: "info", label: "Informations", icon: Building2 },
  { id: "confirm", label: "Confirmation", icon: Shield },
];

const fadeSlide = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const roleFade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

// ─── Role toggle ─────────────────────────────────────────────────────────────

type Role = "doctor" | "clinic";

function RoleToggle({
  role,
  onChange,
}: {
  role: Role;
  onChange: (r: Role) => void;
}) {
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Vous êtes…
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            {
              id: "doctor" as Role,
              icon: Stethoscope,
              title: "Médecin",
              sub: "Créez votre profil personnel",
            },
            {
              id: "clinic" as Role,
              icon: Building2,
              title: "Clinique",
              sub: "Gérez plusieurs médecins",
            },
          ] as const
        ).map(({ id, icon: Icon, title, sub }) => {
          const active = role === id;
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex flex-col items-start gap-1.5 rounded-2xl border-2 px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? "border-primary bg-[#F0FDFA] shadow-sm shadow-primary/10"
                  : "border-border bg-white hover:border-primary/40"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  active ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>
                {title}
              </span>
              <span className="text-xs text-muted-foreground">{sub}</span>
              {active && (
                <motion.div
                  layoutId="role-check"
                  className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Check className="h-3 w-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Clinic form ──────────────────────────────────────────────────────────────

function ClinicForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cguAccepted, setCguAccepted] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    city: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function next() {
    setDir(1);
    setStep((s) => Math.min(s + 1, CLINIC_STEPS.length - 1));
  }

  function prev() {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function canProceed(): boolean {
    if (step === 0) {
      return !!(
        form.name &&
        form.email &&
        form.phone &&
        form.password &&
        form.password.length >= 8 &&
        form.address &&
        form.city
      );
    }
    return cguAccepted;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/clinics/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          address: form.address,
          city: form.city,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Veuillez vérifier les informations saisies."
        );
        return;
      }

      const loginResult = await signIn("clinic-credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (!loginResult?.error) {
        router.push("/clinique/dashboard");
      } else {
        router.push(
          `/connexion?registered=1&role=clinic&email=${encodeURIComponent(form.email)}`
        );
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {CLINIC_STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <motion.div
                className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                  done
                    ? "bg-accent text-white"
                    : active
                      ? "bg-primary text-white shadow-lg shadow-primary/25"
                      : "bg-border text-muted-foreground"
                }`}
                animate={{ scale: active ? 1.05 : 1 }}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </motion.div>
              <div className="hidden sm:block">
                <div
                  className={`text-xs font-bold ${active ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {s.label}
                </div>
              </div>
              {i < CLINIC_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full mx-1 ${done ? "bg-accent" : "bg-border"}`}
                />
              )}
            </div>
          );
        })}
      </div>

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
          {/* ── Step 1: Info ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Informations de la clinique
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ces informations seront visibles sur votre profil.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-name" className="text-foreground font-semibold">
                  Nom de la clinique
                </Label>
                <Input
                  id="c-name"
                  name="name"
                  placeholder="Ex: Clinique Al Amal"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c-email" className="text-foreground font-semibold">
                    Email
                  </Label>
                  <Input
                    id="c-email"
                    name="email"
                    type="email"
                    placeholder="contact@clinique.tn"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="h-12 rounded-xl border-border focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone" className="text-foreground font-semibold">
                    Téléphone
                  </Label>
                  <Input
                    id="c-phone"
                    name="phone"
                    type="tel"
                    placeholder="+216 XX XXX XXX"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    className="h-12 rounded-xl border-border focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-address" className="text-foreground font-semibold">
                  Adresse
                </Label>
                <Input
                  id="c-address"
                  name="address"
                  placeholder="Rue, numéro, quartier"
                  required
                  value={form.address}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground font-semibold">Ville</Label>
                <Select
                  value={form.city}
                  onValueChange={(v) => setForm((p) => ({ ...p, city: v ?? "" }))}
                >
                  <SelectTrigger className="h-12 rounded-xl border-border">
                    <SelectValue placeholder="Choisir une ville..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-password" className="text-foreground font-semibold">
                  Mot de passe
                </Label>
                <Input
                  id="c-password"
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
                  <p className="text-xs text-amber-600 mt-1">
                    Le mot de passe doit contenir au moins 8 caractères
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Confirmation ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Confirmation</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Vérifiez vos informations avant de créer votre espace.
                </p>
              </div>

              {/* Summary card */}
              <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-accent" />
                  Récapitulatif
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nom:</span>{" "}
                    <span className="font-medium text-foreground">{form.name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-medium text-foreground">{form.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Téléphone:</span>{" "}
                    <span className="font-medium text-foreground">{form.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ville:</span>{" "}
                    <span className="font-medium text-foreground">
                      {CITIES.find((c) => c.id === form.city)?.label || "—"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Adresse:</span>{" "}
                    <span className="font-medium text-foreground">{form.address || "—"}</span>
                  </div>
                </div>
              </div>

              {/* CGU acceptance */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="c-cgu"
                  checked={cguAccepted}
                  onChange={(e) => setCguAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="c-cgu" className="text-sm text-muted-foreground">
                  J&apos;accepte les{" "}
                  <a
                    href="/legal/cgu"
                    target="_blank"
                    className="text-primary font-bold hover:underline"
                  >
                    Conditions Générales d&apos;Utilisation
                  </a>{" "}
                  et la{" "}
                  <a
                    href="/legal/confidentialite"
                    target="_blank"
                    className="text-primary font-bold hover:underline"
                  >
                    Politique de Confidentialité
                  </a>
                </label>
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

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        {step > 0 ? (
          <button
            type="button"
            onClick={prev}
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>
        ) : (
          <div />
        )}

        {step < CLINIC_STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={next}
            disabled={!canProceed()}
            className="h-12 px-8 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold shadow-lg shadow-primary/20 disabled:opacity-40"
          >
            Continuer
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={loading || !canProceed()}
            className="h-12 px-8 rounded-xl bg-accent hover:bg-doktori-green-dark text-white font-bold shadow-lg shadow-accent/20"
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
  );
}

// ─── Doctor form (unchanged logic) ───────────────────────────────────────────

function DoctorForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cguAccepted, setCguAccepted] = useState(false);

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
    setStep((s) => Math.min(s + 1, DOCTOR_STEPS.length - 1));
  }

  function prev() {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function canProceed(): boolean {
    if (step === 0)
      return !!(form.name && form.email && form.phone && form.password && form.password.length >= 8);
    if (step === 1) return !!(form.specialty && form.city && form.address);
    return cguAccepted;
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
        cguAccepted,
      };

      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Veuillez vérifier les informations saisies."
        );
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
    <form onSubmit={handleSubmit}>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {DOCTOR_STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <motion.div
                className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                  done
                    ? "bg-accent text-white"
                    : active
                      ? "bg-primary text-white shadow-lg shadow-primary/25"
                      : "bg-border text-muted-foreground"
                }`}
                animate={{ scale: active ? 1.05 : 1 }}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </motion.div>
              <div className="hidden sm:block">
                <div
                  className={`text-xs font-bold ${active ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {s.label}
                </div>
              </div>
              {i < DOCTOR_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full mx-1 ${done ? "bg-accent" : "bg-border"}`}
                />
              )}
            </div>
          );
        })}
      </div>

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
                <h2 className="text-xl font-bold text-foreground">Vos informations personnelles</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ces informations apparaîtront sur votre profil public.
                </p>
              </div>

              {/* Photo upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Photo de profil"
                      className="w-24 h-24 rounded-2xl object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center text-primary">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-doktori-teal-dark transition-colors">
                    <Upload className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">Photo de profil (recommandé)</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-foreground font-semibold">
                  {t("fullName")}
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Dr. Prénom Nom"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground font-semibold">
                    {t("email")}
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
                    className="h-12 rounded-xl border-border focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-foreground font-semibold">
                    {t("phone")}
                  </Label>
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-foreground font-semibold">
                  {t("password")}
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
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
                {form.password.length > 0 && form.password.length < 8 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Le mot de passe doit contenir au moins 8 caractères
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Practice ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Votre cabinet</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ces informations aident les patients à vous trouver.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground font-semibold">{t("specialty")}</Label>
                  <Select
                    value={form.specialty}
                    onValueChange={(v) => setForm((p) => ({ ...p, specialty: v ?? "" }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-border">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground font-semibold">{t("city")}</Label>
                  <Select
                    value={form.city}
                    onValueChange={(v) => setForm((p) => ({ ...p, city: v ?? "" }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-border">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-foreground font-semibold">
                  {t("address")}
                </Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Rue, numéro, quartier"
                  required
                  value={form.address}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Finish ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Derniers détails</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Optionnel — vous pouvez compléter plus tard.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-foreground font-semibold">
                  Biographie <span className="text-muted-foreground font-normal">(optionnel)</span>
                </Label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  maxLength={500}
                  placeholder="Présentez-vous en quelques mots : parcours, spécialités, approche..."
                  value={form.bio}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <p className="text-xs text-muted-foreground">{form.bio.length}/500</p>
              </div>

              {/* CGU acceptance */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="cgu"
                  checked={cguAccepted}
                  onChange={(e) => setCguAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="cgu" className="text-sm text-muted-foreground">
                  J&apos;accepte les{" "}
                  <a
                    href="/legal/cgu"
                    target="_blank"
                    className="text-primary font-bold hover:underline"
                  >
                    Conditions Générales d&apos;Utilisation
                  </a>{" "}
                  et la{" "}
                  <a
                    href="/legal/confidentialite"
                    target="_blank"
                    className="text-primary font-bold hover:underline"
                  >
                    Politique de Confidentialité
                  </a>
                </label>
              </div>

              {/* Summary card */}
              <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-accent" />
                  Récapitulatif
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nom:</span>{" "}
                    <span className="font-medium text-foreground">{form.name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-medium text-foreground">{form.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Spécialité:</span>{" "}
                    <span className="font-medium text-foreground">
                      {SPECIALTIES.find((s) => s.id === form.specialty)?.label || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ville:</span>{" "}
                    <span className="font-medium text-foreground">
                      {CITIES.find((c) => c.id === form.city)?.label || "—"}
                    </span>
                  </div>
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
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>
        ) : (
          <div />
        )}

        {step < DOCTOR_STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={next}
            disabled={!canProceed()}
            className="h-12 px-8 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold shadow-lg shadow-primary/20 disabled:opacity-40"
          >
            Continuer
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={loading}
            className="h-12 px-8 rounded-xl bg-accent hover:bg-doktori-green-dark text-white font-bold shadow-lg shadow-accent/20"
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
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InscriptionPage() {
  const [role, setRole] = useState<Role>("doctor");

  function handleRoleChange(next: Role) {
    setRole(next);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ═══ Left panel — brand + benefits ═══ */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-gradient-to-br from-primary via-doktori-teal-dark to-foreground text-white p-10 relative overflow-hidden">
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
            Des milliers de patients vous cherchent chaque jour. Créez votre profil en 2 minutes et
            recevez vos premiers rendez-vous.
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
        <div aria-hidden className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-accent/10" />
      </div>

      {/* ═══ Right panel — form ═══ */}
      <div className="flex-1 flex flex-col bg-[#F8FFFE]">
        {/* Mobile header */}
        <div className="lg:hidden bg-gradient-to-r from-primary to-foreground px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="h-5 w-5" />
            <span className="font-bold">Doktori</span>
          </div>
          <h1 className="text-lg font-bold">Créer votre espace</h1>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-lg">
            {/* Role toggle */}
            <RoleToggle role={role} onChange={handleRoleChange} />

            {/* Animated form swap */}
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                variants={roleFade}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                {role === "doctor" ? <DoctorForm /> : <ClinicForm />}
              </motion.div>
            </AnimatePresence>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Déjà inscrit ?{" "}
              <a href="/connexion" className="font-bold text-primary hover:underline">
                Se connecter
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
