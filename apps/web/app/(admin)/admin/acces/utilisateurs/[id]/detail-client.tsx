"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown, Shield, Clock, Calendar } from "lucide-react";
import type { AdminRole } from "@doktori/db";

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
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRow {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  reason: string | null;
  ip: string | null;
  createdAt: string;
}

export function AdminUserDetailClient({
  user,
  recentAudit,
}: {
  user: AdminUserDetail;
  recentAudit: AuditLogRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<AdminRole>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function patchUser(updates: Record<string, unknown>) {
    const res = await fetch(`/api/admin/access/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Erreur de mise à jour");
    }
    return res.json();
  }

  async function handleRoleChange(newRole: AdminRole) {
    if (newRole === role) return;
    setRoleError(null);
    const prev = role;
    setRole(newRole);
    try {
      await patchUser({ role: newRole });
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setRole(prev);
      setRoleError((e as Error).message);
    }
  }

  async function handleToggleActive() {
    const next = !isActive;
    const label = next ? "activer" : "désactiver";
    if (!confirm(`Voulez-vous ${label} cet administrateur ?`)) return;
    const prev = isActive;
    setIsActive(next);
    try {
      await patchUser({ isActive: next });
      startTransition(() => router.refresh());
    } catch {
      setIsActive(prev);
      setToggleError("Erreur lors de la mise à jour.");
    }
  }

  return (
    <>
      {/* Error banner */}
      {toggleError && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{toggleError}</span>
          <button
            onClick={() => setToggleError(null)}
            className="ml-4 text-red-400 hover:text-red-700 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
            <p className="text-slate-500 mt-1">{user.email}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${ROLE_BADGE[role]}`}
          >
            {ROLE_LABELS[role]}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Shield className="w-4 h-4 text-slate-400" />
            <span>{isActive ? "Actif" : "Inactif"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{fmtDate(user.lastLoginAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Créé {fmtDate(user.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="text-xs">Mis à jour {fmtShort(user.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Actions card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Actions</h2>

        {roleError && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {roleError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Changer le rôle
            </label>
            <div className="relative max-w-xs">
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as AdminRole)}
                disabled={isPending}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-white disabled:opacity-60"
              >
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Statut du compte
            </label>
            <button
              onClick={handleToggleActive}
              disabled={isPending}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                isActive
                  ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                  : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              }`}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
              ) : null}
              {isActive ? "Désactiver le compte" : "Réactiver le compte"}
            </button>
          </div>
        </div>
      </div>

      {/* Recent audit */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Activité récente
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">20 dernières actions</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Ressource</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentAudit.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
                    {log.action}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {log.resourceType}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                    {log.resourceId ? (
                      <span className="truncate max-w-[120px] inline-block">
                        {log.resourceId}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {log.ip ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    {fmtShort(log.createdAt)}
                  </td>
                </tr>
              ))}
              {recentAudit.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Aucune action enregistrée
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
