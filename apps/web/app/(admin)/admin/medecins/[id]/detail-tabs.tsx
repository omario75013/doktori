"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Calendar,
  MessageSquare,
  Clock,
  Shield,
  Save,
  KeyRound,
  Loader2,
  BookOpen,
  FileText,
  Home,
  CreditCard,
  Star as StarIcon,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react";
import { ScheduleEditor } from "./schedule-editor";

type Doctor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  city: string;
  address: string;
  bio: string | null;
  consultationFee: number | null;
  yearsOfExperience: number | null;
  isActive: boolean;
  educations: object[];
  experiences: object[];
  languages: string[];
  expertise: string[];
};

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  patientId: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
};

type AuditEntry = {
  id: string;
  action: string;
  actorEmail: string;
  createdAt: string;
  reason: string | null;
};

type AppointmentType = {
  id: string;
  name: string;
  durationMinutes: number;
  fee: number | null;
  mode: string;
  isActive: boolean;
  isDefault: boolean;
};

type Insurance = {
  id: string;
  insuranceType: string;
  isConventioned: boolean;
};

type HomeVisit = {
  isAvailable: boolean;
  radiusKm: number;
  fee: number;
} | null;

type Subscription = {
  id: string;
  plan: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  billingCycle: string;
  priceMillimes: number;
} | null;

type Premium = {
  id: string;
  isActive: boolean;
  until: string | null;
} | null;

type Tab =
  | "profil"
  | "parcours"
  | "horaires"
  | "motifs"
  | "conventions"
  | "visite"
  | "rdv"
  | "avis"
  | "abonnement"
  | "premium"
  | "engagement"
  | "audit";

