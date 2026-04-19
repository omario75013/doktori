"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart,
  ShieldCheck,
  ClipboardList,
  Pill,
  Activity,
  Droplets,
  User,
  AlertCircle,
  Lock,
} from "lucide-react";

interface Profile {
  patient: {
    name: string;
    phone: string;
    dateOfBirth: string | null;
    gender: string | null;
    bloodType: string | null;
  };
  profile: {
    allergies: string | null;
    chronicConditions: string | null;
    currentMeds: string | null;
    notes: string | null;
  };
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const selectClass =
  "w-full h-12 rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow";

const labelClass = "text-foreground font-semibold text-sm";

export default function DossierMedicalPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"" | "M" | "F">("");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronic, setChronic] = useState("");
  const [meds, setMeds] = useState("");
  const [notes, setNotes] = useState("");
  const [patientName, setPatientName] = useState("");
  const [dobError, setDobError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.push("/mes-rdv");
      return;
    }
    setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/patients/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401) {
          localStorage.removeItem("doktori_patient_token");
          router.push("/mes-rdv");
          return null;
        }
        return r.ok ? ((await r.json()) as Profile) : null;
      })
      .then((data) => {
        if (!data) return;
        setPatientName(data.patient.name);
        setDob(data.patient.dateOfBirth ?? "");
        setGender((data.patient.gender as "M" | "F" | null) ?? "");
        setBloodType(data.patient.bloodType ?? "");
        setAllergies(data.profile.allergies ?? "");
        setChronic(data.profile.chronicConditions ?? "");
        setMeds(data.profile.currentMeds ?? "");
        setNotes(data.profile.notes ?? "");
        setLoading(false);
      });
  }, [token]);

  function validateDob(value: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    const now = new Date();
    if (date > now) return "La date de naissance ne peut pas être dans le futur.";
    const age = now.getFullYear() - date.getFullYear();
    if (age > 150) return "Veuillez saisir une date valide.";
    return null;
  }

  function handleDobChange(value: string) {
    setDob(value);
    setDobError(validateDob(value));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const dobValidation = validateDob(dob);
    if (dobValidation) {
      setDobError(dobValidation);
      return;
    }
    setSaving(true);
    setSavedAt(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/patients/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dateOfBirth: dob || undefined,
          gender: gender || undefined,
          bloodType: bloodType || undefined,
          allergies,
          chronicConditions: chronic,
          currentMeds: meds,
          notes,
        }),
      });
      if (res.ok) {
        setSavedAt(Date.now());
        toast.success("Dossier médical enregistré avec succès");
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Erreur lors de l'enregistrement.";
        setSaveError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "Une erreur est survenue. Veuillez réessayer.";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-foreground/60 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      {/* Teal gradient banner */}
      <div className="bg-gradient-to-br from-primary to-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
              <ClipboardList className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Mon dossier médical</h1>
              <p className="text-white/70 text-xs mt-0.5">{patientName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Data privacy notice */}
        <div className="rounded-2xl border border-[#0891B2]/30 bg-[#F0FDFA] p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-[#0891B2] flex-shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-[#134E4A]">Vos données médicales sont confidentielles et protégées</p>
            <p className="text-xs text-[#134E4A]/70 mt-0.5">
              Ces informations sont partagées uniquement avec le médecin que vous consultez sur Doktori.
            </p>
          </div>
        </div>

        {/* Context note */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-sm text-foreground/70">
            Ces informations sont partagées avec le médecin que vous consultez sur Doktori.
            Elles sont strictement confidentielles.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Informations générales */}
          <div className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <User className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <h2 className="font-bold text-foreground">Informations générales</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dob" className={labelClass}>Date de naissance</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className={`h-12 rounded-xl border-border focus-visible:ring-primary ${dobError ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                />
                {dobError && (
                  <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {dobError}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender" className={labelClass}>Sexe</Label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "M" | "F" | "")}
                  className={selectClass}
                >
                  <option value="">—</option>
                  <option value="M">Homme</option>
                  <option value="F">Femme</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blood" className={labelClass}>
                  <span className="flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5 text-red-500" />
                    Groupe sanguin
                  </span>
                </Label>
                <select
                  id="blood"
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {BLOOD_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Allergies */}
          <div className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50">
                <Heart className="h-4 w-4 text-red-500" strokeWidth={2} />
              </div>
              <h2 className="font-bold text-foreground">Allergies</h2>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="allergies" className={labelClass}>Allergies connues</Label>
              <Textarea
                id="allergies"
                placeholder="Ex: pénicilline, arachides, pollen..."
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                maxLength={2000}
                rows={2}
                className="rounded-xl border-border focus-visible:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Section: Traitements */}
          <div className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50">
                <Pill className="h-4 w-4 text-blue-500" strokeWidth={2} />
              </div>
              <h2 className="font-bold text-foreground">Traitements en cours</h2>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meds" className={labelClass}>Médicaments et posologie</Label>
              <Textarea
                id="meds"
                placeholder="Ex: metformine 500mg x2/jour, losartan 50mg..."
                value={meds}
                onChange={(e) => setMeds(e.target.value)}
                maxLength={2000}
                rows={2}
                className="rounded-xl border-border focus-visible:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Section: Maladies chroniques + notes */}
          <div className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50">
                <Activity className="h-4 w-4 text-orange-500" strokeWidth={2} />
              </div>
              <h2 className="font-bold text-foreground">Antécédents médicaux</h2>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chronic" className={labelClass}>Maladies chroniques</Label>
              <Textarea
                id="chronic"
                placeholder="Ex: diabète type 2, hypertension, asthme..."
                value={chronic}
                onChange={(e) => setChronic(e.target.value)}
                maxLength={2000}
                rows={2}
                className="rounded-xl border-border focus-visible:ring-primary resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes" className={labelClass}>Autres remarques</Label>
              <Textarea
                id="notes"
                placeholder="Grossesse, interventions chirurgicales, antécédents familiaux..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                rows={3}
                className="rounded-xl border-border focus-visible:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="space-y-3">
            {saveError && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
                {saveError}
              </div>
            )}
            <Button
              type="submit"
              disabled={saving || !!dobError}
              className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark font-bold text-white text-base transition-colors"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </span>
              ) : (
                "Enregistrer le dossier"
              )}
            </Button>
            {savedAt && (
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl py-2.5">
                <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
                Dossier enregistré avec succès
              </div>
            )}
          </div>
        </form>

        <div className="text-center pb-4">
          <a href="/mes-rdv" className="text-sm font-semibold text-primary hover:underline">
            ← Retour à mes rendez-vous
          </a>
        </div>
      </div>
    </div>
  );
}
