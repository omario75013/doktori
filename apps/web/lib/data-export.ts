import { strToU8, zipSync } from "fflate";

export interface ExportData {
  profile: Record<string, unknown>;
  appointments: Record<string, unknown>[];
  prescriptions: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  consents: Record<string, unknown>[];
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          // Escape fields that contain comma, quote, or newline
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

/**
 * Build a ZIP archive buffer from the patient's exported data.
 * Pure in-memory: no filesystem writes, no archiver dependency.
 */
export function buildExportZip(data: ExportData): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "profile.json": strToU8(JSON.stringify(data.profile, null, 2)),
    "rendez-vous.csv": strToU8(toCsv(data.appointments)),
    "ordonnances.csv": strToU8(toCsv(data.prescriptions)),
    "messages.csv": strToU8(toCsv(data.messages)),
    "notifications.json": strToU8(JSON.stringify(data.notifications, null, 2)),
    "consentements.json": strToU8(JSON.stringify(data.consents, null, 2)),
    "README.txt": strToU8(
      [
        "Export RGPD — Doktori",
        "=====================",
        `Généré le : ${new Date().toISOString()}`,
        "",
        "Fichiers inclus :",
        "  profile.json        — Informations personnelles",
        "  rendez-vous.csv     — Historique des rendez-vous",
        "  ordonnances.csv     — Ordonnances émises",
        "  messages.csv        — Messages échangés avec les médecins",
        "  notifications.json  — Notifications reçues",
        "  consentements.json  — Historique des consentements",
        "",
        "Pour toute question : rgpd@doktori.tn",
      ].join("\n")
    ),
  };

  return zipSync(files, { level: 6 });
}
