"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  ExternalLink,
  Loader2,
  X,
  ChevronDown,
} from "lucide-react";
import type { AdminRole } from "@doktori/db";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super admin",
  moderator: "Modérateur",
  finance: "Finance",
  support: "Support",
  marketing: "Marketing",
};

const ROLE_BADGE: Record<AdminRole, string> = {
  super_admin: "bg-purple-50 text-purple-700 ring-purple-200",
  moderator: "bg-blue-50 text-blue-700 ring-blue-200",
  finance: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  support: "bg-amber-50 text-amber-700 ring-amber-200",
  marketing: "bg-pink-50 text-pink-700 ring-pink-200",
};

const ALL_ROLES: AdminRole[] = [
  "super_admin",
  "moderator",
  "finance",
  "support",
  "marketing",
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: (fd.get("name") as string).trim(),
      email: (fd.get("email") as string).trim().toLowerCase(),
      role: fd.get("role") as string,
      password: fd.get("password") as string,
    };

    const res = await fetch("/api/admin/access/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Une erreur est survenue.");
      return;
    }
    startTransition(() => {
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Nouvel admin</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              minLength={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ex: Jean Dupont"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="admin@doktori.tn"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rôle <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="role"
                required
                defaultValue=""
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-white"
              >
                <option value="" disabled>
                  Choisir un rôle
                </option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Min. 8 caractères"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Role dropdown cell ────────────────────────────────────────────────────────

function RoleCell({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: AdminRole;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<AdminRole>(currentRole);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newRole: AdminRole) {
    if (newRole === role) return;
    const prev = role;
    setRole(newRole);
    setError(null);
    const res = await fetch(`/api/admin/access/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      setRole(prev);
      setError("Erreur lors de la mise à jour du rôle.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative inline-block">
      {error && (
        <div className="absolute bottom-full mb-1 left-0 z-10 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 whitespace-nowrap shadow-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-700">✕</button>
        </div>
      )}
      <select
        value={role}
        onChange={(e) => handleChange(e.target.value as AdminRole)}
        disabled={isPending}
        className={`text-xs font-semibold ring-1 ring-inset px-2 py-0.5 rounded-full appearance-none pr-5 cursor-pointer ${ROLE_BADGE[role]} disabled:opacity-60`}
      >
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {isPending && (
        <Loader2 className="w-3 h-3 animate-spin absolute right-1 top-1/2 -translate-y-1/2 text-slate-500" />
      )}
    </div>
  );
}

// ─── Toggle active cell ────────────────────────────────────────────────────────

function ActiveToggle({
  userId,
  initialValue,
}: {
  userId: string;
  initialValue: boolean;
}) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !isActive;
    const label = next ? "activer" : "désactiver";
    if (!confirm(`Voulez-vous ${label} cet administrateur ?`)) return;
    setIsActive(next);
    setError(null);
    const res = await fetch(`/api/admin/access/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (!res.ok) {
      setIsActive(!next);
      setError("Erreur lors de la mise à jour.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      {error && (
        <div className="absolute bottom-full mb-1 left-0 z-10 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 whitespace-nowrap shadow-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-700">✕</button>
        </div>
      )}
      <button
        onClick={toggle}
        disabled={isPending}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
          isActive ? "bg-teal-500" : "bg-slate-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            isActive ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Main table ────────────────────────────────────────────────────────────────

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {users.length} administrateur{users.length > 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Nouvel admin
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Actif</th>
                <th className="px-4 py-3 font-medium">Dernière connexion</th>
                <th className="px-4 py-3 font-medium">Créé le</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <RoleCell userId={u.id} currentRole={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <ActiveToggle userId={u.id} initialValue={u.isActive} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 tabular-nums">
                    {fmtDate(u.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 tabular-nums">
                    {fmtDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/acces/utilisateurs/${u.id}`}
                      className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Détail
                    </Link>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Aucun administrateur
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
