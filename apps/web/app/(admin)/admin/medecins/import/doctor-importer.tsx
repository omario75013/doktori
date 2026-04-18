"use client";

import { useState, useRef } from "react";
import { Upload, AlertTriangle, CheckCircle2, FileText } from "lucide-react";

type ImportRow = {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  city: string;
  address: string;
};

type RowError = { row: number; error: string };

const REQUIRED_HEADERS = ["name", "email", "phone", "specialty", "city", "address"];

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse: split by comma, strip surrounding quotes
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? "";
    });

    rows.push({
      name: obj.name ?? "",
      email: obj.email ?? "",
      phone: obj.phone ?? "",
      specialty: obj.specialty ?? "",
      city: obj.city ?? "",
      address: obj.address ?? "",
    });
  }

  return rows;
}

function validatePreview(rows: ImportRow[]): Set<number> {
  const invalid = new Set<number>();
  const seenEmails = new Set<string>();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const hasAllFields = REQUIRED_HEADERS.every((h) => r[h as keyof ImportRow]?.trim());
    const validEmail = emailRe.test(r.email?.trim() ?? "");
    const dupEmail = seenEmails.has(r.email?.trim()?.toLowerCase() ?? "");

    if (!hasAllFields || !validEmail || dupEmail) {
      invalid.add(i);
    } else {
      seenEmails.add(r.email.trim().toLowerCase());
    }
  }

  return invalid;
}

export function DoctorImporter() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: RowError[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleFile(file: File) {
    setResult(null);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        let parsed: ImportRow[];

        if (file.name.endsWith(".json")) {
          const json = JSON.parse(text);
          if (!Array.isArray(json)) {
            setParseError("Le fichier JSON doit contenir un tableau.");
            return;
          }
          parsed = json.map((item: Record<string, unknown>) => ({
            name: String(item.name ?? ""),
            email: String(item.email ?? ""),
            phone: String(item.phone ?? ""),
            specialty: String(item.specialty ?? ""),
            city: String(item.city ?? ""),
            address: String(item.address ?? ""),
          }));
        } else {
          parsed = parseCSV(text);
        }

        if (parsed.length === 0) {
          setParseError("Aucune ligne trouvée dans le fichier.");
          return;
        }

        setRows(parsed);
        setFileName(file.name);
        setInvalidRows(validatePreview(parsed));
      } catch {
        setParseError("Impossible de lire ce fichier. Vérifiez le format.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    const validRows = rows.filter((_, i) => !invalidRows.has(i));
    if (validRows.length === 0) return;

    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/doctors/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRows),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ imported: 0, errors: [{ row: 0, error: "Erreur réseau" }] });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setRows([]);
    setInvalidRows(new Set());
    setFileName(null);
    setResult(null);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const validCount = rows.length - invalidRows.size;

  return (
    <div className="space-y-6">
      {/* File format guide */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-2">
        <p className="font-medium text-slate-700">Format attendu</p>
        <p>
          Colonnes CSV ou clés JSON :{" "}
          <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">
            name, email, phone, specialty, city, address
          </code>
        </p>
        <p className="text-xs text-slate-500">
          Les médecins importés sont créés inactifs et peuvent être activés depuis la liste.
          Mot de passe temporaire : <code className="font-mono">DoktoriTemp2026!</code>
        </p>
      </div>

      {/* Drop zone */}
      {rows.length === 0 && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-teal-400 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">
            Glissez un fichier ici ou cliquez pour sélectionner
          </p>
          <p className="text-xs text-slate-400 mt-1">CSV ou JSON, max 500 lignes</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {parseError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {parseError}
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && !result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FileText className="w-4 h-4" />
              <span className="font-medium">{fileName}</span>
              <span className="text-slate-400">—</span>
              <span>{rows.length} ligne(s)</span>
              {invalidRows.size > 0 && (
                <span className="text-amber-600 font-medium">
                  {invalidRows.size} invalide(s) ignorée(s)
                </span>
              )}
            </div>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">
              Réinitialiser
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 w-8">#</th>
                    {REQUIRED_HEADERS.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-slate-500 capitalize">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, i) => {
                    const isInvalid = invalidRows.has(i);
                    return (
                      <tr
                        key={i}
                        className={isInvalid ? "bg-red-50" : ""}
                      >
                        <td className="px-3 py-2 text-slate-400">
                          {isInvalid ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </td>
                        {REQUIRED_HEADERS.map((h) => (
                          <td
                            key={h}
                            className={`px-3 py-2 max-w-[120px] truncate ${
                              isInvalid ? "text-red-700" : "text-slate-700"
                            }`}
                          >
                            {row[h as keyof ImportRow] || (
                              <span className="text-red-400 italic">manquant</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {validCount} médecin(s) seront importés
            </p>
            <button
              onClick={handleImport}
              disabled={busy || validCount === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {busy ? "Import en cours…" : `Importer ${validCount} médecin(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div
            className={`flex items-center gap-3 px-4 py-4 rounded-xl border ${
              result.imported > 0
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">
                {result.imported} médecin(s) importé(s) avec succès
              </p>
              {result.errors.length > 0 && (
                <p className="text-sm mt-0.5">
                  {result.errors.length} erreur(s) — voir le détail ci-dessous
                </p>
              )}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Erreurs
              </div>
              <ul className="divide-y divide-slate-100">
                {result.errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 px-4 py-2.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-slate-700">{e.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Nouvel import
            </button>
            <a
              href="/admin/medecins"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              Voir les médecins
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
