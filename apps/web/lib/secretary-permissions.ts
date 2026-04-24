// Client-safe types + constants. No server-only imports (no db, no auth).

export const SECTIONS = [
  "agenda",
  "patients",
  "patientsCreate",
  "patientsEdit",
  "patientsDelete",
  "rendezVous",
  "rendezVousCreate",
  "rendezVousEdit",
  "rendezVousCancel",
  "messagerie",
  "wallet",
  "factures",
  "motifs",
  "cabinets",
  "teleconsult",
] as const;

export type Section = (typeof SECTIONS)[number];

export type SecretaryPermissions = Record<Section, boolean>;

export const DEFAULT_PERMISSIONS: SecretaryPermissions = {
  agenda: true,
  patients: true,
  patientsCreate: true,
  patientsEdit: false,
  patientsDelete: false,
  rendezVous: true,
  rendezVousCreate: true,
  rendezVousEdit: true,
  rendezVousCancel: false,
  messagerie: false,
  wallet: false,
  factures: false,
  motifs: true,
  cabinets: false,
  teleconsult: false,
};

export function parsePermissions(raw: unknown): SecretaryPermissions {
  const out = { ...DEFAULT_PERMISSIONS };
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  for (const key of SECTIONS) {
    if (typeof obj[key] === "boolean") out[key] = obj[key] as boolean;
  }
  return out;
}