export function DoctorDetailTabs({
  doctor,
  appointments,
  reviews,
  audit,
  appointmentTypes,
  insurance,
  homeVisit,
  subscription,
  premium,
}: {
  doctor: Doctor;
  appointments: Appointment[];
  reviews: Review[];
  audit: AuditEntry[];
  appointmentTypes: AppointmentType[];
  insurance: Insurance[];
  homeVisit: HomeVisit;
  subscription: Subscription;
  premium: Premium;
}) {
  const [tab, setTab] = useState<Tab>("profil");

  const tabs: Array<{ id: Tab; label: string; icon: typeof User }> = [
    { id: "profil", label: "Profil", icon: User },
    { id: "parcours", label: "Parcours", icon: BookOpen },
    { id: "horaires", label: "Horaires", icon: Clock },
    { id: "motifs", label: "Motifs", icon: FileText },
    { id: "conventions", label: "Conventions", icon: Shield },
    { id: "visite", label: "Visite à domicile", icon: Home },
    { id: "rdv", label: "Rendez-vous", icon: Calendar },
    { id: "avis", label: "Avis", icon: MessageSquare },
    { id: "abonnement", label: "Abonnement", icon: CreditCard },
    { id: "premium", label: "Premium", icon: StarIcon },
    { id: "engagement", label: "Engagement", icon: Activity },
    { id: "audit", label: "Audit", icon: Shield },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profil" && <ProfileTab doctor={doctor} />}
      {tab === "parcours" && <ParcoursTab doctor={doctor} />}
      {tab === "horaires" && <ScheduleEditor doctorId={doctor.id} />}
      {tab === "motifs" && (
        <MotifsTab doctorId={doctor.id} appointmentTypes={appointmentTypes} />
      )}
      {tab === "conventions" && (
        <ConventionsTab doctorId={doctor.id} insurance={insurance} />
      )}
      {tab === "visite" && (
        <HomeVisitTab doctorId={doctor.id} homeVisit={homeVisit} />
      )}
      {tab === "rdv" && <AppointmentsTab appointments={appointments} />}
      {tab === "avis" && <ReviewsTab reviews={reviews} />}
      {tab === "abonnement" && (
        <AbonnementTab doctorId={doctor.id} subscription={subscription} />
      )}
      {tab === "premium" && (
        <PremiumTab doctorId={doctor.id} premium={premium} />
      )}
      {tab === "engagement" && <EngagementTab doctorId={doctor.id} />}
      {tab === "audit" && <AuditTab audit={audit} />}
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab({ doctor }: { doctor: Doctor }) {
  const router = useRouter();
  const [form, setForm] = useState(doctor);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<{ text: string; isError: boolean } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/doctors/${doctor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        specialty: form.specialty,
        city: form.city,
        address: form.address,
        bio: form.bio,
        consultationFee: form.consultationFee,
        yearsOfExperience: form.yearsOfExperience,
        isActive: form.isActive,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Modifications enregistrées");
      startTransition(() => router.refresh());
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error || "Erreur");
    }
  }

  async function resetPassword() {
    if (!confirm(`Réinitialiser le mot de passe de ${doctor.name} ?`)) return;
    const res = await fetch(`/api/admin/doctors/${doctor.id}/reset-password`, {
      method: "POST",
    });
    const data = await res.json();
    if (res.ok) {
      setResetMsg({ text: `Mot de passe temporaire : ${data.tempPassword as string} — Copiez-le et transmettez-le au médecin.`, isError: false });
    } else {
      setResetMsg({ text: data.error || "Erreur lors de la réinitialisation du mot de passe.", isError: true });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nom">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Téléphone">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Spécialité">
          <input
            type="text"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Ville">
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Tarif consultation (DT)">
          <input
            type="number"
            value={
              form.consultationFee != null
                ? (form.consultationFee / 1000).toFixed(1)
                : ""
            }
            onChange={(e) =>
              setForm({
                ...form,
                consultationFee: e.target.value
                  ? Math.round(parseFloat(e.target.value) * 1000)
                  : null,
              })
            }
            min="0"
            step="0.5"
            placeholder="50"
            className="input"
          />
        </Field>
        <Field label="Années d'expérience">
          <input
            type="number"
            value={form.yearsOfExperience ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                yearsOfExperience: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="input"
          />
        </Field>
        <Field label="Statut">
          <select
            value={form.isActive ? "active" : "pending"}
            onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}
            className="input"
          >
            <option value="active">Actif</option>
            <option value="pending">En attente</option>
          </select>
        </Field>
      </div>
      <Field label="Adresse">
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="input"
        />
      </Field>
      <Field label="Biographie">
        <textarea
          value={form.bio ?? ""}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={4}
          className="input"
        />
      </Field>

      {resetMsg && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm border ${resetMsg.isError ? "bg-red-50 border-red-200 text-red-700" : "bg-teal-50 border-teal-200 text-teal-700"}`}>
          <span>{resetMsg.text}</span>
          <button onClick={() => setResetMsg(null)} className="ml-4 opacity-60 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          onClick={resetPassword}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <KeyRound className="w-4 h-4" />
          Réinitialiser le mot de passe
        </button>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-slate-500">{msg}</span>}
          <button
            onClick={save}
            disabled={saving || pending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Enregistrer
          </button>
        </div>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          background: white;
        }
        :global(.input:focus) {
          outline: none;
          border-color: #0d9488;
          box-shadow: 0 0 0 3px rgb(13 148 136 / 0.1);
        }
      `}</style>
    </div>
  );
}

// ── Parcours Tab ──────────────────────────────────────────────────────────────

function ParcoursTab({ doctor }: { doctor: Doctor }) {
  return (
    <div className="space-y-4">
      <InfoCard title="Langues parlées">
        {doctor.languages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {doctor.languages.map((lang) => (
              <span
                key={lang}
                className="px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full"
              >
                {lang}
              </span>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </InfoCard>

      <InfoCard title="Domaines d'expertise">
        {doctor.expertise.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {doctor.expertise.map((item) => (
              <span
                key={item}
                className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full"
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </InfoCard>

      <InfoCard title="Formations">
        {doctor.educations.length > 0 ? (
          <ul className="space-y-2">
            {doctor.educations.map((edu, i) => {
              const e = edu as Record<string, unknown>;
              return (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>
                    <span className="font-medium">{String(e.degree ?? e.title ?? "")}</span>
                    {e.institution ? ` — ${String(e.institution)}` : ""}
                    {e.year ? ` (${String(e.year)})` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty />
        )}
      </InfoCard>

      <InfoCard title="Expériences">
        {doctor.experiences.length > 0 ? (
          <ul className="space-y-2">
            {doctor.experiences.map((exp, i) => {
              const e = exp as Record<string, unknown>;
              return (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>
                    <span className="font-medium">{String(e.position ?? e.title ?? "")}</span>
                    {e.institution ? ` — ${String(e.institution)}` : ""}
                    {e.startYear
                      ? ` (${String(e.startYear)}${e.endYear ? `–${String(e.endYear)}` : "–…"})`
                      : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty />
        )}
      </InfoCard>
    </div>
  );
}

// ── Motifs Tab ────────────────────────────────────────────────────────────────

function MotifsTab({
  doctorId,
  appointmentTypes,
}: {
  doctorId: string;
  appointmentTypes: AppointmentType[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function toggleActive(typeId: string, next: boolean) {
    setBusy(true);
    await fetch(`/api/admin/doctors/${doctorId}/appointment-types/${typeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    setBusy(false);
    startTransition(() => router.refresh());
  }

  if (appointmentTypes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Aucun motif de consultation configuré
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Nom</th>
            <th className="px-4 py-3 text-left font-semibold">Durée</th>
            <th className="px-4 py-3 text-left font-semibold">Tarif</th>
            <th className="px-4 py-3 text-left font-semibold">Mode</th>
            <th className="px-4 py-3 text-left font-semibold">Défaut</th>
            <th className="px-4 py-3 text-left font-semibold">Actif</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {appointmentTypes.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
              <td className="px-4 py-3 text-slate-700">{t.durationMinutes} min</td>
              <td className="px-4 py-3 text-slate-700">
                {t.fee != null ? `${(t.fee / 1000).toFixed(0)} DT` : "—"}
              </td>
              <td className="px-4 py-3 text-slate-700 capitalize">{t.mode}</td>
              <td className="px-4 py-3">
                {t.isDefault ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => toggleActive(t.id, !t.isActive)}
                  disabled={busy || pending}
                  className="disabled:opacity-50"
                >
                  {t.isActive ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Conventions Tab ───────────────────────────────────────────────────────────

function ConventionsTab({
  insurance,
}: {
  doctorId: string;
  insurance: Insurance[];
}) {
  if (insurance.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Aucune convention configurée
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Assurance</th>
            <th className="px-4 py-3 text-left font-semibold">Conventionné</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {insurance.map((ins) => (
            <tr key={ins.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900 uppercase">
                {ins.insuranceType}
              </td>
              <td className="px-4 py-3">
                {ins.isConventioned ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Oui
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                    Non
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Home Visit Tab ────────────────────────────────────────────────────────────

function HomeVisitTab({
  doctorId,
  homeVisit,
}: {
  doctorId: string;
  homeVisit: HomeVisit;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    isAvailable: homeVisit?.isAvailable ?? false,
    radiusKm: homeVisit?.radiusKm ?? 5,
    fee: homeVisit?.fee ?? 0,
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/doctors/${doctorId}/home-visit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isAvailable: form.isAvailable,
        radiusKm: form.radiusKm,
        fee: form.fee,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Enregistré");
      startTransition(() => router.refresh());
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error || "Erreur");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Disponible">
          <select
            value={form.isAvailable ? "yes" : "no"}
            onChange={(e) =>
              setForm({ ...form, isAvailable: e.target.value === "yes" })
            }
            className="input"
          >
            <option value="yes">Oui</option>
            <option value="no">Non</option>
          </select>
        </Field>
        <Field label="Rayon (km)">
          <input
            type="number"
            value={form.radiusKm}
            onChange={(e) =>
              setForm({ ...form, radiusKm: parseInt(e.target.value) || 0 })
            }
            min="0"
            className="input"
          />
        </Field>
        <Field label="Tarif visite (DT)">
          <input
            type="number"
            value={(form.fee / 1000).toFixed(1)}
            onChange={(e) =>
              setForm({
                ...form,
                fee: Math.round(parseFloat(e.target.value) * 1000) || 0,
              })
            }
            min="0"
            step="0.5"
            className="input"
          />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        {msg && <span className="text-xs text-slate-500">{msg}</span>}
        <button
          onClick={save}
          disabled={saving || pending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// ── Appointments Tab ──────────────────────────────────────────────────────────

function AppointmentsTab({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Aucun rendez-vous
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Date</th>
            <th className="px-4 py-3 text-left font-semibold">Statut</th>
            <th className="px-4 py-3 text-left font-semibold">Patient</th>
            <th className="px-4 py-3 text-left font-semibold">Lien</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {appointments.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 text-slate-700">
                {new Date(a.startsAt).toLocaleString("fr-FR")}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">
                {a.patientId.slice(0, 8)}
              </td>
              <td className="px-4 py-3">
                <a
                  href={`/admin/rendez-vous/${a.id}`}
                  className="text-xs text-teal-600 hover:underline"
                >
                  Voir
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Reviews Tab ───────────────────────────────────────────────────────────────

function ReviewsTab({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Aucun avis
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={i < r.rating ? "text-amber-400" : "text-slate-200"}
                >
                  ★
                </span>
              ))}
            </div>
            <StatusBadge status={r.status} />
          </div>
          {r.comment && (
            <p className="text-sm text-slate-700 mb-2 line-clamp-3">{r.comment}</p>
          )}
          <p className="text-xs text-slate-400">
            {new Date(r.createdAt).toLocaleString("fr-FR")}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Abonnement Tab ────────────────────────────────────────────────────────────

function AbonnementTab({
  doctorId,
  subscription,
}: {
  doctorId: string;
  subscription: Subscription;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function doAction(action: "activate" | "cancel" | "extend", months?: number) {
    if (!confirm(`${action} l'abonnement ?`)) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/doctors/${doctorId}/premium`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, months }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg("Abonnement mis à jour");
      startTransition(() => router.refresh());
    } else {
      setMsg(d.error || "Erreur");
    }
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-500 mb-4">Aucun abonnement actif.</p>
        <button
          onClick={() => doAction("activate", 12)}
          disabled={busy || pending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
        >
          Activer un abonnement (12 mois)
        </button>
        {msg && <p className="mt-2 text-xs text-slate-500">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <InfoItem label="Plan" value={subscription.plan} />
        <InfoItem label="Statut" value={<StatusBadge status={subscription.status} />} />
        <InfoItem label="Cycle" value={subscription.billingCycle} />
        <InfoItem
          label="Début"
          value={
            subscription.startsAt
              ? new Date(subscription.startsAt).toLocaleDateString("fr-FR")
              : "—"
          }
        />
        <InfoItem
          label="Fin"
          value={
            subscription.endsAt
              ? new Date(subscription.endsAt).toLocaleDateString("fr-FR")
              : "—"
          }
        />
        <InfoItem
          label="Prix"
          value={`${(subscription.priceMillimes / 1000).toFixed(0)} DT`}
        />
      </dl>
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
        {subscription.status === "active" && (
          <>
            <button
              onClick={() => doAction("extend", 1)}
              disabled={busy || pending}
              className="px-3 py-2 text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg disabled:opacity-50"
            >
              +1 mois
            </button>
            <button
              onClick={() => doAction("extend", 6)}
              disabled={busy || pending}
              className="px-3 py-2 text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg disabled:opacity-50"
            >
              +6 mois
            </button>
            <button
              onClick={() => doAction("cancel")}
              disabled={busy || pending}
              className="px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50"
            >
              Annuler
            </button>
          </>
        )}
        {subscription.status !== "active" && (
          <button
            onClick={() => doAction("activate", 12)}
            disabled={busy || pending}
            className="px-3 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
          >
            Réactiver (12 mois)
          </button>
        )}
        {msg && <span className="text-xs text-slate-500 ml-auto">{msg}</span>}
      </div>
    </div>
  );
}

// ── Premium Tab ───────────────────────────────────────────────────────────────

function PremiumTab({
  doctorId,
  premium,
}: {
  doctorId: string;
  premium: Premium;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function togglePremium() {
    const next = !premium?.isActive;
    if (!confirm(`${next ? "Activer" : "Désactiver"} le badge premium ?`)) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/doctors/${doctorId}/premium-badge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(next ? "Premium activé" : "Premium désactivé");
      startTransition(() => router.refresh());
    } else {
      setMsg(d.error || "Erreur");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      {premium ? (
        <dl className="grid grid-cols-2 gap-4">
          <InfoItem
            label="Statut premium"
            value={
              premium.isActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                  <StarIcon className="w-3 h-3 fill-amber-400" />
                  Actif
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                  Inactif
                </span>
              )
            }
          />
          <InfoItem
            label="Valide jusqu'au"
            value={
              premium.until
                ? new Date(premium.until).toLocaleDateString("fr-FR")
                : "—"
            }
          />
        </dl>
      ) : (
        <p className="text-sm text-slate-500">Aucun badge premium configuré.</p>
      )}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <button
          onClick={togglePremium}
          disabled={busy || pending}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${
            premium?.isActive
              ? "text-slate-700 bg-slate-100 hover:bg-slate-200"
              : "text-white bg-amber-500 hover:bg-amber-600"
          }`}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <StarIcon className="w-4 h-4" />}
          {premium?.isActive ? "Désactiver le premium" : "Activer le premium"}
        </button>
        {msg && <span className="text-xs text-slate-500">{msg}</span>}
      </div>
    </div>
  );
}

// ── Audit Tab ─────────────────────────────────────────────────────────────────

function AuditTab({ audit }: { audit: AuditEntry[] }) {
  if (audit.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Aucune action enregistrée
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Date</th>
            <th className="px-4 py-3 text-left font-semibold">Action</th>
            <th className="px-4 py-3 text-left font-semibold">Admin</th>
            <th className="px-4 py-3 text-left font-semibold">Raison</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {audit.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                {new Date(a.createdAt).toLocaleString("fr-FR")}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{a.action}</td>
              <td className="px-4 py-3 text-slate-700">{a.actorEmail}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{a.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}

// ── Engagement Tab ─────────────────────────────────────────────────────────────

type EngagementData = {
  score: number;
  breakdown: {
    profile: number;
    activity: number;
    response: number;
    usage: number;
  };
  meta: {
    recentAppointments: number;
    confirmedCount: number;
    totalDecisioned: number;
  };
} | null;

function EngagementRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  const color =
    score >= 75 ? "#16a34a" : score >= 50 ? "#0891b2" : score >= 25 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="#f1f5f9"
          strokeWidth="12"
          fill="none"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold" style={{ color }}>
          {score}
        </div>
        <div className="text-xs text-slate-400">/100</div>
      </div>
    </div>
  );
}

function EngagementTab({ doctorId }: { doctorId: string }) {
  const [data, setData] = useState<EngagementData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/doctors/${doctorId}/engagement`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur lors du chargement");
        setLoading(false);
      });
  }, [doctorId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-sm text-red-600">
        {error ?? "Données indisponibles"}
      </div>
    );
  }

  const breakdownItems = [
    {
      key: "profile",
      label: "Complétude du profil",
      value: data.breakdown.profile,
      description: "Photo, bio, formations, tarifs",
    },
    {
      key: "activity",
      label: "Activité appointments",
      value: data.breakdown.activity,
      description: `${data.meta.recentAppointments} RDV sur 30 jours`,
    },
    {
      key: "response",
      label: "Taux de confirmation",
      value: data.breakdown.response,
      description: `${data.meta.confirmedCount} / ${data.meta.totalDecisioned} confirmés`,
    },
    {
      key: "usage",
      label: "Utilisation plateforme",
      value: data.breakdown.usage,
      description: "Connexions et mises à jour récentes",
    },
  ];

  const scoreLabel =
    data.score >= 75
      ? "Excellent"
      : data.score >= 50
      ? "Bon"
      : data.score >= 25
      ? "Moyen"
      : "Faible";

  const scoreColor =
    data.score >= 75
      ? "text-green-700"
      : data.score >= 50
      ? "text-teal-700"
      : data.score >= 25
      ? "text-amber-700"
      : "text-red-700";

  return (
    <div className="space-y-6">
      {/* Score ring */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-8">
        <EngagementRing score={data.score} />
        <div>
          <h3 className="text-lg font-bold text-slate-900">Score d&apos;engagement</h3>
          <p className={`text-sm font-semibold ${scoreColor} mt-1`}>{scoreLabel}</p>
          <p className="text-xs text-slate-500 mt-2 max-w-xs">
            Score composite basé sur la complétude du profil, l&apos;activité, le taux de
            confirmation et l&apos;utilisation de la plateforme.
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Détail par dimension (25% chacune)</h3>
        <div className="space-y-4">
          {breakdownItems.map((item) => (
            <div key={item.key}>
              <div className="flex justify-between text-sm mb-1">
                <div>
                  <span className="font-medium text-slate-800">{item.label}</span>
                  <span className="text-slate-400 ml-2 text-xs">{item.description}</span>
                </div>
                <span className="font-semibold text-slate-900">{item.value}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    item.value >= 75
                      ? "bg-green-500"
                      : item.value >= 50
                      ? "bg-teal-500"
                      : item.value >= 25
                      ? "bg-amber-400"
                      : "bg-red-400"
                  }`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-slate-400 italic">Aucune donnée</p>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-blue-50 text-blue-700",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
    no_show: "bg-slate-100 text-slate-600",
    doctor_noshow: "bg-red-50 text-red-700",
    approved: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
    active: "bg-green-50 text-green-700",
    expired: "bg-slate-100 text-slate-600",
  };
  const labels: Record<string, string> = {
    doctor_noshow: "Médecin absent",
  };
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
        map[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}
