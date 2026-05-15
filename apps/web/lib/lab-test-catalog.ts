export type CatalogEntry = { code: string; name: string };

export const LAB_TESTS: CatalogEntry[] = [
  { code: "NFS", name: "Numération formule sanguine (NFS)" },
  { code: "GLY", name: "Glycémie à jeun" },
  { code: "HBA1C", name: "Hémoglobine glyquée (HbA1c)" },
  { code: "LIPID", name: "Bilan lipidique" },
  { code: "TSH", name: "Thyréostimuline (TSH)" },
  { code: "CREAT", name: "Créatininémie" },
  { code: "UREE", name: "Urée sanguine" },
  { code: "ASAT", name: "Transaminases ASAT" },
  { code: "ALAT", name: "Transaminases ALAT" },
  { code: "VITD", name: "Vitamine D (25-OH)" },
  { code: "FERR", name: "Ferritine" },
  { code: "CRP", name: "Protéine C-réactive (CRP)" },
  { code: "VS", name: "Vitesse de sédimentation (VS)" },
  { code: "URINE", name: "Analyse d'urine (ECBU)" },
  { code: "PROT", name: "Protéines totales" },
  { code: "BILI", name: "Bilirubine totale" },
  { code: "CALC", name: "Calcémie" },
  { code: "POTK", name: "Kaliémie" },
  { code: "NATR", name: "Natrémie" },
  { code: "INR", name: "INR / TP" },
];

export const RADIO_EXAMS: CatalogEntry[] = [
  { code: "ECH_ABD", name: "Échographie abdominale" },
  { code: "ECH_CARD", name: "Échographie cardiaque (ETT)" },
  { code: "RX_THOR", name: "Radiographie thoracique" },
  { code: "IRM_CER", name: "IRM cérébrale" },
  { code: "SCAN_ABD", name: "Scanner abdominal" },
  { code: "MAMMO", name: "Mammographie" },
  { code: "ECH_PEL", name: "Échographie pelvienne" },
  { code: "RX_OSS", name: "Radiographie osseuse" },
  { code: "IRM_LOMBS", name: "IRM lombaire" },
  { code: "SCAN_THOR", name: "Scanner thoracique" },
  { code: "ECH_THYRO", name: "Échographie thyroïdienne" },
  { code: "DEXA", name: "Ostéodensitométrie (DEXA)" },
  { code: "ECH_SEIN", name: "Échographie des seins" },
  { code: "RX_BASSIN", name: "Radiographie du bassin" },
  { code: "IRM_GENOU", name: "IRM du genou" },
];

export function getCatalogForKind(kind: "lab" | "radiology"): CatalogEntry[] {
  return kind === "radiology" ? RADIO_EXAMS : LAB_TESTS;
}
