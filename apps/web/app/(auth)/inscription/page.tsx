"use client";

import { useEffect, useState } from "react";
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
  FlaskConical,
} from "lucide-react";

// ─── Doctor steps ────────────────────────────────────────────────────────────

function getDoctorSteps(t: ReturnType<typeof useTranslations<"auth">>) {
  return [
    { id: "identity", label: t("stepIdentity"), icon: User },
    { id: "practice", label: t("stepPractice"), icon: MapPin },
    { id: "finish", label: t("stepFinish"), icon: Shield },
  ];
}

function getClinicSteps(t: ReturnType<typeof useTranslations<"auth">>) {
  return [
    { id: "info", label: t("stepInfo"), icon: Building2 },
    { id: "confirm", label: t("stepConfirmation"), icon: Shield },
  ];
}

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

type Role = "doctor" | "clinic" | "lab";

function RoleToggle({
  role,
  onChange,
}: {
  role: Role;
  onChange: (r: Role) => void;
}) {
  const t = useTranslations("auth");
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        {t("youAre")}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            {
              id: "doctor" as Role,
              icon: Stethoscope,
              title: t("roleDoctor"),
              sub: t("roleDoctorSub"),
            },
            {
              id: "clinic" as Role,
              icon: Building2,
              title: t("roleClinic"),
              sub: t("roleClinicSub"),
            },
            {
              id: "lab" as Role,
              icon: FlaskConical,
              title: t("roleLab"),
              sub: t("roleLabSub"),
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
  const t = useTranslations("auth");
  const CLINIC_STEPS = getClinicSteps(t);
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
            : t("checkFormError")
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
      setError(t("registerError"));
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
                  {t("clinicInfoTitle")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("clinicInfoSubtitle")}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-name" className="text-foreground font-semibold">
                  {t("clinicName")}
                </Label>
                <Input
                  id="c-name"
                  name="name"
                  placeholder={t("clinicNamePlaceholder")}
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c-email" className="text-foreground font-semibold">
                    {t("email")}
                  </Label>
                  <Input
                    id="c-email"
                    name="email"
                    type="email"
                    placeholder={t("clinicEmailPlaceholder")}
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="h-12 rounded-xl border-border focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone" className="text-foreground font-semibold">
                    {t("phone")}
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
                  {t("address")}
                </Label>
                <Input
                  id="c-address"
                  name="address"
                  placeholder={t("addressPlaceholder")}
                  required
                  value={form.address}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground font-semibold">{t("city")}</Label>
                <Select
                  value={form.city}
                  onValueChange={(v) => setForm((p) => ({ ...p, city: v ?? "" }))}
                >
                  <SelectTrigger className="h-12 rounded-xl border-border">
                    <SelectValue placeholder={t("chooseCity")} />
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
                  {t("password")}
                </Label>
                <Input
                  id="c-password"
                  name="password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
                {form.password.length > 0 && form.password.length < 8 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t("passwordTooShort")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Confirmation ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">{t("clinicConfirmTitle")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("clinicConfirmSubtitle")}
                </p>
              </div>

              {/* Summary card */}
              <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-accent" />
                  {t("summaryTitle")}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("summaryName")}</span>{" "}
                    <span className="font-medium text-foreground">{form.name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("summaryEmail")}</span>{" "}
                    <span className="font-medium text-foreground">{form.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("summaryPhone")}</span>{" "}
                    <span className="font-medium text-foreground">{form.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("summaryCity")}</span>{" "}
                    <span className="font-medium text-foreground">
                      {CITIES.find((c) => c.id === form.city)?.label || "—"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{t("summaryAddress")}</span>{" "}
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
                  {t("cguAccept")}{" "}
                  <a
                    href="/legal/cgu"
                    target="_blank"
                    className="text-primary font-bold hover:underline"
                  >
                    {t("cguLink")}
                  </a>{" "}
                  {t("cguAnd")}{" "}
                  <a
                    href="/legal/confidentialite"
                    target="_blank"
                    className="text-primary font-bold hover:underline"
                  >
                    {t("privacyLink")}
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
            {t("back")}
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
            {t("continue")}
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
                {t("creating")}
              </>
            ) : (
              <>
                {t("createSpace")}
                <Check className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}

// ─── Lab form ────────────────────────────────────────────────────────────────
// New medical lab / radiology centre signup. Posts to /api/labs/register
// which creates the row with `verification_status='pending'`. We DON'T sign
// the user in afterwards — the lab cannot log in until an admin verifies it.

const LAB_SERVICE_OPTIONS = [
  "analyses_medicales",
  "radiologie",
  "imagerie",
  "echographie",
];

function LabForm() {
  const t = useTranslations("auth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    city: "",
    services: [] as string[],
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }
  function toggleService(s: string) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(s)
        ? prev.services.filter((x) => x !== s)
        : [...prev.services, s],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!cguAccepted) return;
    setLoading(true);
    try {
      const res = await fetch("/api/labs/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("checkFormError"));
        return;
      }
      setSubmitted(true);
    } catch {
      setError(t("registerError"));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white">
          <Check className="h-8 w-8" strokeWidth={3} />
        </div>
        <h2 className="font-heading text-2xl font-black text-foreground">
          {t("labPendingTitle")}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("labPendingBody")}
        </p>
      </div>
    );
  }

  const ready =
    form.name.length >= 3 &&
    form.email &&
    form.phone &&
    form.password.length >= 8 &&
    form.address &&
    form.city &&
    cguAccepted;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark mb-1">
            {t("labName")}
          </label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            className="w-full h-11 rounded-xl border-2 border-border px-4 text-sm focus:border-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark mb-1">
            {t("emailLabel")}
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            className="w-full h-11 rounded-xl border-2 border-border px-4 text-sm focus:border-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark mb-1">
            {t("phoneLabel")}
          </label>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            required
            placeholder="71 XXX XXX"
            className="w-full h-11 rounded-xl border-2 border-border px-4 text-sm focus:border-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark mb-1">
            {t("cityLabel")}
          </label>
          <input
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            required
            className="w-full h-11 rounded-xl border-2 border-border px-4 text-sm focus:border-primary outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark mb-1">
            {t("addressLabel")}
          </label>
          <input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            required
            className="w-full h-11 rounded-xl border-2 border-border px-4 text-sm focus:border-primary outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark mb-1">
            {t("passwordLabel")}
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={8}
            className="w-full h-11 rounded-xl border-2 border-border px-4 text-sm focus:border-primary outline-none"
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-doktori-teal-dark mb-2">
          {t("labServices")}
        </p>
        <div className="flex flex-wrap gap-2">
          {LAB_SERVICE_OPTIONS.map((s) => {
            const active = form.services.includes(s);
            return (
              <button
                type="button"
                key={s}
                onClick={() => toggleService(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white hover:border-primary/50"
                }`}
              >
                {t(`labService_${s}` as never, { default: s } as never) ?? s}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={cguAccepted}
          onChange={(e) => setCguAccepted(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span>{t("acceptTerms")}</span>
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !ready}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-heading text-base font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submitLab")}
      </button>
    </form>
  );
}

// ─── Doctor form (unchanged logic) ───────────────────────────────────────────

function DoctorForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const DOCTOR_STEPS = getDoctorSteps(t);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cguAccepted, setCguAccepted] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Capture ?ref= from URL on mount and persist across the multi-step flow
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      try {
        localStorage.setItem("doktori_doctor_ref", ref);
      } catch {}
    }
  }, []);

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
      setError(t("photoTooLarge"));
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
            : t("checkFormError")
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

      // Track doctor-to-doctor referral if a ?ref= was captured
      if (!loginResult?.error) {
        try {
          const ref = localStorage.getItem("doktori_doctor_ref");
          if (ref) {
            await fetch("/api/medecin/referrals/track", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ referrerCode: ref }),
            });
            localStorage.removeItem("doktori_doctor_ref");
          }
        } catch (e) {
          // best-effort, do not block signup
          console.warn("[doctor-referral-track] failed", e);
        }
      }

      if (!loginResult?.error) {
        router.push("/dashboard");
      } else {
        router.push(`/connexion?registered=1&email=${encodeURIComponent(form.email)}`);
      }
    } catch {
      setError(t("registerError"));
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
                <h2 className="text-xl font-bold text-foreground">{t("personalInfoTitle")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("personalInfoSubtitle")}
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
                <p className="text-xs text-muted-foreground">{t("profilePhoto")}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-foreground font-semibold">
                  {t("fullName")}
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t("namePlaceholder")}
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
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
                {form.password.length > 0 && form.password.length < 8 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t("passwordTooShort")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Practice ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">{t("practiceTitle")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("practiceSubtitle")}
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
                      <SelectValue placeholder={t("chooseOne")} />
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
                      <SelectValue placeholder={t("chooseOne")} />
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
                  placeholder={t("addressPlaceholder")}
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
                <h2 className="text-xl font-bold text-foreground">{t("finishTitle")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("finishSubtitle")}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-foreground font-semibold">
                  {t("bioLabel")} <span className="text-muted-foreground font-normal">{t("bioOptional")}</span>
                </Label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  maxLength={500}
                  placeholder={t("bioPlaceholder")}
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
                  {t("cguAccept")}{" "}
                  <a
                    href="/legal/cgu"
                    target="_blank"
                    className="text-primary font-bold hover:underline"
                  >
                    {t("cguLink")}
                  </a>{" "}
                  {t("cguAnd")}{" "}
                  <a
                    href="/legal/confidentialite"
                    target="_blank"
                    className="text-primary font-bold hover:underline"
                  >
                    {t("privacyLink")}
                  </a>
                </label>
              </div>

              {/* Summary card */}
              <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-accent" />
                  {t("summaryTitle")}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("summaryName")}</span>{" "}
                    <span className="font-medium text-foreground">{form.name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("summaryEmail")}</span>{" "}
                    <span className="font-medium text-foreground">{form.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("summarySpecialty")}</span>{" "}
                    <span className="font-medium text-foreground">
                      {SPECIALTIES.find((s) => s.id === form.specialty)?.label || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("summaryCity")}</span>{" "}
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
            {t("back")}
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
            {t("continue")}
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
                {t("creating")}
              </>
            ) : (
              <>
                {t("createSpace")}
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
  const t = useTranslations("auth");
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
            {t("registerHeroTitle")}
          </h1>
          <p className="mt-4 text-white/70 text-sm leading-relaxed max-w-sm">
            {t("registerHeroDesc")}
          </p>
        </div>

        <div className="relative z-10 space-y-5 mt-auto">
          {[
            { icon: Calendar, text: t("registerHeroBenefit1") },
            { icon: Video, text: t("registerHeroBenefit2") },
            { icon: Users, text: t("registerHeroBenefit3") },
            { icon: Shield, text: t("registerHeroBenefit4") },
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
          <h1 className="text-lg font-bold">{t("registerMobileTitle")}</h1>
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
                {role === "doctor" ? <DoctorForm /> : role === "lab" ? <LabForm /> : <ClinicForm />}
              </motion.div>
            </AnimatePresence>

            <p className="text-center text-sm text-muted-foreground mt-8">
              {t("alreadyRegistered")}{" "}
              <a href="/connexion" className="font-bold text-primary hover:underline">
                {t("signIn")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
