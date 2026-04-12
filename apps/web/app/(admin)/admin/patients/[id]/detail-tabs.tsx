"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Calendar,
  MessageSquare,
  Heart,
  Users,
  Ban,
  CheckCircle2,
  RotateCcw,
  Save,
  Loader2,
  X,
} from "lucide-react";

type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  cnamNumber: string | null;
  noShowCount: number;
  lastMinuteCancelCount: number;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspendedAt: string | null;
};

type MedicalProfile = {
  allergies: string | null;
  chronicConditions: string | null;
  currentMeds: string | null;
  notes: string | null;
} | null;

type Dependent = {
  id: string;
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  relation: string | null;
  createdAt: string;
};

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  type: string;
  doctorName: string;
  doctorSpecialty: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  doctorName: string;
};

type Tab = "profil" | "medical" | "dependents" | "rdv" | "avis";

export function PatientDetailTabs({
  patient,
  medicalProfile,
  dependents,
  appointments,
  reviews,
}: {
  patient: Patient;
  medicalProfile: MedicalProfile;
  dependents: Dependent[];
  appointments: Appointment[];
  reviews: Review[];
}) {
  const [tab, setTab] = useState<Tab>("profil");

  const tabs: Array<{ id: Tab; label: string; icon: typeof User }> = [
    { id: "profil", label: "Profil", icon: User },
    { id: "medical", label: "Dossier médical", icon: Heart },
    { id: "dependents", label: "Dépendants", icon: Users },
    { id: "rdv", label: "Rendez-vous", icon: Calendar },
    { id: "avis", label: "Avis", icon: MessageSquare },
  ];

  return (
    <div>
      <ActionsSection patient={patient} />

      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-6 w-fit flex-wrap">
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

      {tab === "profil" && <ProfileTab patient={patient} />}
      {tab === "medical" && <MedicalTab profile={medicalProfile} />}
      {tab === "dependents" && <DependentsTab dependents={dependents} />}
      {tab === "rdv" && <AppointmentsTab appointments={appointments} />}
      {tab === "avis" && <ReviewsTab reviews={reviews} />}
    </div>
  );
}

