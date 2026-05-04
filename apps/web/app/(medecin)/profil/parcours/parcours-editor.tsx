"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("medecin.parcours");
  const tCommon = useTranslations("medecin.common");
  const [educations, setEducations] = useState<Education[]>(initial.educations);
  const [experiences, setExperiences] = useState<Experience[]>(initial.experiences);
  const [languages, setLanguages] = useState<string[]>(initial.languages);
  const [expertise, setExpertise] = useState<string[]>(initial.expertise);
  const [years, setYears] = useState<number | null>(initial.yearsOfExperience);
  const [saving, setSaving] = useState(false);

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
        throw new Error(body.error ?? tCommon("error"));
      }
      toast.success(t("savedSuccess"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tCommon("unknownError"));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-800 text-foreground dark:text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-5 shadow-sm">
        <h2 className="font-semibold mb-3 text-foreground">{t("yearsExperience")}</h2>
        <input
          type="number"
          min={0}
          max={70}
          value={years ?? ""}
          onChange={(e) => setYears(e.target.value === "" ? null : Number(e.target.value))}
          className={`w-32 ${inputCls}`}
          placeholder={t("yearsPlaceholder")}
        />
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">{t("educationLabel")}</h2>
          <button
            type="button"
            onClick={addEducation}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            {t("addButton")}
          </button>
        </div>
        {educations.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("noEducation")}</p>
        )}
        <div className="space-y-3">
          {educations.map((edu, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <input
                className={`col-span-5 ${inputCls}`}
                placeholder={t("degreePlaceholder")}
                value={edu.degree}
                onChange={(e) => updateEducation(i, { degree: e.target.value })}
              />
              <input
                className={`col-span-5 ${inputCls}`}
                placeholder={t("institutionLabel")}
                value={edu.institution}
                onChange={(e) => updateEducation(i, { institution: e.target.value })}
              />
              <input
                type="number"
                className={`col-span-1 ${inputCls}`}
                value={edu.year}
                onChange={(e) => updateEducation(i, { year: Number(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => removeEducation(i)}
                className="col-span-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                {tCommon("deleteShort")}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">{t("experienceLabel")}</h2>
          <button
            type="button"
            onClick={addExperience}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            {t("addButton")}
          </button>
        </div>
        {experiences.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("noExperience")}</p>
        )}
        <div className="space-y-3">
          {experiences.map((exp, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <input
                className={`col-span-4 ${inputCls}`}
                placeholder={t("positionLabel")}
                value={exp.role}
                onChange={(e) => updateExperience(i, { role: e.target.value })}
              />
              <input
                className={`col-span-4 ${inputCls}`}
                placeholder={t("locationLabel")}
                value={exp.place}
                onChange={(e) => updateExperience(i, { place: e.target.value })}
              />
              <input
                type="number"
                className={`col-span-1 ${inputCls}`}
                placeholder={t("startLabel")}
                value={exp.startYear}
                onChange={(e) => updateExperience(i, { startYear: Number(e.target.value) })}
              />
              <input
                type="number"
                className={`col-span-2 ${inputCls}`}
                placeholder={t("endLabel")}
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
                className="col-span-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                {tCommon("deleteShort")}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-5 shadow-sm">
        <h2 className="font-semibold mb-3 text-foreground">{t("languagesLabel")}</h2>
        <input
          type="text"
          className={`w-full ${inputCls}`}
          placeholder={t("languagesPlaceholder")}
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

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-5 shadow-sm">
        <h2 className="font-semibold mb-3 text-foreground">{t("expertiseLabel")}</h2>
        <input
          type="text"
          className={`w-full ${inputCls}`}
          placeholder={t("expertisePlaceholder")}
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
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {t("save")}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
