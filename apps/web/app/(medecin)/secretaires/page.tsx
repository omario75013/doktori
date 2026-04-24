"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  UserPlus,
  Users,
  Loader2,
  Shield,
  Check,
  X as XIcon,
  CalendarDays,
  Plane,
  CircleDot,
  UserCog,
} from "lucide-react";
import {
  SECTIONS,
  DEFAULT_PERMISSIONS,
  parsePermissions,
  type SecretaryPermissions,
  type Section,
} from "@/lib/secretary-permissions";
import { QuickActionsManager } from "@/components/quick-actions-manager";

const SECTION_LABELS: Record<Section, string> = {
  agenda: "Agenda (horaires)",
  patients: "Voir les patients",
  patientsCreate: "Ajouter un patient",
  patientsEdit: "Modifier un patient",
  patientsDelete: "Supprimer un patient",
  rendezVous: "Voir les RDV",
  rendezVousCreate: "Créer un RDV",
  rendezVousEdit: "Modifier / décaler un RDV",
  rendezVousCancel: "Annuler un RDV",
  messagerie: "Messagerie",
  wallet: "Wallet",
  factures: "Factures",
  motifs: "Motifs",
  cabinets: "Cabinets",
  teleconsult: "Téléconsultation",
};

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Secretary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  permissions: SecretaryPermissions | null;
  dateOfBirth: string | null;
  yearsOfExperience: number | null;
  monthlySalary: number | null;
  monthlyDayOffAllowance: string | number | null;
  hireDate: string | null;
  lastActiveAt: string | null;
  createdAt: string;
};

type OverviewRow = {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  lastActiveAt: string | null;
  todaySlots: Array<{ startTime: string; endTime: string; isActive: boolean }>;
  offToday: { startDate: string; endDate: string; reason: string | null; status: string } | null;
  leaveAllowance: number | null;
  leaveAccrued: number;
  leaveUsed: number;
  leaveBalance: number;
};

