"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import {
  Upload,
  CheckCircle,
  Shield,
  Bell,
  MessageCircle,
  Globe,
  Plus,
  Save,
  X,
  Pencil,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

interface PatientProfile {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: "M" | "F" | null;
  bloodType?: string | null;
  cin?: string | null;
  nationality?: string | null;
  cnamNumber?: string | null;
  insuranceProvider?: string | null;
  insuranceNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  occupation?: string | null;
  maritalStatus?: "single" | "married" | "divorced" | "widowed" | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
  photoUrl?: string | null;
  cnamCardUrl?: string | null;
  insuranceCardUrl?: string | null;
}

interface Dependent {
  id: string;
  relation: string | null;
}

const TN_INSURANCE_PROVIDERS = [
  "GAT Assurances",
  "COMAR",
  "STAR",
  "Maghrebia",
  "ASTREE",
  "AMI Assurances",
  "Lloyd",
  "Salim",
  "Carte Assurances",
  "Hayett",
  "BIAT Assurance",
];

const CNAM_REGIME_KEYS = ["public", "private", "independent", "student", "retired", "conventioned"] as const;
const CNAM_FILIERE_KEYS = ["public", "privateFamily", "reimbursement"] as const;

export default function ParametresComptePage() {
  const router = useRouter();
  const t = useTranslations("patient.parametres.compte");
  const locale = useLocale();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const MARITAL_LABEL: Record<NonNullable<PatientProfile["maritalStatus"]>, string> = {
    single: t("marital.single"),
    married: t("marital.married"),
    divorced: t("marital.divorced"),
    widowed: t("marital.widowed"),
  };
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [cnamModalOpen, setCnamModalOpen] = useState(false);
  const [mutuelleModalOpen, setMutuelleModalOpen] = useState(false);
  const [viewCard, setViewCard] = useState<"cnam" | "mutuelle" | null>(null);
  const [prefRdvReminder, setPrefRdvReminder] = useState(true);
  const [prefNewsletter, setPrefNewsletter] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/patients/me", { credentials: "include" });
      if (!r.ok) {
        router.replace("/connexion-patient");
        return;
      }
      const data = await r.json();
      setProfile(data);

      // Load dependents to count children
      fetch("/api/me/dependents", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((d) => setDependents(d.items || []))
        .catch(() => {});

      setLoading(false);
    })().catch(() => setLoading(false));
  }, [router]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("toast.imageTooBig"));
      return;
    }
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/me/photo", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setProfile((p) => (p ? { ...p, photoUrl: data.photoUrl } : p));
        toast.success(t("toast.photoUpdated"));
      } else {
        toast.error(data.error || t("toast.error"));
      }
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = (profile.name ?? "?")
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const childrenCount = dependents.filter((d) => d.relation === "child").length;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div className="ds-eyebrow">{t("eyebrow")}</div>
          <h1 className="ds-page-title">{t("title")}</h1>
          <p className="ds-page-sub">{t("subtitle")}</p>
        </div>
      </div>

      {/* TOP — Horizontal profile banner */}
      <div className="ds-card-patient mb-5" style={{ padding: 20 }}>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-full grid place-items-center text-white font-extrabold text-[22px] overflow-hidden"
              style={{
                background: "linear-gradient(135deg, var(--primary-300), var(--primary-500))",
                fontFamily: "Manrope, sans-serif",
              }}
            >
              {profile.photoUrl ? (
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
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="absolute -bottom-1 -end-1 w-8 h-8 rounded-full grid place-items-center"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--line-cool)",
                color: "var(--ink-700)",
                boxShadow: "var(--shadow-1)",
              }}
              aria-label={t("changePhoto")}
            >
              {photoUploading ? (
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div
              className="font-extrabold text-[20px]"
              style={{ color: "var(--ink-900)", fontFamily: "Manrope, sans-serif" }}
            >
              {profile.name ?? "—"}
            </div>
            <div className="text-[13px]" style={{ color: "var(--ink-500)" }}>
              {t("memberSince")}
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {profile.email && (
                <span className="ds-chip ds-chip-mint">
                  <CheckCircle className="w-3 h-3" /> {t("emailVerified")}
                </span>
              )}
              {profile.phone && (
                <span className="ds-chip ds-chip-mint">
                  <CheckCircle className="w-3 h-3" /> {t("phoneChip")}
                </span>
              )}
            </div>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 flex-1 min-w-[260px]"
            style={{ borderLeft: "1px solid var(--line-cool)", paddingLeft: 20 }}
          >
            <ProfMini label={t("fields.email")} v={profile.email ?? "—"} />
            <ProfMini label={t("fields.phone")} v={profile.phone ?? "—"} />
            <ProfMini
              label={t("fields.birth")}
              v={
                profile.dateOfBirth
                  ? new Date(profile.dateOfBirth).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR")
                  : "—"
              }
            />
            <ProfMini
              label={t("fields.gender")}
              v={profile.gender === "M" ? t("gender.male") : profile.gender === "F" ? t("gender.female") : "—"}
            />
            <ProfMini
              label={t("fields.maritalStatus")}
              v={profile.maritalStatus ? MARITAL_LABEL[profile.maritalStatus] : "—"}
            />
            <ProfMini label={t("fields.children")} v={String(childrenCount)} />
          </div>
        </div>
      </div>

      {/* MIDDLE — Informations personnelles + Cartes d'assurance side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div>
          {/* Personal info */}
          <div className="ds-card-patient">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[16px]" style={{ color: "var(--ink-900)" }}>
                {t("personalInfo")}
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="ds-btn ds-btn-soft ds-btn-sm"
                >
                  <Pencil className="w-3.5 h-3.5" /> {t("edit")}
                </button>
              )}
            </div>

            {!editing ? (
              <ReadOnlyFields profile={profile} childrenCount={childrenCount} maritalLabel={MARITAL_LABEL} />
            ) : (
              <EditForm
                profile={profile}
                saving={savingProfile}
                onCancel={() => setEditing(false)}
                onSave={async (patch) => {
                  setSavingProfile(true);
                  try {
                    const res = await fetch("/api/patients/me", {
                      method: "PATCH",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(patch),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setProfile(data);
                      setEditing(false);
                      toast.success(t("toast.profileUpdated"));
                    } else {
                      toast.error(data.error || t("toast.error"));
                    }
                  } finally {
                    setSavingProfile(false);
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Insurance cards */}
        <div>
          <div className="ds-card-patient">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[16px]" style={{ color: "var(--ink-900)" }}>
                {t("insuranceCards")}
              </div>
              <span className="ds-chip ds-chip-mint">
                <Shield className="w-3 h-3" /> {t("encrypted")}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InsuranceCard
                label="CNAM"
                holder={profile.name ?? ""}
                number={profile.cnamNumber}
                cardUrl={profile.cnamCardUrl}
                onAdd={() => setCnamModalOpen(true)}
                onView={() => setViewCard("cnam")}
              />
              <InsuranceCard
                label={profile.insuranceProvider ?? t("mutuelle")}
                holder={profile.name ?? ""}
                number={profile.insuranceNumber}
                cardUrl={profile.insuranceCardUrl}
                onAdd={() => setMutuelleModalOpen(true)}
                onView={() => setViewCard("mutuelle")}
              />
            </div>
          </div>

          {/* Preferences — directly under Cartes d'assurance */}
          <div className="ds-card-patient mt-5">
            <div className="font-bold text-[16px] mb-3" style={{ color: "var(--ink-900)" }}>
              {t("preferences")}
            </div>
            <div className="flex flex-col">
              <PrefRow
                icon={<Bell className="w-4 h-4" />}
                label={t("prefs.rdvReminders.label")}
                sub={t("prefs.rdvReminders.sub")}
                on={prefRdvReminder}
                onChange={setPrefRdvReminder}
              />
              <PrefRow
                icon={<MessageCircle className="w-4 h-4" />}
                label={t("prefs.newsletter.label")}
                sub={t("prefs.newsletter.sub")}
                on={prefNewsletter}
                onChange={setPrefNewsletter}
              />
              <PrefRow
                icon={<Globe className="w-4 h-4" />}
                label={t("prefs.language.label")}
                sub={t("prefs.language.sub")}
                chip={locale === "ar" ? "AR" : "FR"}
              />
              <PrefRow
                icon={<Shield className="w-4 h-4" />}
                label={t("prefs.security.label")}
                sub={t("prefs.security.sub")}
                href="/parametres/securite"
              />
            </div>
          </div>
        </div>
      </div>

      {cnamModalOpen && (
        <InsuranceModal
          kind="cnam"
          profile={profile}
          onClose={() => setCnamModalOpen(false)}
          onSaved={(p) => {
            setProfile(p);
            setCnamModalOpen(false);
          }}
        />
      )}
      {mutuelleModalOpen && (
        <InsuranceModal
          kind="mutuelle"
          profile={profile}
          onClose={() => setMutuelleModalOpen(false)}
          onSaved={(p) => {
            setProfile(p);
            setMutuelleModalOpen(false);
          }}
        />
      )}
      {viewCard && (
        <InsuranceViewModal
          kind={viewCard}
          profile={profile}
          onClose={() => setViewCard(null)}
        />
      )}
    </div>
  );
}

/* ───────── Read-only fields ───────── */
function ReadOnlyFields({ profile, childrenCount, maritalLabel }: { profile: PatientProfile; childrenCount: number; maritalLabel: Record<NonNullable<PatientProfile["maritalStatus"]>, string> }) {
  const t = useTranslations("patient.parametres.compte");
  const locale = useLocale();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label={t("fields.firstName")} v={profile.name?.split(/\s+/)[0] ?? "—"} />
      <Field label={t("fields.lastName")} v={profile.name?.split(/\s+/).slice(1).join(" ") || "—"} />
      <Field label={t("fields.email")} v={profile.email ?? "—"} />
      <Field label={t("fields.phone")} v={profile.phone ?? "—"} />
      <Field
        label={t("fields.dateOfBirth")}
        v={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR") : "—"}
      />
      <Field
        label={t("fields.gender")}
        v={profile.gender === "M" ? t("gender.male") : profile.gender === "F" ? t("gender.female") : "—"}
      />
      <Field
        label={t("fields.maritalStatus")}
        v={profile.maritalStatus ? maritalLabel[profile.maritalStatus] : "—"}
      />
      <Field label={t("fields.children")} v={String(childrenCount)} />
      <Field label={t("fields.occupation")} v={profile.occupation ?? "—"} />
      <Field label={t("fields.cin")} v={profile.cin ?? "—"} />
      <Field label={t("fields.height")} v={profile.heightCm ? `${profile.heightCm} cm` : "—"} />
      <Field label={t("fields.weight")} v={profile.weightKg ? `${profile.weightKg} kg` : "—"} />
      <Field label={t("fields.bloodType")} v={profile.bloodType ?? "—"} />
      <Field label={t("fields.address")} v={profile.addressStreet ?? "—"} wide />
      <Field label={t("fields.postalCode")} v={profile.addressPostalCode ?? "—"} />
      <Field label={t("fields.city")} v={profile.addressCity ?? "—"} />
      <Field
        label={t("fields.emergencyContact")}
        v={
          profile.emergencyContactName
            ? `${profile.emergencyContactName}${
                profile.emergencyContactPhone ? ` · ${profile.emergencyContactPhone}` : ""
              }`
            : "—"
        }
        wide
      />
    </div>
  );
}

/* ───────── Edit form ───────── */
function EditForm({
  profile,
  saving,
  onSave,
  onCancel,
}: {
  profile: PatientProfile;
  saving: boolean;
  onSave: (patch: Partial<PatientProfile>) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("patient.parametres.compte");
  const [firstName, setFirstName] = useState(profile.name?.split(/\s+/)[0] ?? "");
  const [lastName, setLastName] = useState(profile.name?.split(/\s+/).slice(1).join(" ") ?? "");
  const email = profile.email ?? "";
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth?.slice(0, 10) ?? "");
  const [gender, setGender] = useState<"" | "M" | "F">((profile.gender as "M" | "F") ?? "");
  const [maritalStatus, setMaritalStatus] = useState<"" | NonNullable<PatientProfile["maritalStatus"]>>(
    profile.maritalStatus ?? "",
  );
  const [occupation, setOccupation] = useState(profile.occupation ?? "");
  const [cin, setCin] = useState(profile.cin ?? "");
  const [heightCm, setHeightCm] = useState<string>(profile.heightCm ? String(profile.heightCm) : "");
  const [weightKg, setWeightKg] = useState<string>(profile.weightKg ? String(profile.weightKg) : "");
  const [bloodType, setBloodType] = useState(profile.bloodType ?? "");
  const [addressStreet, setAddressStreet] = useState(profile.addressStreet ?? "");
  const [addressPostalCode, setAddressPostalCode] = useState(profile.addressPostalCode ?? "");
  const [addressCity, setAddressCity] = useState(profile.addressCity ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(profile.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(profile.emergencyContactPhone ?? "");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    profile.emergencyContactRelation ?? "",
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (cin && !/^\d{8}$/.test(cin)) {
      toast.error(t("toast.cinFormat"));
      return;
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const patch: Partial<PatientProfile> = {
      name: fullName || null,
      // email is read-only — not sent
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      maritalStatus: (maritalStatus as PatientProfile["maritalStatus"]) || null,
      occupation: occupation.trim() || null,
      cin: cin.trim() || null,
      heightCm: heightCm ? Number(heightCm) : null,
      weightKg: weightKg ? Number(weightKg) : null,
      bloodType: bloodType || null,
      addressStreet: addressStreet.trim() || null,
      addressPostalCode: addressPostalCode.trim() || null,
      addressCity: addressCity.trim() || null,
      emergencyContactName: emergencyContactName.trim() || null,
      emergencyContactPhone: emergencyContactPhone.trim() || null,
      emergencyContactRelation: emergencyContactRelation.trim() || null,
    };
    void onSave(patch);
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Inp label={t("fields.firstName")} value={firstName} onChange={setFirstName} />
      <Inp label={t("fields.lastName")} value={lastName} onChange={setLastName} />
      {/* Email is identity-bound and cannot be changed inline — managed via Sécurité. */}
      <div className="sm:col-span-2">
        <Label>{t("fields.email")}</Label>
        <div
          className="text-[13.5px] font-semibold rounded-xl px-3 py-2.5 truncate"
          style={{ background: "var(--surface-2)", color: "var(--ink-900)" }}
          title={t("emailLockedTitle")}
        >
          {email || "—"}
        </div>
      </div>
      <Inp label={t("fields.dateOfBirth")} type="date" value={dateOfBirth} onChange={setDateOfBirth} />
      <Sel
        label={t("fields.gender")}
        value={gender}
        onChange={(v) => setGender(v as "" | "M" | "F")}
        options={[
          ["", "—"],
          ["M", t("gender.male")],
          ["F", t("gender.female")],
        ]}
      />
      <Sel
        label={t("fields.maritalStatus")}
        value={maritalStatus}
        onChange={(v) => setMaritalStatus(v as "" | NonNullable<PatientProfile["maritalStatus"]>)}
        options={[
          ["", "—"],
          ["single", t("marital.single")],
          ["married", t("marital.married")],
          ["divorced", t("marital.divorced")],
          ["widowed", t("marital.widowed")],
        ]}
      />
      <Inp label={t("fields.occupation")} value={occupation} onChange={setOccupation} />
      <Inp
        label={t("fields.cin")}
        value={cin}
        onChange={(v) => setCin(v.replace(/\D/g, "").slice(0, 8))}
        maxLength={8}
        inputMode="numeric"
        placeholder={t("cinPlaceholder")}
      />
      <Inp label={t("fields.heightCm")} type="number" value={heightCm} onChange={setHeightCm} />
      <Inp label={t("fields.weightKg")} type="number" value={weightKg} onChange={setWeightKg} />
      <Sel
        label={t("fields.bloodType")}
        value={bloodType}
        onChange={setBloodType}
        options={[
          ["", "—"],
          ...(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((x) => [x, x] as [string, string])),
        ]}
      />
      <Inp label={t("fields.address")} value={addressStreet} onChange={setAddressStreet} wide />
      <Inp label={t("fields.postalCode")} value={addressPostalCode} onChange={setAddressPostalCode} />
      <Inp label={t("fields.city")} value={addressCity} onChange={setAddressCity} />
      <Inp
        label={t("fields.emergencyName")}
        value={emergencyContactName}
        onChange={setEmergencyContactName}
      />
      <Inp
        label={t("fields.emergencyPhone")}
        value={emergencyContactPhone}
        onChange={setEmergencyContactPhone}
      />
      <Inp
        label={t("fields.emergencyRelation")}
        value={emergencyContactRelation}
        onChange={setEmergencyContactRelation}
        wide
      />

      <div className="sm:col-span-2 flex gap-2 justify-end mt-1">
        <button type="button" onClick={onCancel} className="ds-btn ds-btn-ghost">
          <X className="w-4 h-4" /> {t("cancel")}
        </button>
        <button type="submit" disabled={saving} className="ds-btn ds-btn-primary">
          <Save className="w-4 h-4" /> {saving ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}

/* ───────── Insurance card modal ───────── */
/* ───────── Read-only view modal ───────── */
function InsuranceViewModal({
  kind,
  profile,
  onClose,
}: {
  kind: "cnam" | "mutuelle";
  profile: PatientProfile;
  onClose: () => void;
}) {
  const t = useTranslations("patient.parametres.compte");
  const isCnam = kind === "cnam";
  const number = isCnam ? profile.cnamNumber : profile.insuranceNumber;
  const url = isCnam ? profile.cnamCardUrl : profile.insuranceCardUrl;
  const provider = isCnam ? "CNAM" : profile.insuranceProvider ?? t("mutuelle");
  const isPdf = !!url && url.toLowerCase().endsWith(".pdf");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg ds-card-patient max-h-[90vh] overflow-y-auto"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--line-cool)]">
          <h2 className="font-bold text-[16px]" style={{ color: "var(--ink-900)" }}>
            {isCnam ? t("cnamCard") : t("mutuelleCard")}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[color:var(--surface-2)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
                style={{ color: "var(--ink-400)" }}
              >
                {t("fields.company")}
              </div>
              <div className="text-[14px] font-semibold" style={{ color: "var(--ink-900)" }}>
                {provider}
              </div>
            </div>
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
                style={{ color: "var(--ink-400)" }}
              >
                {t("fields.number")}
              </div>
              <div
                className="text-[14px] font-mono font-semibold"
                style={{ color: "var(--ink-900)" }}
              >
                {number ?? "—"}
              </div>
            </div>
            <div className="col-span-2">
              <div
                className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
                style={{ color: "var(--ink-400)" }}
              >
                {t("fields.insured")}
              </div>
              <div className="text-[14px] font-semibold" style={{ color: "var(--ink-900)" }}>
                {profile.name ?? "—"}
              </div>
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden border"
            style={{ borderColor: "var(--line-cool)", background: "var(--surface-2)" }}
          >
            {url ? (
              isPdf ? (
                <div className="p-6 text-center">
                  <FileText
                    className="w-12 h-12 mx-auto mb-2"
                    style={{ color: "var(--primary-600)" }}
                  />
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="ds-btn ds-btn-primary ds-btn-sm"
                  >
                    {t("openPdf")}
                  </a>
                </div>
              ) : (
                <a href={url} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={t("cardAlt", { provider })}
                    className="w-full max-h-[400px] object-contain bg-white"
                  />
                </a>
              )
            ) : (
              <div
                className="p-8 text-center text-[13px]"
                style={{ color: "var(--ink-500)" }}
              >
                {t("noCardPhoto")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsuranceModal({
  kind,
  profile,
  onClose,
  onSaved,
}: {
  kind: "cnam" | "mutuelle";
  profile: PatientProfile;
  onClose: () => void;
  onSaved: (p: PatientProfile) => void;
}) {
  const t = useTranslations("patient.parametres.compte");
  const isCnam = kind === "cnam";
  const CNAM_REGIMES = CNAM_REGIME_KEYS.map((k) => t(`cnamRegimes.${k}` as const));
  const CNAM_FILIERES = CNAM_FILIERE_KEYS.map((k) => t(`cnamFilieres.${k}` as const));
  const [cnamNumber, setCnamNumber] = useState(profile.cnamNumber ?? "");
  const [regime, setRegime] = useState(CNAM_REGIMES[0]);
  const [filiere, setFiliere] = useState(CNAM_FILIERES[0]);
  const [quality, setQuality] = useState<"titulaire" | "ayant-droit">("titulaire");

  const [insuranceProvider, setInsuranceProvider] = useState(profile.insuranceProvider ?? "");
  const [insuranceNumber, setInsuranceNumber] = useState(profile.insuranceNumber ?? "");

  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. PATCH the number(s)
      const patch: Partial<PatientProfile> = isCnam
        ? { cnamNumber: cnamNumber.trim() || null }
        : {
            insuranceProvider: insuranceProvider.trim() || null,
            insuranceNumber: insuranceNumber.trim() || null,
          };
      const patchRes = await fetch("/api/patients/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      let merged: PatientProfile = profile;
      if (patchRes.ok) {
        merged = await patchRes.json();
      } else {
        const e = await patchRes.json().catch(() => ({}));
        toast.error(e.error || t("toast.validationFailed"));
      }

      // 2. Upload card if provided
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const upRes = await fetch(`/api/me/insurance-card?type=${kind}`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (upRes.ok) {
          const data = await upRes.json();
          merged = {
            ...merged,
            ...(isCnam ? { cnamCardUrl: data.url } : { insuranceCardUrl: data.url }),
          };
          toast.success(t("toast.cardSaved"));
        } else {
          toast.error(t("toast.cardUploadFailed"));
        }
      } else {
        toast.success(t("toast.infoSaved"));
      }

      onSaved(merged);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg ds-card-patient max-h-[90vh] overflow-y-auto"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--line-cool)]">
          <h2 className="font-bold text-[16px]" style={{ color: "var(--ink-900)" }}>
            {isCnam ? t("cnamCard") : t("mutuelleModalTitle")}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[color:var(--surface-2)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={save} className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isCnam ? (
            <>
              <Inp
                label={t("cnamAffiliationNumber")}
                value={cnamNumber}
                onChange={setCnamNumber}
                placeholder={t("cnamNumberPlaceholder")}
                maxLength={20}
                wide
              />
              <Sel
                label={t("regime")}
                value={regime}
                onChange={setRegime}
                options={CNAM_REGIMES.map((r) => [r, r] as [string, string])}
                wide
              />
              <Sel
                label={t("filiere")}
                value={filiere}
                onChange={setFiliere}
                options={CNAM_FILIERES.map((r) => [r, r] as [string, string])}
                wide
              />
              <Sel
                label={t("quality")}
                value={quality}
                onChange={(v) => setQuality(v as "titulaire" | "ayant-droit")}
                options={[
                  ["titulaire", t("qualityHolder")],
                  ["ayant-droit", t("qualityDependent")],
                ]}
                wide
              />
              <p
                className="text-[11px] sm:col-span-2 px-1"
                style={{ color: "var(--ink-500)" }}
              >
                {t("cnamHelp")}
              </p>
            </>
          ) : (
            <>
              <Sel
                label={t("fields.company")}
                value={insuranceProvider}
                onChange={setInsuranceProvider}
                options={[["", "—"], ...TN_INSURANCE_PROVIDERS.map((p) => [p, p] as [string, string]), ["Autre", t("other")]]}
                wide
              />
              <Inp
                label={t("contractNumber")}
                value={insuranceNumber}
                onChange={setInsuranceNumber}
                placeholder={t("contractPlaceholder")}
                maxLength={30}
                wide
              />
            </>
          )}

          <div className="sm:col-span-2">
            <Label>{t("cardPhotoLabel")}</Label>
            <label
              className="flex items-center gap-2 rounded-xl border border-dashed cursor-pointer p-3 hover:bg-[color:var(--surface-2)] transition-colors"
              style={{ borderColor: "var(--line-strong)" }}
            >
              <Upload className="w-4 h-4" style={{ color: "var(--primary-600)" }} />
              <span className="text-[13px]" style={{ color: "var(--ink-700)" }}>
                {file ? file.name : t("chooseFile")}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
            <button type="button" onClick={onClose} className="ds-btn ds-btn-ghost">
              <X className="w-4 h-4" /> {t("cancel")}
            </button>
            <button type="submit" disabled={saving} className="ds-btn ds-btn-primary">
              <Save className="w-4 h-4" /> {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ───────── helpers ───────── */
function ProfMini({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div
        className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
        style={{ color: "var(--ink-400)" }}
      >
        {label}
      </div>
      <div className="text-[13px] font-semibold truncate" style={{ color: "var(--ink-900)" }}>
        {v}
      </div>
    </div>
  );
}

function Field({ label, v, wide }: { label: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label>{label}</Label>
      <div
        className="text-[13.5px] font-semibold rounded-xl px-3 py-2.5 truncate"
        style={{ background: "var(--surface-2)", color: "var(--ink-900)" }}
      >
        {v}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-bold uppercase tracking-wider mb-1"
      style={{ color: "var(--ink-400)" }}
    >
      {children}
    </div>
  );
}

function Inp({
  label,
  value,
  onChange,
  type = "text",
  wide,
  placeholder,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  wide?: boolean;
  placeholder?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className="w-full rounded-xl px-3 py-2.5 text-[13.5px] font-semibold outline-none focus:ring-2"
        style={{
          background: "#fff",
          border: "1px solid var(--line-cool)",
          color: "var(--ink-900)",
        }}
      />
    </div>
  );
}

function Sel({
  label,
  value,
  onChange,
  options,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 text-[13.5px] font-semibold outline-none focus:ring-2"
        style={{
          background: "#fff",
          border: "1px solid var(--line-cool)",
          color: "var(--ink-900)",
        }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function InsuranceCard({
  label,
  number,
  cardUrl,
  holder,
  onAdd,
  onView,
}: {
  label: string;
  number: string | null | undefined;
  cardUrl: string | null | undefined;
  holder: string;
  onAdd: () => void;
  onView?: () => void;
}) {
  const t = useTranslations("patient.parametres.compte");
  const filled = !!number;
  return (
    <div
      className="rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden"
      style={{
        minHeight: 140,
        background: filled
          ? "linear-gradient(135deg, var(--primary-600), var(--primary-400))"
          : "var(--surface-2)",
        border: filled ? "none" : "1.5px dashed var(--line-strong)",
        color: filled ? "#fff" : "var(--ink-500)",
      }}
    >
      <div className="flex justify-between items-center">
        <div
          className="text-[11px] font-bold uppercase tracking-wider truncate"
          style={{ opacity: filled ? 0.8 : 1 }}
        >
          {label}
        </div>
        {filled && <Shield className="w-5 h-5" />}
      </div>
      <div>
        <div
          className="font-mono font-semibold"
          style={{
            fontSize: filled ? 14 : 13,
            opacity: filled ? 1 : 0.7,
            marginBottom: filled ? 4 : 0,
          }}
        >
          {filled ? maskCard(number!) : t("addYourCard")}
        </div>
        {filled && holder && <div className="text-[11.5px] opacity-70 truncate">{holder}</div>}
        <div className="mt-2 flex gap-2 items-center flex-wrap">
          <button
            type="button"
            onClick={onAdd}
            className={filled ? "ds-btn ds-btn-sm" : "ds-btn ds-btn-soft ds-btn-sm"}
            style={
              filled
                ? { background: "rgba(255,255,255,0.18)", color: "#fff", border: "none" }
                : undefined
            }
          >
            {filled ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {filled ? t("edit") : t("add")}
          </button>
          {filled && onView && (
            <button
              type="button"
              onClick={onView}
              className="ds-btn ds-btn-sm"
              style={{
                background: "rgba(255,255,255,0.18)",
                color: "#fff",
                border: "none",
              }}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {t("view")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function maskCard(num: string) {
  if (num.length <= 4) return num;
  return "•••• •••• " + num.slice(-4);
}

function PrefRow({
  icon,
  label,
  sub,
  on,
  onChange,
  chip,
  href,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  sub: string;
  on?: boolean;
  onChange?: (v: boolean) => void;
  chip?: string;
  href?: string;
}) {
  const inner = (
    <div
      className="flex items-center gap-3.5 py-3"
      style={{ borderBottom: "1px solid var(--line-cool)" }}
    >
      <div
        className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
        style={{ background: "var(--bg-cool-soft)", color: "var(--ink-700)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[13.5px]" style={{ color: "var(--ink-900)" }}>
          {label}
        </div>
        <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
          {sub}
        </div>
      </div>
      {chip && <span className="ds-chip ds-chip-primary">{chip}</span>}
      {onChange && (
        <button
          type="button"
          aria-pressed={!!on}
          onClick={() => onChange(!on)}
          className="relative shrink-0"
          style={{
            width: 42,
            height: 24,
            borderRadius: 999,
            background: on ? "var(--primary-500)" : "var(--line-strong)",
            transition: "background .15s",
          }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
            style={{ left: on ? 19 : 3, transition: "left .15s" }}
          />
        </button>
      )}
      {href && (
        <span style={{ color: "var(--primary-600)", fontWeight: 700, fontSize: 13 }}>›</span>
      )}
    </div>
  );
  if (href) return <a href={href}>{inner}</a>;
  return inner;
}
