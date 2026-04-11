"use client";

import { useState } from "react";

type Education = { degree: string; institution: string; year: number };
type Experience = { role: string; place: string; startYear: number; endYear: number | null };

type Props = {
  initial: {
    educations: Education[];
    experiences: Experience[];
    languages: string[];
    expertise: string[];
    yearsOfExperience: number | null;
  };
};

export function ParcoursEditor({ initial }: Props) {
  const [educations, setEducations] = useState<Education[]>(initial.educations);
  const [experiences, setExperiences] = useState<Experience[]>(initial.experiences);
  const [languages, setLanguages] = useState<string[]>(initial.languages);
  const [expertise, setExpertise] = useState<string[]>(initial.expertise);
  const [years, setYears] = useState<number | null>(initial.yearsOfExperience);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addEducation = () =>
    setEducations([...educations, { degree: "", institution: "", year: new Date().getFullYear() }]);
  const updateEducation = (i: number, patch: Partial<Education>) =>
    setEducations(educations.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const removeEducation = (i: number) =>
    setEducations(educations.filter((_, idx) => idx !== i));

  const addExperience = () =>
    setExperiences([
      ...experiences,
      { role: "", place: "", startYear: new Date().getFullYear(), endYear: null },
    ]);
  const updateExperience = (i: number, patch: Partial<Experience>) =>
    setExperiences(experiences.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const removeExperience = (i: number) =>
    setExperiences(experiences.filter((_, idx) => idx !== i));

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/doctor/profile/parcours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          educations: educations.filter((e) => e.degree && e.institution),
          experiences: experiences.filter((e) => e.role && e.place),
          languages: languages.filter(Boolean),
          expertise: expertise.filter(Boolean),
          yearsOfExperience: years,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Échec de la sauvegarde");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Années d&apos;expérience</h2>
        <input
          type="number"
          min={0}
          max={70}
          value={years ?? ""}
          onChange={(e) => setYears(e.target.value === "" ? null : Number(e.target.value))}
          className="w-32 rounded border px-3 py-2 text-sm"
          placeholder="ex. 12"
        />
      </section>

      <section className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Formation</h2>
          <button
            type="button"
            onClick={addEducation}
            className="text-sm text-teal-600 hover:underline"
          >
            + Ajouter
          </button>
        </div>
        {educations.length === 0 && (
          <p className="text-sm text-gray-400">Aucune formation renseignée.</p>
        )}
        <div className="space-y-3">
          {educations.map((edu, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <input
                className="col-span-5 rounded border px-2 py-1.5 text-sm"
                placeholder="Diplôme (ex. MD)"
                value={edu.degree}
                onChange={(e) => updateEducation(i, { degree: e.target.value })}
              />
              <input
                className="col-span-5 rounded border px-2 py-1.5 text-sm"
                placeholder="Établissement"
                value={edu.institution}
                onChange={(e) => updateEducation(i, { institution: e.target.value })}
              />
              <input
                type="number"
                className="col-span-1 rounded border px-2 py-1.5 text-sm"
                value={edu.year}
                onChange={(e) => updateEducation(i, { year: Number(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => removeEducation(i)}
                className="col-span-1 text-xs text-red-500 hover:underline"
              >
                Suppr.
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Expérience professionnelle</h2>
          <button
            type="button"
            onClick={addExperience}
            className="text-sm text-teal-600 hover:underline"
          >
            + Ajouter
          </button>
        </div>
        {experiences.length === 0 && (
          <p className="text-sm text-gray-400">Aucune expérience renseignée.</p>
        )}
        <div className="space-y-3">
          {experiences.map((exp, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <input
                className="col-span-4 rounded border px-2 py-1.5 text-sm"
                placeholder="Poste"
                value={exp.role}
                onChange={(e) => updateExperience(i, { role: e.target.value })}
              />
              <input
                className="col-span-4 rounded border px-2 py-1.5 text-sm"
                placeholder="Lieu"
                value={exp.place}
                onChange={(e) => updateExperience(i, { place: e.target.value })}
              />
              <input
                type="number"
                className="col-span-1 rounded border px-2 py-1.5 text-sm"
                placeholder="Début"
                value={exp.startYear}
                onChange={(e) => updateExperience(i, { startYear: Number(e.target.value) })}
              />
              <input
                type="number"
                className="col-span-2 rounded border px-2 py-1.5 text-sm"
                placeholder="Fin"
                value={exp.endYear ?? ""}
                onChange={(e) =>
                  updateExperience(i, {
                    endYear: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <button
                type="button"
                onClick={() => removeExperience(i)}
                className="col-span-1 text-xs text-red-500 hover:underline"
              >
                Suppr.
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Langues parlées</h2>
        <input
          type="text"
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Français, Arabe, Anglais (séparées par virgule)"
          value={languages.join(", ")}
          onChange={(e) =>
            setLanguages(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Expertises / sur-spécialités</h2>
        <input
          type="text"
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Diabète, Hypertension, Cardiologie du sport (séparées par virgule)"
          value={expertise.join(", ")}
          onChange={(e) =>
            setExpertise(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved && <span className="text-sm text-emerald-600">✓ Enregistré</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
