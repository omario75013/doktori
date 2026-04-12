"use client";

import { useState, useTransition } from "react";
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

type Tab = "profil" | "horaires" | "rdv" | "avis" | "audit";

export function DoctorDetailTabs({
  doctor,
  appointments,
  reviews,
  audit,
}: {
  doctor: Doctor;
  appointments: Appointment[];
  reviews: Review[];
  audit: AuditEntry[];
}) {
  const [tab, setTab] = useState<Tab>("profil");

  const tabs: Array<{ id: Tab; label: string; icon: typeof User }> = [
    { id: "profil", label: "Profil", icon: User },
    { id: "horaires", label: "Horaires", icon: Clock },
    { id: "rdv", label: "Rendez-vous", icon: Calendar },
    { id: "avis", label: "Avis", icon: MessageSquare },
    { id: "audit", label: "Audit", icon: Shield },
  ];

  return (
    <div>
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-6 w-fit">
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
      {tab === "horaires" && <ScheduleEditor doctorId={doctor.id} />}
      {tab === "rdv" && <AppointmentsTab appointments={appointments} />}
      {tab === "avis" && <ReviewsTab reviews={reviews} />}
      {tab === "audit" && <AuditTab audit={audit} />}
    </div>
  );
}

function ProfileTab({ doctor }: { doctor: Doctor }) {
  const router = useRouter();
  const [form, setForm] = useState(doctor);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
      prompt(
        "Mot de passe temporaire (copiez-le et transmettez-le au médecin) :",
        data.tempPassword
      );
    } else {
      alert(data.error || "Erreur");
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
        <Field label="Tarif consultation (millimes)">
          <input
            type="number"
            value={form.consultationFee ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                consultationFee: e.target.value ? Number(e.target.value) : null,
              })
            }
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
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
            <th className="px-4 py-3 text-left font-semibold">Statut</th>
            <th className="px-4 py-3 text-left font-semibold">Patient</th>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-blue-50 text-blue-700",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
    no_show: "bg-slate-100 text-slate-600",
    approved: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
        map[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}
