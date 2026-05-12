"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ar, fr } from "date-fns/locale";
import {
  Shield,
  Plus,
  Download,
  Activity,
  ChevronRight,
} from "lucide-react";

interface PatientProfile {
  id: string;
  name?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  photoUrl?: string | null;
}

function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

function bmi(h?: number | null, w?: number | null): string {
  if (!h || !w) return "—";
  const m = h / 100;
  return (w / (m * m)).toFixed(1);
}

export default function DossierMedicalPage() {
  const router = useRouter();
  const t = useTranslations("patient.dossier");
  const tc = useTranslations("patient.dossier.common");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : fr;
  const dateFnsLocaleTag = locale === "ar" ? "ar-TN" : "fr-FR";
  const RELATION_LABEL: Record<string, string> = {
    child: tc("relation.child"),
    parent: tc("relation.parent"),
    spouse: tc("relation.spouse"),
    sibling: tc("relation.sibling"),
    other: tc("relation.other"),
  };
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [dependents, setDependents] = useState<Array<{ id: string; name: string; relation: string | null; dateOfBirth: string | null; gender: string | null }>>([]);
  const [allergies, setAllergies] = useState<Array<{ id: string; allergen: string; severity: "mild" | "moderate" | "severe" }>>([]);
  const [vaccinations, setVaccinations] = useState<Array<{ id: string; vaccineName: string; dateReceived: string }>>([]);
  const [medications, setMedications] = useState<Array<{ id: string; medicationName: string; dosage: string | null; frequency: string | null; endedAt: string | null }>>([]);
  const [consultations, setConsultations] = useState<Array<{ id: string; doctorName: string; createdAt: string; assessment: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let legacy: string | null = null;
    try { legacy = localStorage.getItem("doktori_patient_token"); } catch {}
    (async () => {
      let r = await fetch("/api/patients/me", { credentials: "include" });
      if (!r.ok && legacy) {
        r = await fetch("/api/patients/me", {
          credentials: "include",
          headers: { Authorization: `Bearer ${legacy}` },
        });
      }
      if (!r.ok) {
        router.replace("/connexion-patient");
        return;
      }
      try { sessionStorage.setItem("doktori_patient_session", "1"); } catch {}
      const data = await r.json();
      setProfile(data);

      // Load dossier data in parallel — non-fatal if anything fails.
      void Promise.all([
        fetch("/api/me/dependents", { credentials: "include" })
          .then((res) => (res.ok ? res.json() : { items: [] }))
          .then((d) => setDependents(Array.isArray(d.items) ? d.items : []))
          .catch(() => {}),
        fetch("/api/me/allergies", { credentials: "include" })
          .then((res) => (res.ok ? res.json() : { allergies: [] }))
          .then((d) => setAllergies(Array.isArray(d.allergies) ? d.allergies : []))
          .catch(() => {}),
        fetch("/api/me/vaccinations", { credentials: "include" })
          .then((res) => (res.ok ? res.json() : { vaccinations: [] }))
          .then((d) => setVaccinations(Array.isArray(d.vaccinations) ? d.vaccinations : []))
          .catch(() => {}),
        fetch("/api/me/medications", { credentials: "include" })
          .then((res) => (res.ok ? res.json() : { medications: [] }))
          .then((d) => setMedications(Array.isArray(d.medications) ? d.medications : []))
          .catch(() => {}),
        fetch("/api/patients/me/documents", { credentials: "include" })
          .then((res) => (res.ok ? res.json() : { consultationNotes: [] }))
          .then((d) => setConsultations(Array.isArray(d.consultationNotes) ? d.consultationNotes : []))
          .catch(() => {}),
      ]);

      setLoading(false);
    })().catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = (profile?.name ?? "?")
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  const age = ageFromDob(profile?.dateOfBirth);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div className="ds-eyebrow">{t("eyebrow")}</div>
          <h1 className="ds-page-title">{t("title")}</h1>
          <p className="ds-page-sub">{t("subtitle")}</p>
        </div>
        <button type="button" className="ds-btn ds-btn-soft">
          <Shield className="w-4 h-4" /> {t("manageSharing")}
        </button>
      </div>

      {/* Health summary banner */}
      <div
        className="ds-card-patient mb-5"
        style={{
          background: "linear-gradient(135deg, var(--primary-700), var(--primary-500))",
          border: "none",
          color: "#fff",
        }}
      >
        <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-center">
          <div
            className="w-16 h-16 rounded-full grid place-items-center font-extrabold text-[18px] overflow-hidden"
            style={{ background: "linear-gradient(135deg,#fff,#A9DAD2)", color: "var(--primary-700)" }}
          >
            {profile?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoUrl}
                alt={profile.name ?? t("patientAlt")}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <div className="text-[22px] font-extrabold mb-0.5" style={{ fontFamily: "Manrope, sans-serif" }}>
              {profile?.name ?? t("patientAlt")}
            </div>
            <div className="text-[13px] opacity-85">
              {profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString(dateFnsLocaleTag) : t("dobMissing")}
              {age !== null ? ` · ${t("yearsOld", { age })}` : ""}
              {profile?.gender ? ` · ${profile.gender}` : ""}
            </div>
            <div className="flex gap-5 mt-3.5 flex-wrap">
              <Fact label={t("fact.blood")} value={profile?.bloodType ?? "—"} />
              <Fact label={t("fact.height")} value={profile?.heightCm ? `${profile.heightCm} cm` : "—"} />
              <Fact label={t("fact.weight")} value={profile?.weightKg ? `${profile.weightKg} kg` : "—"} />
              <Fact label={t("fact.bmi")} value={bmi(profile?.heightCm, profile?.weightKg)} />
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="text-[11px] opacity-70 font-bold tracking-wider uppercase">{t("patientId")}</div>
            <div className="font-mono text-[13px] font-semibold">
              DKT-{(profile?.id ?? "").slice(0, 4).toUpperCase()}-{(profile?.id ?? "").slice(4, 8).toUpperCase()}
            </div>
            <button
              type="button"
              className="ds-btn ds-btn-sm"
              style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}
            >
              <Download className="w-3.5 h-3.5" /> {t("exportPdf")}
            </button>
          </div>
        </div>
      </div>

      {/* 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
        {/* LEFT col */}
        <div className="flex flex-col gap-5">
          <Section title={t("sections.allergies")} actionHref="/dossier-medical/allergies" addLabel={tc("add")}>
            {allergies.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--ink-500)" }}>
                {t("empty.allergies")}
              </p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {allergies.slice(0, 8).map((a) => (
                  <AllergyChip
                    key={a.id}
                    label={a.allergen}
                    severity={a.severity === "severe" ? "high" : "med"}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section title={t("sections.antecedents")} actionHref="/dossier-medical/analyses" addLabel={tc("add")}>
            <p className="text-[13px]" style={{ color: "var(--ink-500)" }}>
              {t("empty.antecedents")}
            </p>
          </Section>

          <Section title={t("sections.vaccinations")} actionLabel={t("fullBook")} actionHref="/dossier-medical/vaccinations" addLabel={tc("add")}>
            {vaccinations.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--ink-500)" }}>
                {t("empty.vaccinations")}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {vaccinations.slice(0, 6).map((v) => (
                  <VaccineRow
                    key={v.id}
                    label={v.vaccineName}
                    date={new Date(v.dateReceived).toLocaleDateString(dateFnsLocaleTag, {
                      month: "2-digit",
                      year: "numeric",
                    })}
                    due="—"
                    status="ok"
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* RIGHT col */}
        <div className="flex flex-col gap-5">
          <Section title={t("sections.treatments")} actionHref="/dossier-medical/traitements" addLabel={tc("add")}>
            {medications.filter((m) => !m.endedAt).length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--ink-500)" }}>
                {t("empty.treatments")}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {medications
                  .filter((m) => !m.endedAt)
                  .slice(0, 6)
                  .map((m, i) => (
                    <TreatmentRow
                      key={m.id}
                      name={m.medicationName}
                      dose={
                        [m.dosage, m.frequency].filter(Boolean).join(" · ") || "—"
                      }
                      until={t("longTerm")}
                      tone={i % 2 === 0 ? "sky" : "amber"}
                    />
                  ))}
              </div>
            )}
          </Section>

          <Section title={t("sections.recentConsultations")} addLabel={tc("add")}>
            {consultations.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--ink-500)" }}>
                {t("empty.consultations")}
              </p>
            ) : (
              <div className="relative ps-5">
                <div className="absolute left-1.5 top-1.5 bottom-1.5 w-0.5" style={{ background: "var(--line-cool)" }} />
                {consultations.slice(0, 5).map((c) => (
                  <ConsultDot
                    key={c.id}
                    when={new Date(c.createdAt).toLocaleDateString(dateFnsLocaleTag, {
                      day: "numeric",
                      month: "long",
                    })}
                    who={c.doctorName}
                    what={c.assessment?.slice(0, 60) || t("consultation")}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section title={t("sections.relatives")} actionHref="/ma-famille" addLabel={tc("add")}>
            {dependents.length === 0 ? (
              <div className="flex flex-col gap-2">
                <FamilyRow
                  name={t("empty.relativesName")}
                  rel={t("empty.relativesSub")}
                  hue={["#5BAEBB", "#0F7B8A"]}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {dependents.map((d) => {
                  const relLabel = RELATION_LABEL[d.relation ?? ""] ?? tc("relation.default");
                  const age = ageFromDob(d.dateOfBirth);
                  return (
                    <FamilyRow
                      key={d.id}
                      name={d.name}
                      rel={age !== null ? `${relLabel} · ${t("yearsOld", { age })}` : relLabel}
                      hue={["#5BAEBB", "#0F7B8A"]}
                    />
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ───────── helpers ───────── */

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] opacity-70 font-bold uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[18px] font-extrabold" style={{ fontFamily: "Manrope, sans-serif" }}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  actionHref,
  actionLabel,
  addLabel,
}: {
  title: string;
  children: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  addLabel: string;
}) {
  const isAdd = !actionLabel;
  return (
    <div className="ds-card-patient">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-[16px]" style={{ color: "var(--ink-900)" }}>
          {title}
        </div>
        {actionHref && (
          <a
            href={actionHref}
            className="inline-flex items-center gap-1 text-[13px] font-bold"
            style={{ color: "var(--primary-600)" }}
          >
            {isAdd ? (
              <>
                <Plus className="w-3.5 h-3.5" /> {addLabel}
              </>
            ) : (
              <>
                {actionLabel} <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </a>
        )}
      </div>
      {children}
    </div>
  );
}

function AllergyChip({ label, severity }: { label: string; severity: "high" | "med" }) {
  const map = {
    high: { bg: "var(--tone-coral-bg)", col: "#B05F3D", dot: "#D67455" },
    med: { bg: "var(--tone-amber-bg)", col: "#8B6224", dot: "#DDA45B" },
  } as const;
  const s = map[severity];
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px] font-semibold"
      style={{ background: s.bg, color: s.col }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
      {label}
    </span>
  );
}

function HistoryRow({
  year,
  label,
  sub,
  chip,
  chipL,
}: {
  year: string;
  label: string;
  sub: string;
  chip: "rose" | "amber" | "sky";
  chipL: string;
}) {
  return (
    <div className="flex items-center gap-3.5 py-3" style={{ borderBottom: "1px solid var(--line-cool)" }}>
      <div
        className="font-extrabold text-[14px] shrink-0"
        style={{ color: "var(--ink-700)", width: 48, fontFamily: "Manrope, sans-serif" }}
      >
        {year}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[13.5px]" style={{ color: "var(--ink-900)" }}>
          {label}
        </div>
        <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
          {sub}
        </div>
      </div>
      <span className={`ds-chip ds-chip-${chip}`}>{chipL}</span>
    </div>
  );
}

function VaccineRow({
  label,
  date,
  due,
  status,
}: {
  label: string;
  date: string;
  due: string;
  status: "ok" | "due";
}) {
  const ok = status === "ok";
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border"
      style={{ background: "var(--surface-2)", borderColor: "var(--line-cool)" }}
    >
      <div
        className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
        style={{
          background: ok ? "var(--tone-mint-bg)" : "var(--tone-amber-bg)",
          color: ok ? "#2F7A57" : "#8B6224",
        }}
      >
        <Activity className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold truncate" style={{ color: "var(--ink-900)" }}>
          {label}
        </div>
        <div className="text-[11.5px]" style={{ color: "var(--ink-500)" }}>
          {date} · {due}
        </div>
      </div>
    </div>
  );
}

function TreatmentRow({
  name,
  dose,
  until,
  tone,
}: {
  name: string;
  dose: string;
  until: string;
  tone: "sky" | "amber";
}) {
  const map = {
    sky: { bg: "var(--tone-sky-bg)", col: "#2C5F82" },
    amber: { bg: "var(--tone-amber-bg)", col: "#8B6224" },
  } as const;
  const s = map[tone];
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border"
      style={{ background: "var(--surface-2)", borderColor: "var(--line-cool)" }}
    >
      <div
        className="w-10 h-10 rounded-xl grid place-items-center shrink-0 font-extrabold text-[12px]"
        style={{ background: s.bg, color: s.col }}
      >
        Rx
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[14px]" style={{ color: "var(--ink-900)" }}>
          {name}
        </div>
        <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
          {dose}
        </div>
      </div>
      <div
        className="text-[11.5px] font-semibold shrink-0 whitespace-nowrap"
        style={{ color: "var(--ink-400)" }}
      >
        {until}
      </div>
    </div>
  );
}

function ConsultDot({ when, who, what }: { when: string; who: string; what: string }) {
  return (
    <div className="relative pb-3.5">
      <div
        className="absolute left-[-13px] top-1 w-2.5 h-2.5 rounded-full"
        style={{ background: "var(--primary-500)", boxShadow: "0 0 0 3px #fff" }}
      />
      <div className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-400)" }}>
        {when}
      </div>
      <div className="font-bold text-[13.5px]" style={{ color: "var(--ink-900)" }}>
        {who}
      </div>
      <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
        {what}
      </div>
    </div>
  );
}

function FamilyRow({ name, rel, hue }: { name: string; rel: string; hue: [string, string] }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border"
      style={{ background: "var(--surface-2)", borderColor: "var(--line-cool)" }}
    >
      <div
        className="w-10 h-10 rounded-full grid place-items-center text-white font-bold text-[12px] shrink-0"
        style={{ background: `linear-gradient(135deg, ${hue[0]}, ${hue[1]})` }}
      >
        {initials || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[13.5px]" style={{ color: "var(--ink-900)" }}>
          {name}
        </div>
        <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
          {rel}
        </div>
      </div>
    </div>
  );
}