function ActionsSection({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function resetNoShow() {
    if (!confirm("Remettre le compteur no-show à 0 ?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/patients/${patient.id}/reset-noshow`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Compteur no-show remis à 0");
      startTransition(() => router.refresh());
    } else {
      setMsg("Erreur");
    }
  }

  async function resetCancelCount() {
    if (!confirm("Remettre le compteur annulations tardives à 0 ?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/patients/${patient.id}/reset-cancel-count`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Compteur annulations remis à 0");
      startTransition(() => router.refresh());
    } else {
      setMsg("Erreur");
    }
  }

  async function suspend() {
    if (!suspendReason.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/admin/patients/${patient.id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: suspendReason.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setShowSuspendModal(false);
      setSuspendReason("");
      setMsg("Patient suspendu");
      startTransition(() => router.refresh());
    } else {
      setMsg("Erreur");
    }
  }

  async function unban() {
    if (!confirm("Réactiver ce patient ?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/patients/${patient.id}/unban`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Patient réactivé");
      startTransition(() => router.refresh());
    } else {
      setMsg("Erreur");
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Actions administratives</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={resetNoShow}
            disabled={busy || patient.noShowCount === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Reset no-shows ({patient.noShowCount})
          </button>
          <button
            onClick={resetCancelCount}
            disabled={busy || patient.lastMinuteCancelCount === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Reset annulations ({patient.lastMinuteCancelCount})
          </button>

          {patient.isSuspended ? (
            <button
              onClick={unban}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Réactiver
            </button>
          ) : (
            <button
              onClick={() => setShowSuspendModal(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              Suspendre
            </button>
          )}

          {msg && <span className="text-xs text-slate-500 ml-2">{msg}</span>}
        </div>

        {patient.isSuspended && patient.suspensionReason && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-xs text-red-700">
              <span className="font-medium">Raison de suspension :</span> {patient.suspensionReason}
            </p>
            {patient.suspendedAt && (
              <p className="text-xs text-red-500 mt-1">
                Suspendu le {new Date(patient.suspendedAt).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
        )}
      </div>

      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Suspendre le patient</h3>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block mb-4">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Raison de la suspension <span className="text-red-500">*</span>
              </span>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                placeholder="Indiquez la raison de cette suspension..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={suspend}
                disabled={busy || !suspendReason.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Suspendre
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProfileTab({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: patient.name,
    phone: patient.phone,
    email: patient.email ?? "",
    dateOfBirth: patient.dateOfBirth ?? "",
    gender: patient.gender ?? "",
    bloodType: patient.bloodType ?? "",
    cnamNumber: patient.cnamNumber ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || undefined,
        phone: form.phone || undefined,
        email: form.email || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        bloodType: form.bloodType || null,
        cnamNumber: form.cnamNumber || null,
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nom complet">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field-input"
          />
        </Field>
        <Field label="Téléphone">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="field-input"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="field-input"
            placeholder="non renseigné"
          />
        </Field>
        <Field label="Date de naissance">
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            className="field-input"
          />
        </Field>
        <Field label="Genre">
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="field-input"
          >
            <option value="">Non renseigné</option>
            <option value="male">Homme</option>
            <option value="female">Femme</option>
          </select>
        </Field>
        <Field label="Groupe sanguin">
          <select
            value={form.bloodType}
            onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
            className="field-input"
          >
            <option value="">Non renseigné</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="N° CNAM">
          <input
            type="text"
            value={form.cnamNumber}
            onChange={(e) => setForm({ ...form, cnamNumber: e.target.value })}
            className="field-input"
            placeholder="non renseigné"
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        {msg && <span className="text-xs text-slate-500">{msg}</span>}
        <button
          onClick={save}
          disabled={saving}
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

      <style jsx>{`
        :global(.field-input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          background: white;
        }
        :global(.field-input:focus) {
          outline: none;
          border-color: #0d9488;
          box-shadow: 0 0 0 3px rgb(13 148 136 / 0.1);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function MedicalTab({ profile }: { profile: MedicalProfile }) {
  if (!profile) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Aucun dossier médical renseigné
      </div>
    );
  }

  const fields: Array<{ label: string; value: string | null }> = [
    { label: "Allergies", value: profile.allergies },
    { label: "Conditions chroniques", value: profile.chronicConditions },
    { label: "Médicaments en cours", value: profile.currentMeds },
    { label: "Notes", value: profile.notes },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Heart className="w-4 h-4 text-rose-500" />
        <span className="text-sm font-medium text-slate-700">Dossier médical (lecture seule)</span>
      </div>
      {fields.map(({ label, value }) => (
        <div key={label} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
          <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-sm text-slate-800">{value || <span className="text-slate-400 italic">non renseigné</span>}</p>
        </div>
      ))}
    </div>
  );
}

function DependentsTab({ dependents }: { dependents: Dependent[] }) {
  if (dependents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Aucun dépendant enregistré
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Nom</th>
            <th className="px-4 py-3 text-left font-semibold">Date de naissance</th>
            <th className="px-4 py-3 text-left font-semibold">Genre</th>
            <th className="px-4 py-3 text-left font-semibold">Relation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {dependents.map((d) => (
            <tr key={d.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
              <td className="px-4 py-3 text-slate-700">
                {d.dateOfBirth
                  ? new Date(d.dateOfBirth).toLocaleDateString("fr-FR")
                  : <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-3 text-slate-700 capitalize">{d.gender ?? <span className="text-slate-400">—</span>}</td>
              <td className="px-4 py-3 text-slate-700 capitalize">{d.relation ?? <span className="text-slate-400">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
            <th className="px-4 py-3 text-left font-semibold">Médecin</th>
            <th className="px-4 py-3 text-left font-semibold">Spécialité</th>
            <th className="px-4 py-3 text-left font-semibold">Type</th>
            <th className="px-4 py-3 text-left font-semibold">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {appointments.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                {new Date(a.startsAt).toLocaleString("fr-FR")}
              </td>
              <td className="px-4 py-3 font-medium text-slate-900">{a.doctorName}</td>
              <td className="px-4 py-3 text-slate-700 capitalize">{a.doctorSpecialty}</td>
              <td className="px-4 py-3 text-slate-700 capitalize">{a.type}</td>
              <td className="px-4 py-3">
                <StatusBadge status={a.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < r.rating ? "text-amber-400" : "text-slate-200"}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm font-medium text-slate-700">{r.doctorName}</span>
            </div>
            <StatusBadge status={r.status} />
          </div>
          {r.comment && (
            <p className="text-sm text-slate-700 mb-2">{r.comment}</p>
          )}
          <p className="text-xs text-slate-400">
            {new Date(r.createdAt).toLocaleString("fr-FR")}
          </p>
        </div>
      ))}
    </div>
  );
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
    published: "bg-green-50 text-green-700",
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