export default function SecretairesPage() {
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [overview, setOverview] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPerms, setEditPerms] = useState<Secretary | null>(null);
  const [editSchedule, setEditSchedule] = useState<Secretary | null>(null);
  const [manageTimeOff, setManageTimeOff] = useState<Secretary | null>(null);
  const [editProfile, setEditProfile] = useState<Secretary | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/secretaries"),
        fetch("/api/doctor/secretaries/overview"),
      ]);
      if (r1.ok) setSecretaries(await r1.json());
      if (r2.ok) setOverview(await r2.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 30_000);
    return () => clearInterval(id);
  }, [loadAll]);

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Retirer ${name} ?`)) return;
    setRemoving(id);
    try {
      const res = await fetch(`/api/secretaries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
      toast.success(`${name} retirée`);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setRemoving(null);
    }
  }

  const active = secretaries.filter((s) => s.isActive);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Secrétaires</h1>
            <p className="text-sm text-gray-500">
              {active.length} active{active.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* Quick actions manager */}
      <QuickActionsManager />

      {/* Overview strip */}
      {overview.length > 0 && (
        <section className="rounded-2xl border border-border bg-white shadow-sm p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Aujourd&apos;hui
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {overview.map((r) => (
              <OverviewCard key={r.id} row={r} />
            ))}
          </div>
        </section>
      )}

      {/* List */}
      <section className="rounded-2xl border border-border bg-white shadow-sm p-4">
        <h2 className="text-base font-semibold mb-3">Secrétaires actives</h2>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin inline" /> Chargement…
          </p>
        ) : active.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Aucune secrétaire. Cliquez sur « Ajouter » pour commencer.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {active.map((sec) => (
              <li key={sec.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{sec.name}</p>
                  <p className="text-xs text-gray-500">
                    {sec.email}
                    {sec.phone && ` · ${sec.phone}`}
                    {sec.monthlySalary && ` · ${(sec.monthlySalary / 1000).toFixed(0)} DT/mois`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditProfile(sec)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
                  >
                    <UserCog className="h-3 w-3" />
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSchedule(sec)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
                  >
                    <CalendarDays className="h-3 w-3" />
                    Planning
                  </button>
                  <button
                    type="button"
                    onClick={() => setManageTimeOff(sec)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
                  >
                    <Plane className="h-3 w-3" />
                    Congés
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPerms(sec)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
                  >
                    <Shield className="h-3 w-3" />
                    Permissions
                  </button>
                  <button
                    type="button"
                    disabled={removing === sec.id}
                    onClick={() => handleRemove(sec.id, sec.name)}
                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    {removing === sec.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Retirer"
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showAddModal && (
        <AddSecretaryDialog
          onClose={() => setShowAddModal(false)}
          onCreated={async () => {
            setShowAddModal(false);
            await loadAll();
          }}
        />
      )}
      {editPerms && (
        <PermissionsDialog
          secretary={editPerms}
          onClose={() => setEditPerms(null)}
          onSaved={() => {
            setEditPerms(null);
            loadAll();
          }}
        />
      )}
      {editSchedule && (
        <ScheduleDialog
          secretary={editSchedule}
          onClose={() => setEditSchedule(null)}
          onSaved={() => {
            setEditSchedule(null);
            loadAll();
          }}
        />
      )}
      {manageTimeOff && (
        <TimeOffDialog
          secretary={manageTimeOff}
          onClose={() => setManageTimeOff(null)}
        />
      )}
      {editProfile && (
        <EditSecretaryDialog
          secretary={editProfile}
          onClose={() => setEditProfile(null)}
          onSaved={async () => {
            setEditProfile(null);
            await loadAll();
          }}
        />
      )}
    </div>
  );
}

function EditSecretaryDialog({
  secretary,
  onClose,
  onSaved,
}: {
  secretary: Secretary;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    name: secretary.name,
    phone: secretary.phone ?? "",
    dateOfBirth: secretary.dateOfBirth ?? "",
    hireDate: secretary.hireDate ?? "",
    yearsOfExperience:
      secretary.yearsOfExperience != null ? String(secretary.yearsOfExperience) : "",
    monthlySalary:
      secretary.monthlySalary != null ? String(secretary.monthlySalary / 1000) : "",
    monthlyDayOffAllowance:
      secretary.monthlyDayOffAllowance != null ? String(secretary.monthlyDayOffAllowance) : "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim() === "" ? null : form.phone.trim(),
        dateOfBirth: form.dateOfBirth === "" ? null : form.dateOfBirth,
        hireDate: form.hireDate === "" ? null : form.hireDate,
        yearsOfExperience:
          form.yearsOfExperience.trim() === "" ? null : Number(form.yearsOfExperience),
        monthlySalary:
          form.monthlySalary.trim() === "" ? null : Math.round(Number(form.monthlySalary) * 1000),
        monthlyDayOffAllowance:
          form.monthlyDayOffAllowance.trim() === "" ? null : Number(form.monthlyDayOffAllowance),
      };
      const res = await fetch(`/api/secretaries/${secretary.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Profil mis à jour");
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Modifier · ${secretary.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-3" disabled={saving}>
          <Field label="Nom">
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          </Field>
          <Field label="Téléphone">
            <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </Field>
          <Field label="Date de naissance">
            <Input type="date" value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
          </Field>
          <Field label="Date d'embauche">
            <Input type="date" value={form.hireDate} onChange={(v) => setForm({ ...form, hireDate: v })} />
          </Field>
          <Field label="Années d'expérience">
            <Input type="number" min="0" value={form.yearsOfExperience} onChange={(v) => setForm({ ...form, yearsOfExperience: v })} />
          </Field>
          <Field label="Salaire mensuel (DT)">
            <Input type="number" min="0" step="1" value={form.monthlySalary} onChange={(v) => setForm({ ...form, monthlySalary: v })} />
          </Field>
          <Field label="Jours de congé / mois">
            <Input type="number" min="0" step="0.5" value={form.monthlyDayOffAllowance} onChange={(v) => setForm({ ...form, monthlyDayOffAllowance: v })} />
          </Field>
          <Field label="Email (non modifiable)">
            <input type="email" disabled value={secretary.email} className="w-full h-10 rounded-xl border border-border bg-gray-100 px-3 text-sm" />
          </Field>
        </fieldset>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Annuler</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function OverviewCard({ row }: { row: OverviewRow }) {
  const now = new Date();
  const connected =
    row.lastActiveAt &&
    now.getTime() - new Date(row.lastActiveAt).getTime() < 2 * 60 * 1000;

  const scheduledNow = row.todaySlots.some((s) => {
    if (!s.isActive) return false;
    const [h1, m1] = s.startTime.split(":").map(Number);
    const [h2, m2] = s.endTime.split(":").map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    return mins >= h1 * 60 + m1 && mins <= h2 * 60 + m2;
  });

  let statusLabel = "Hors planning";
  let statusClass = "bg-gray-100 text-gray-500";
  if (row.offToday) {
    statusLabel = "En congé";
    statusClass = "bg-orange-100 text-orange-700";
  } else if (scheduledNow) {
    statusLabel = "En poste";
    statusClass = "bg-green-100 text-green-700";
  } else if (row.todaySlots.length > 0) {
    statusLabel = "Plus tard aujourd'hui";
    statusClass = "bg-blue-100 text-blue-700";
  }

  return (
    <div className="rounded-xl border border-border bg-white p-3 flex items-center gap-3">
      <div className="relative">
        <div className="h-9 w-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
          {row.name
            .split(/\s+/)
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </div>
        <span
          title={connected ? "Connectée" : "Hors ligne"}
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
            connected ? "bg-green-500" : "bg-gray-300"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{row.name}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${statusClass}`}>
            {statusLabel}
          </span>
          {row.todaySlots.length > 0 && !row.offToday && (
            <span className="text-gray-500">
              {row.todaySlots
                .map((s) => `${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)}`)
                .join(", ")}
            </span>
          )}
        </div>
        <LeaveBalancePill balance={Number(row.leaveBalance)} />
      </div>
    </div>
  );
}

function LeaveBalancePill({ balance }: { balance: number }) {
  const neg = balance < 0;
  return (
    <div
      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        neg
          ? "bg-red-50 text-red-700 border border-red-200"
          : balance === 0
            ? "bg-gray-50 text-gray-500 border border-gray-200"
            : "bg-green-50 text-green-700 border border-green-200"
      }`}
      title="Solde de congés"
    >
      Solde : {balance > 0 ? "+" : ""}
      {balance.toFixed(1)} j
    </div>
  );
}

// ─── Add Secretary (with full profile + permissions) ──────────────────────────

function AddSecretaryDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    hireDate: "",
    yearsOfExperience: "",
    monthlySalary: "",
    monthlyDayOffAllowance: "2",
  });
  const [permissions, setPermissions] = useState<SecretaryPermissions>(DEFAULT_PERMISSIONS);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error("Nom, email et mot de passe (≥ 8) requis");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        permissions,
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.hireDate) payload.hireDate = form.hireDate;
      if (form.yearsOfExperience) payload.yearsOfExperience = Number(form.yearsOfExperience);
      if (form.monthlySalary)
        payload.monthlySalary = Math.round(Number(form.monthlySalary) * 1000);
      if (form.monthlyDayOffAllowance)
        payload.monthlyDayOffAllowance = Number(form.monthlyDayOffAllowance);

      const res = await fetch("/api/secretaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(`${data.name} ajoutée`);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  function togglePerm(s: Section) {
    setPermissions((prev) => ({ ...prev, [s]: !prev[s] }));
  }

  return (
    <Modal title="Ajouter une secrétaire" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-3" disabled={submitting}>
          <Field label="Nom complet *">
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          </Field>
          <Field label="Téléphone">
            <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </Field>
          <Field label="Email *">
            <Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          </Field>
          <Field label="Mot de passe * (≥ 8)">
            <Input type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
          </Field>
          <Field label="Date de naissance">
            <Input type="date" value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
          </Field>
          <Field label="Date d'embauche">
            <Input type="date" value={form.hireDate} onChange={(v) => setForm({ ...form, hireDate: v })} />
          </Field>
          <Field label="Années d'expérience">
            <Input type="number" min="0" value={form.yearsOfExperience} onChange={(v) => setForm({ ...form, yearsOfExperience: v })} />
          </Field>
          <Field label="Salaire mensuel (DT)">
            <Input type="number" min="0" step="1" value={form.monthlySalary} onChange={(v) => setForm({ ...form, monthlySalary: v })} />
          </Field>
          <Field label="Jours de congé / mois">
            <Input type="number" min="0" step="0.5" value={form.monthlyDayOffAllowance} onChange={(v) => setForm({ ...form, monthlyDayOffAllowance: v })} />
          </Field>
        </fieldset>

        <div>
          <h3 className="text-sm font-semibold mb-2">Permissions initiales</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {SECTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 text-sm cursor-pointer hover:bg-secondary/40">
                <input type="checkbox" checked={permissions[s]} onChange={() => togglePerm(s)} />
                <span>{SECTION_LABELS[s]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
            Annuler
          </button>
          <button type="submit" disabled={submitting} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {submitting ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Permissions dialog ───────────────────────────────────────────────────────

function PermissionsDialog({
  secretary,
  onClose,
  onSaved,
}: {
  secretary: Secretary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [perms, setPerms] = useState<SecretaryPermissions>(
    parsePermissions(secretary.permissions ?? DEFAULT_PERMISSIONS)
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/secretaries/${secretary.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: perms }),
      });
      if (!res.ok) throw new Error();
      toast.success("Permissions mises à jour");
      onSaved();
    } catch {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Permissions · ${secretary.name}`} onClose={onClose}>
      <div className="grid grid-cols-1 gap-2">
        {SECTIONS.map((s) => (
          <label key={s} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 py-2 cursor-pointer hover:bg-secondary/40">
            <span className="text-sm">{SECTION_LABELS[s]}</span>
            <span className={`h-5 w-9 rounded-full relative transition-colors ${perms[s] ? "bg-primary" : "bg-gray-200"}`}>
              <input type="checkbox" checked={perms[s]} onChange={() => setPerms({ ...perms, [s]: !perms[s] })} className="sr-only" />
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${perms[s] ? "left-4" : "left-0.5"}`} />
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-3">
        <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
          Annuler
        </button>
        <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Schedule dialog ──────────────────────────────────────────────────────────

type DaySchedule = {
  dayOfWeek: number;
  open: boolean;
  startTime: string;
  endTime: string;
};

function ScheduleDialog({
  secretary,
  onClose,
  onSaved,
}: {
  secretary: Secretary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [days, setDays] = useState<DaySchedule[]>(() =>
    [1, 2, 3, 4, 5, 6, 0].map((d) => ({
      dayOfWeek: d,
      open: false,
      startTime: "08:00",
      endTime: "17:00",
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/secretaries/${secretary.id}/schedule`);
        if (!res.ok) return;
        const slots: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }> = await res.json();
        setDays((prev) =>
          prev.map((d) => {
            const s = slots.find((x) => x.dayOfWeek === d.dayOfWeek && x.isActive);
            if (!s) return d;
            return {
              dayOfWeek: d.dayOfWeek,
              open: true,
              startTime: s.startTime.slice(0, 5),
              endTime: s.endTime.slice(0, 5),
            };
          })
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [secretary.id]);

  async function save() {
    setSaving(true);
    try {
      const slots = days
        .filter((d) => d.open)
        .map((d) => ({ dayOfWeek: d.dayOfWeek, startTime: d.startTime, endTime: d.endTime, isActive: true }));
      const res = await fetch(`/api/secretaries/${secretary.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Planning enregistré");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Planning · ${secretary.name}`} onClose={onClose}>
      {loading ? (
        <div className="py-8 text-center">
          <Loader2 className="h-4 w-4 animate-spin inline" />
        </div>
      ) : (
        <div className="space-y-2">
          {days.map((d) => (
            <div key={d.dayOfWeek} className={`rounded-xl border border-border p-3 ${d.open ? "bg-white" : "bg-gray-50"}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.open}
                  onChange={(e) =>
                    setDays((prev) =>
                      prev.map((x) => (x.dayOfWeek === d.dayOfWeek ? { ...x, open: e.target.checked } : x))
                    )
                  }
                />
                <span className="inline-flex items-center justify-center w-14 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {DAY_LABELS[d.dayOfWeek]}
                </span>
                {d.open ? (
                  <span className="flex items-center gap-2 ml-auto">
                    <input
                      type="time"
                      value={d.startTime}
                      onChange={(e) =>
                        setDays((prev) =>
                          prev.map((x) => (x.dayOfWeek === d.dayOfWeek ? { ...x, startTime: e.target.value } : x))
                        )
                      }
                      className="h-8 rounded-lg border border-border px-2 text-sm"
                    />
                    <span>—</span>
                    <input
                      type="time"
                      value={d.endTime}
                      onChange={(e) =>
                        setDays((prev) =>
                          prev.map((x) => (x.dayOfWeek === d.dayOfWeek ? { ...x, endTime: e.target.value } : x))
                        )
                      }
                      className="h-8 rounded-lg border border-border px-2 text-sm"
                    />
                  </span>
                ) : (
                  <span className="ml-auto text-xs text-gray-400 italic">Fermé</span>
                )}
              </label>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-3">
        <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
          Annuler
        </button>
        <button type="button" onClick={save} disabled={saving || loading} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Time-off dialog ──────────────────────────────────────────────────────────

type TimeOffRow = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
};

function TimeOffDialog({
  secretary,
  onClose,
}: {
  secretary: Secretary;
  onClose: () => void;
}) {
  const [list, setList] = useState<TimeOffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [balance, setBalance] = useState<{ accrued: number; used: number; balance: number; allowance: number | null } | null>(null);

  const reload = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch(`/api/secretaries/${secretary.id}/time-off`),
      fetch(`/api/secretaries/${secretary.id}/leave-balance`),
    ]);
    if (r1.ok) setList(await r1.json());
    if (r2.ok) setBalance(await r2.json());
    setLoading(false);
  }, [secretary.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/secretaries/${secretary.id}/time-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          reason: reason.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Congé enregistré");
      setStartDate("");
      setEndDate("");
      setReason("");
      await reload();
    } catch {
      toast.error("Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(toId: string, status: "approved" | "denied") {
    const res = await fetch(`/api/secretaries/${secretary.id}/time-off/${toId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(status === "approved" ? "Approuvé" : "Refusé");
      reload();
    } else toast.error("Erreur");
  }

  async function remove(toId: string) {
    const res = await fetch(`/api/secretaries/${secretary.id}/time-off/${toId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Supprimé");
      reload();
    }
  }

  const approvedDaysThisMonth = (() => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return list
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => {
        const s = new Date(r.startDate);
        const e = new Date(r.endDate);
        const rs = s > mStart ? s : mStart;
        const re = e < mEnd ? e : mEnd;
        if (re < rs) return sum;
        return sum + Math.floor((re.getTime() - rs.getTime()) / 86400000) + 1;
      }, 0);
  })();
  const allowance = secretary.monthlyDayOffAllowance != null ? Number(secretary.monthlyDayOffAllowance) : null;
  const pending = list.filter((r) => r.status === "pending").length;
  const requestedDays = startDate && endDate
    ? Math.max(0, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 0;

  return (
    <Modal title={`Congés · ${secretary.name}`} onClose={onClose}>
      {/* Summary */}
      <div className="rounded-xl bg-secondary/40 p-3 mb-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Quota/mois</p>
          <p className="text-lg font-bold text-primary">{allowance != null ? allowance : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Pris ce mois</p>
          <p className="text-lg font-bold text-green-600">{approvedDaysThisMonth}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">En attente</p>
          <p className="text-lg font-bold text-orange-600">{pending}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Solde total</p>
          <p
            className={`text-lg font-bold ${
              balance == null
                ? "text-gray-400"
                : balance.balance < 0
                  ? "text-red-600"
                  : "text-green-600"
            }`}
          >
            {balance == null ? "…" : `${balance.balance > 0 ? "+" : ""}${balance.balance.toFixed(1)} j`}
          </p>
          {balance && (
            <p className="text-[9px] text-gray-400 mt-0.5">
              {balance.accrued.toFixed(1)} cumulés − {balance.used} pris
            </p>
          )}
        </div>
      </div>

      <form onSubmit={add} className="rounded-xl bg-white border border-border p-3 mb-4 space-y-2">
        <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
          <Plane className="h-3 w-3" />
          Nouveau congé (approuvé d&apos;office côté médecin)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] text-gray-500">Début</span>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-gray-500">Fin</span>
            <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </label>
        </div>
        <input type="text" placeholder="Raison (facultatif)" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        {requestedDays > 0 && (
          <p className="text-xs text-gray-500">
            Durée : <strong>{requestedDays} jour{requestedDays > 1 ? "s" : ""}</strong>
            {allowance != null && requestedDays + approvedDaysThisMonth > allowance && (
              <span className="ml-2 text-orange-600 font-semibold">
                ⚠ Dépasse le quota mensuel
              </span>
            )}
          </p>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={submitting} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {submitting ? "Enregistrement…" : "Ajouter"}
          </button>
        </div>
      </form>
      {loading ? (
        <div className="py-6 text-center">
          <Loader2 className="h-4 w-4 animate-spin inline" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-4 text-sm text-gray-400 italic">Aucune demande</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((r) => (
            <li key={r.id} className="py-2 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium">
                  {format(new Date(r.startDate), "d MMM", { locale: fr })} → {format(new Date(r.endDate), "d MMM yyyy", { locale: fr })}
                </p>
                {r.reason && <p className="text-xs text-gray-500 truncate">{r.reason}</p>}
              </div>
              <StatusPill status={r.status} />
              <div className="flex gap-1">
                {r.status === "pending" && (
                  <>
                    <button onClick={() => updateStatus(r.id, "approved")} className="text-xs rounded-lg bg-green-500 text-white px-2 py-1">
                      <Check className="h-3 w-3" />
                    </button>
                    <button onClick={() => updateStatus(r.id, "denied")} className="text-xs rounded-lg bg-red-500 text-white px-2 py-1">
                      <XIcon className="h-3 w-3" />
                    </button>
                  </>
                )}
                <button onClick={() => remove(r.id)} className="text-xs rounded-lg border border-border px-2 py-1 text-gray-500 hover:bg-secondary">
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-orange-100 text-orange-700",
    approved: "bg-green-100 text-green-700",
    denied: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status] ?? map.pending}`}>
      {status === "pending" ? "En attente" : status === "approved" ? "Approuvé" : "Refusé"}
    </span>
  );
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="h-8 w-8 rounded-lg text-gray-400 hover:bg-secondary flex items-center justify-center">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  required,
  min,
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      min={min}
      step={step}
      className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    />
  );
}
