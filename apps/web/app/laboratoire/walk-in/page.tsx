"use client";

import { useState, useEffect } from "react";
import { Search, Upload, UserPlus, Loader2, UserCheck, Plus, ChevronDown } from "lucide-react";
import { LAB_TESTS, RADIO_EXAMS } from "@/lib/lab-test-catalog";

type CatalogEntry = { code: string; name: string };

interface PatientResult {
  id: string;
  name: string;
  phone: string;
}

export default function LaboratoireWalkInPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [searchDone, setSearchDone] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cin, setCin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Order creation
  const [createOrder, setCreateOrder] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [urgency, setUrgency] = useState("routine");
  const [internalRef, setInternalRef] = useState("");
  const [specimenAt, setSpecimenAt] = useState("");
  const [expectedAt, setExpectedAt] = useState("");

  // Custom analyses catalog (falls back to static if empty)
  const [testCatalog, setTestCatalog] = useState<CatalogEntry[]>([]);
  useEffect(() => {
    fetch("/api/laboratoire/analyses")
      .then((r) => r.ok ? r.json() : { analyses: [] })
      .then((data) => {
        const custom: CatalogEntry[] = (data.analyses ?? []).map((a: { code: string; name: string }) => ({ code: a.code, name: a.name }));
        setTestCatalog(custom.length > 0 ? custom : [...LAB_TESTS, ...RADIO_EXAMS]);
      })
      .catch(() => setTestCatalog([...LAB_TESTS, ...RADIO_EXAMS]));
  }, []);

  // Upload (legacy flow)
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setPatients([]);
    setSelectedPatient(null);
    try {
      const res = await fetch("/api/patients/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query.trim() }),
      });
      if (!res.ok) { setSearchError("Erreur lors de la recherche."); return; }
      const data = await res.json() as { patients: PatientResult[] };
      setPatients(data.patients ?? []);
      setSearchDone(true);
    } catch {
      setSearchError("Erreur réseau. Réessayez.");
    } finally {
      setSearching(false);
    }
  }

  async function handleCreatePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() && !lastName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const orderPayload = createOrder && selectedTests.length > 0 ? {
        createOrder: true,
        order: {
          tests: selectedTests.map((code) => {
            const entry = testCatalog.find((t) => t.code === code);
            return { code, label: entry?.name ?? code };
          }),
          urgency,
          internalRef: internalRef || undefined,
          specimenCollectedAt: specimenAt || undefined,
          expectedResultAt: expectedAt || undefined,
          doctorId: null,
        },
      } : {};

      const res = await fetch("/api/laboratoire/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          cin: cin.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          dob: dob || undefined,
          gender: gender || undefined,
          ...orderPayload,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setCreateError(d.error ?? "Erreur de création.");
        return;
      }
      const data = await res.json() as { patient: PatientResult; matched: string | null; orderId: string | null };
      setSelectedPatient(data.patient);
      setShowCreate(false);
      if (data.orderId) {
        setUploadSuccess(true);
      }
    } catch {
      setCreateError("Erreur réseau. Réessayez.");
    } finally {
      setCreating(false);
    }
  }

  function toggleTest(code: string) {
    setSelectedTests((ts) => ts.includes(code) ? ts.filter((t) => t !== code) : [...ts, code]);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !file) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", selectedPatient.id);
      formData.append("note", note);
      const res = await fetch("/api/laboratoire/walk-in/results", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setUploadError(data.error ?? "Erreur lors de l'envoi.");
        return;
      }
      setUploadSuccess(true);
      setFile(null);
      setNote("");
      setSelectedPatient(null);
      setPatients([]);
      setQuery("");
    } catch {
      setUploadError("Erreur réseau. Réessayez.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <UserPlus className="h-6 w-6" style={{ color: "#16A34A" }} strokeWidth={2.5} />
          Walk-in — Patient direct
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recherchez un patient par nom, téléphone ou CIN, puis téléversez ses résultats ou créez une commande.
        </p>
      </div>

      {/* Step 1 — search */}
      <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-green-800">1 · Rechercher le patient</p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-green-500 bg-white">
            <Search className="mr-2 h-4 w-4 text-muted-foreground shrink-0" strokeWidth={2} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, téléphone ou CIN…"
              className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-all"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </form>

        {searchError && <p className="text-sm text-red-600">{searchError}</p>}

        {patients.length > 0 && (
          <ul className="space-y-1.5">
            {patients.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(p)}
                  className={[
                    "w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm",
                    selectedPatient?.id === p.id ? "border-green-500 bg-green-50" : "border-border hover:border-green-300",
                  ].join(" ")}
                >
                  <span className="font-semibold text-foreground">{p.name}</span>
                  <span className="text-muted-foreground ml-2" dir="ltr">{p.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {searchDone && patients.length === 0 && !selectedPatient && !showCreate && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">Aucun patient trouvé.</p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-green-700 underline"
            >
              <UserCheck className="h-4 w-4" />
              Créer un nouveau patient
            </button>
          </div>
        )}

        {showCreate && !selectedPatient && (
          <form onSubmit={handleCreatePatient} className="space-y-4 border-t border-border pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-green-800">Nouveau patient</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                  className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Nom <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Nom de famille"
                  className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">CIN</label>
                <input type="text" value={cin} onChange={(e) => setCin(e.target.value)} placeholder="12345678"
                  className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Téléphone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX"
                  className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com"
                  className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Date de naissance</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                  className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Genre</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}
                  className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500">
                  <option value="">— Sélectionner —</option>
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                </select>
              </div>
            </div>

            {/* Create order toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createOrder}
                onChange={(e) => setCreateOrder(e.target.checked)}
                className="h-4 w-4 accent-green-600"
              />
              <span className="text-sm font-medium text-foreground">Créer une commande maintenant</span>
            </label>

            {createOrder && (
              <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-green-800">Détails de la commande</p>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Analyses / Examens</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {testCatalog.map((t) => (
                      <label key={t.code} className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedTests.includes(t.code)}
                          onChange={() => toggleTest(t.code)}
                          className="h-3.5 w-3.5 accent-green-600"
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Urgence</label>
                  <select value={urgency} onChange={(e) => setUrgency(e.target.value)}
                    className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Référence interne</label>
                    <input type="text" value={internalRef} onChange={(e) => setInternalRef(e.target.value)} placeholder="REF-001"
                      className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Résultat prévu</label>
                    <input type="datetime-local" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)}
                      className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500" />
                  </div>
                </div>
              </div>
            )}

            {createError && <p className="text-xs text-red-600">{createError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || (!firstName.trim() && !lastName.trim())}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {selectedPatient && (
          <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Sélectionné : {selectedPatient.name}
          </div>
        )}
      </div>

      {/* Step 2 — upload */}
      {selectedPatient && !uploadSuccess && (
        <form onSubmit={handleUpload} className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-green-800">2 · Téléverser les résultats</p>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Fichier résultat</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">Note (optionnel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Commentaire…"
              className="w-full rounded-xl border-2 border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-green-500 resize-none"
            />
          </div>

          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

          <button
            type="submit"
            disabled={uploading || !file}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Upload className="h-4 w-4" strokeWidth={2.5} />}
            Téléverser les résultats
          </button>
        </form>
      )}

      {uploadSuccess && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700 text-sm font-semibold">
          Opération réussie. Patient enregistré
          {createOrder ? " et commande créée." : " et résultats envoyés."}
        </div>
      )}
    </div>
  );
}
