import { Check, X } from "lucide-react";

// ─── Permissions matrix (hardcoded — read-only) ───────────────────────────────

type Role = "super_admin" | "moderator" | "finance" | "support" | "marketing";

type Capability = {
  key: string;
  label: string;
  description: string;
};

const CAPABILITIES: Capability[] = [
  { key: "doctors", label: "Médecins", description: "Gestion des profils médecins" },
  { key: "patients", label: "Patients", description: "Gestion des patients" },
  { key: "appointments", label: "Rendez-vous", description: "Gestion des RDV" },
  { key: "reviews", label: "Avis", description: "Modération des avis" },
  { key: "finance", label: "Finance", description: "Paiements & abonnements" },
  { key: "sos", label: "SOS", description: "Urgences et sessions SOS" },
  { key: "comms", label: "Comms", description: "Communications & campagnes" },
  { key: "catalog", label: "Catalogue", description: "Spécialités & catalogue" },
  { key: "access", label: "Accès", description: "Gestion des admins & audit" },
  { key: "analytics", label: "Analytics", description: "Statistiques & rapports" },
  { key: "system", label: "Système", description: "Config système & infra" },
];

const ROLES: { key: Role; label: string; description: string }[] = [
  {
    key: "super_admin",
    label: "Super admin",
    description: "Accès complet à toutes les fonctionnalités",
  },
  {
    key: "moderator",
    label: "Modérateur",
    description: "Modération du contenu (avis, médecins en lecture)",
  },
  {
    key: "finance",
    label: "Finance",
    description: "Paiements et gestion des abonnements",
  },
  {
    key: "support",
    label: "Support",
    description: "Assistance patients, RDV et urgences",
  },
  {
    key: "marketing",
    label: "Marketing",
    description: "Communications et analytics",
  },
];

// true = full, "read" = read-only, false = no access
type Permission = boolean | "read";

const MATRIX: Record<Role, Record<string, Permission>> = {
  super_admin: {
    doctors: true,
    patients: true,
    appointments: true,
    reviews: true,
    finance: true,
    sos: true,
    comms: true,
    catalog: true,
    access: true,
    analytics: true,
    system: true,
  },
  moderator: {
    doctors: "read",
    patients: false,
    appointments: false,
    reviews: true,
    finance: false,
    sos: false,
    comms: false,
    catalog: false,
    access: false,
    analytics: false,
    system: false,
  },
  finance: {
    doctors: false,
    patients: false,
    appointments: false,
    reviews: false,
    finance: true,
    sos: false,
    comms: false,
    catalog: false,
    access: false,
    analytics: true,
    system: false,
  },
  support: {
    doctors: false,
    patients: true,
    appointments: true,
    reviews: false,
    finance: false,
    sos: true,
    comms: false,
    catalog: false,
    access: false,
    analytics: false,
    system: false,
  },
  marketing: {
    doctors: false,
    patients: false,
    appointments: false,
    reviews: false,
    finance: false,
    sos: false,
    comms: true,
    catalog: false,
    access: false,
    analytics: true,
    system: false,
  },
};

const ROLE_HEADER_STYLE: Record<Role, string> = {
  super_admin: "text-purple-700 bg-purple-50",
  moderator: "text-blue-700 bg-blue-50",
  finance: "text-emerald-700 bg-emerald-50",
  support: "text-amber-700 bg-amber-50",
  marketing: "text-pink-700 bg-pink-50",
};

function PermCell({ value }: { value: Permission }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center justify-center w-6 h-6 bg-green-50 rounded-full">
          <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={2.5} />
        </span>
      </div>
    );
  }
  if (value === "read") {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-50 rounded-full" title="Lecture seule">
          <span className="text-[10px] font-bold text-blue-600">R</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-50 rounded-full">
        <X className="w-3.5 h-3.5 text-slate-300" strokeWidth={2} />
      </span>
    </div>
  );
}

export default function PermissionsPage() {
  const totalGranted = (role: Role) =>
    Object.values(MATRIX[role]).filter((v) => v !== false).length;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Matrice des permissions
        </h1>
        <p className="text-slate-500 mt-1">
          Vue d'ensemble des accès par rôle (lecture seule)
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-slate-600">
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-50 rounded-full">
            <Check className="w-3 h-3 text-green-600" strokeWidth={2.5} />
          </span>
          Accès complet
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-50 rounded-full">
            <span className="text-[9px] font-bold text-blue-600">R</span>
          </span>
          Lecture seule
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-50 rounded-full">
            <X className="w-3 h-3 text-slate-300" strokeWidth={2} />
          </span>
          Accès refusé
        </span>
      </div>

      {/* Matrix table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-52">
                Capacité
              </th>
              {ROLES.map((role) => (
                <th
                  key={role.key}
                  className="px-4 py-4 text-center min-w-[130px]"
                >
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${ROLE_HEADER_STYLE[role.key]}`}
                  >
                    {role.label}
                  </span>
                  <p className="text-xs font-normal text-slate-400 mt-1">
                    {totalGranted(role.key)}/{CAPABILITIES.length}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {CAPABILITIES.map((cap) => (
              <tr key={cap.key} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-800">{cap.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{cap.description}</p>
                </td>
                {ROLES.map((role) => (
                  <td key={role.key} className="px-4 py-3">
                    <PermCell value={MATRIX[role.key][cap.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {ROLES.map((role) => {
          const granted = CAPABILITIES.filter(
            (c) => MATRIX[role.key][c.key] !== false
          );
          return (
            <div
              key={role.key}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2 ${ROLE_HEADER_STYLE[role.key]}`}
              >
                {role.label}
              </span>
              <p className="text-xs text-slate-500 mb-3">{role.description}</p>
              <ul className="space-y-1">
                {granted.map((c) => (
                  <li
                    key={c.key}
                    className="flex items-center gap-1.5 text-xs text-slate-700"
                  >
                    <Check className="w-3 h-3 text-green-500 shrink-0" />
                    {c.label}
                    {MATRIX[role.key][c.key] === "read" && (
                      <span className="text-blue-500 text-[10px]">(lecture)</span>
                    )}
                  </li>
                ))}
                {granted.length === 0 && (
                  <li className="text-xs text-slate-400">Aucun accès</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
