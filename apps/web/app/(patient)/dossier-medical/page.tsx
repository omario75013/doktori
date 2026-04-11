"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, ShieldCheck } from "lucide-react";

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

export default function DossierMedicalPage() {
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

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      window.location.href = "/mes-rdv";
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
          window.location.href = "/mes-rdv";
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
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
    setSaving(false);
    if (res.ok) setSavedAt(Date.now());
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0FDFA]/40 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-6 space-y-1">
          <div className="flex items-center gap-2 text-[#0891B2]">
            <Heart className="h-5 w-5" strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-wider">Mon dossier médical</span>
          </div>
          <h1 className="font-heading text-2xl font-black text-[#134E4A]">{patientName}</h1>
          <p className="text-sm text-[#134E4A]/60">
            Ces informations sont partagées avec le médecin que vous consultez sur Doktori.
          </p>
        </div>

        <form onSubmit={handleSave} className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-6 space-y-5">
          <h2 className="font-heading text-lg font-black text-[#134E4A]">Informations générales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date de naissance</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Sexe</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as "M" | "F" | "")}
                className="w-full rounded-md border border-[#E6F4F1] bg-white px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blood">Groupe sanguin</Label>
              <select
                id="blood"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full rounded-md border border-[#E6F4F1] bg-white px-3 py-2 text-sm"
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

          <h2 className="font-heading text-lg font-black text-[#134E4A] pt-2">Antécédents</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="allergies">Allergies connues</Label>
              <Textarea
                id="allergies"
                placeholder="Ex: pénicilline, arachides, pollen..."
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                maxLength={2000}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chronic">Maladies chroniques</Label>
              <Textarea
                id="chronic"
                placeholder="Ex: diabète type 2, hypertension, asthme..."
                value={chronic}
                onChange={(e) => setChronic(e.target.value)}
                maxLength={2000}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meds">Traitements en cours</Label>
              <Textarea
                id="meds"
                placeholder="Ex: metformine 500mg x2/jour, losartan 50mg..."
                value={meds}
                onChange={(e) => setMeds(e.target.value)}
                maxLength={2000}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Autres remarques</Label>
              <Textarea
                id="notes"
                placeholder="Grossesse, interventions chirurgicales, antécédents familiaux..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#0891B2] hover:bg-[#0E7490]">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
            {savedAt && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]">
                <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
                Enregistré
              </span>
            )}
          </div>
        </form>

        <div className="text-center">
          <a href="/mes-rdv" className="text-sm font-semibold text-[#0891B2] hover:underline">
            ← Retour à mes rendez-vous
          </a>
        </div>
      </div>
    </div>
  );
}
