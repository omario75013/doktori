"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, ClipboardList, FileText, ArrowRightLeft, Clock,
  Loader2, Upload, Send, UserCheck, CheckCircle2
} from "lucide-react";

type OrderData = {
  id: string;
  status: string;
  urgency: string;
  tests: { code?: string; label?: string }[];
  instructions: string | null;
  createdAt: string;
  completedAt: string | null;
  internalRef: string | null;
  specimenCollectedAt: string | null;
  expectedResultAt: string | null;
  resultUploadedAt: string | null;
  resultSummary: string | null;
  technicianId: string | null;
  accessToken: string;
};

type PatientData = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cin: string | null;
  dob: string | null;
  gender: string | null;
};

type DoctorData = {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  email: string;
};

type Technician = { id: string; name: string; role: string };

type Props = {
  order: OrderData;
  patient: PatientData;
  doctor: DoctorData;
  labKind: "lab" | "radiology";
  technicians: Technician[];
};

const TABS = [
  { key: "patient", label: "Patient", icon: User },
  { key: "demande", label: "Demande", icon: ClipboardList },
  { key: "resultats", label: "Résultats", icon: FileText },
  { key: "echange", label: "Échange", icon: ArrowRightLeft },
  { key: "historique", label: "Historique", icon: Clock },
];

function calcAge(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-TN", { dateStyle: "medium" });
}

function fmtDT(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-TN", { dateStyle: "medium", timeStyle: "short" });
}

// ─── Demande editable fields form ─────────────────────────────────────────────

function DemandeTab({ order, labKind }: { order: OrderData; labKind: "lab" | "radiology" }) {
  const router = useRouter();
  const [internalRef, setInternalRef] = useState(order.internalRef ?? "");
  const [specimenAt, setSpecimenAt] = useState(
    order.specimenCollectedAt ? order.specimenCollectedAt.slice(0, 16) : ""
  );
  const [expectedAt, setExpectedAt] = useState(
    order.expectedResultAt ? order.expectedResultAt.slice(0, 16) : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const testsLabel = labKind === "radiology" ? "Examens d'imagerie" : "Analyses demandées";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/laboratoire/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internalRef: internalRef || null,
          specimenCollectedAt: specimenAt || null,
          expectedResultAt: expectedAt || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setErr(d.error ?? "Erreur.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setErr("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Doctor info */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-2">Médecin prescripteur</p>
        <p className="font-semibold text-foreground">{order.instructions ? "Instructions jointes" : ""}</p>
        <p className="text-sm text-muted-foreground">{fmt(order.createdAt)} · {order.urgency === "urgent" ? "Urgent" : "Routine"}</p>
      </div>

      {/* Tests */}
      <div className="rounded-xl border border-border bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-3">{testsLabel}</p>
        {order.tests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun examen spécifié.</p>
        ) : (
          <ul className="space-y-1.5">
            {order.tests.map((t, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                {t.label ?? t.code ?? `Examen ${i + 1}`}
                {t.code && t.label && <span className="text-xs text-muted-foreground">({t.code})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {order.instructions && (
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-2">Instructions</p>
          <p className="text-sm text-foreground whitespace-pre-line">{order.instructions}</p>
        </div>
      )}

      {/* Editable fields */}
      <form onSubmit={handleSave} className="rounded-xl border border-border bg-white p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-green-800">Informations internes</p>

        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Référence interne
          </label>
          <input
            type="text"
            value={internalRef}
            onChange={(e) => setInternalRef(e.target.value)}
            placeholder="REF-2025-001"
            className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Date de prélèvement
            </label>
            <input
              type="datetime-local"
              value={specimenAt}
              onChange={(e) => setSpecimenAt(e.target.value)}
              className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Date de résultat prévue
            </label>
            <input
              type="datetime-local"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
              className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
            />
          </div>
        </div>

        {err && <p className="text-xs text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : null}
          {saved ? "Enregistré" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}

// ─── Results tab ───────────────────────────────────────────────────────────────

function ResultsTab({
  order,
  labKind,
  technicians,
}: {
  order: OrderData;
  labKind: "lab" | "radiology";
  technicians: Technician[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [techId, setTechId] = useState(order.technicianId ?? "");
  const [summary, setSummary] = useState(order.resultSummary ?? "");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isCompleted = order.status === "completed";

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("technicianId", techId);
      formData.append("resultSummary", summary);
      const res = await fetch(`/api/laboratoire/orders/${order.id}/results`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setErr(d.error ?? "Erreur.");
        return;
      }
      router.refresh();
    } catch {
      setErr("Erreur réseau.");
    } finally {
      setUploading(false);
    }
  }

  if (isCompleted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" strokeWidth={2.5} />
          <p className="text-sm font-semibold text-green-800">Résultats transmis avec succès.</p>
        </div>
        {order.resultSummary && (
          <p className="text-sm text-green-700">Résumé : {order.resultSummary}</p>
        )}
        {order.resultUploadedAt && (
          <p className="text-xs text-green-600">Envoyé le {fmtDT(order.resultUploadedAt)}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleUpload} className="rounded-xl border border-border bg-white p-5 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-green-800">
        {labKind === "radiology" ? "Téléverser le compte rendu d'imagerie" : "Téléverser les résultats"}
      </p>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Fichier résultat (PDF / image)
        </label>
        <input
          type="file"
          accept="application/pdf,image/*"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
        />
      </div>

      {technicians.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Technicien responsable
          </label>
          <select
            value={techId}
            onChange={(e) => setTechId(e.target.value)}
            className="h-11 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
          >
            <option value="">— Sélectionner —</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Résumé (optionnel)
        </label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Normal, Élevé, Voir rapport…"
          className="h-11 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
        />
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button
        type="submit"
        disabled={uploading || !file}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Envoyer les résultats
      </button>
    </form>
  );
}

// ─── Echange (send to patient / doctor) tab ────────────────────────────────────

function EchangeTab({ order, patient }: { order: OrderData; patient: PatientData }) {
  const [sendingPat, setSendingPat] = useState(false);
  const [patNote, setPatNote] = useState("");
  const [patFile, setPatFile] = useState<File | null>(null);
  const [patMsg, setPatMsg] = useState<string | null>(null);

  const [sendingDoc, setSendingDoc] = useState(false);
  const [docNote, setDocNote] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docMsg, setDocMsg] = useState<string | null>(null);

  async function uploadFile(f: File): Promise<{ url: string; name: string; mime: string; size: number }> {
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/laboratoire/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    return res.json() as Promise<{ url: string; name: string; mime: string; size: number }>;
  }

  async function handleSendPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!patFile) return;
    setSendingPat(true);
    setPatMsg(null);
    try {
      const fileData = await uploadFile(patFile);
      const res = await fetch("/api/laboratoire/send-to-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, file: fileData, note: patNote || undefined }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setPatMsg("Erreur : " + (d.error ?? "inconnue"));
        return;
      }
      setPatMsg("Fichier envoyé au patient avec succès.");
      setPatFile(null);
      setPatNote("");
    } catch {
      setPatMsg("Erreur réseau.");
    } finally {
      setSendingPat(false);
    }
  }

  async function handleSendDoctor(e: React.FormEvent) {
    e.preventDefault();
    if (!docFile) return;
    setSendingDoc(true);
    setDocMsg(null);
    try {
      const fileData = await uploadFile(docFile);
      const res = await fetch("/api/laboratoire/send-to-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          doctorId: null, // prescribing doctor resolved server-side via order
          orderId: order.id,
          file: fileData,
          note: docNote || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setDocMsg("Erreur : " + (d.error ?? "inconnue"));
        return;
      }
      setDocMsg("Fichier envoyé au médecin avec succès.");
      setDocFile(null);
      setDocNote("");
    } catch {
      setDocMsg("Erreur réseau.");
    } finally {
      setSendingDoc(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Send to patient */}
      <form onSubmit={handleSendPatient} className="rounded-xl border border-border bg-white p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-green-800 flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5" />
          Envoyer au patient — {patient.name}
        </p>
        <input
          type="file"
          accept="application/pdf,image/*"
          required
          onChange={(e) => setPatFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
        />
        <input
          type="text"
          value={patNote}
          onChange={(e) => setPatNote(e.target.value)}
          placeholder="Note optionnelle…"
          className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
        />
        {patMsg && <p className={`text-sm ${patMsg.startsWith("Erreur") ? "text-red-600" : "text-green-700"}`}>{patMsg}</p>}
        <button
          type="submit"
          disabled={sendingPat || !patFile}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {sendingPat ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
          Envoyer au patient
        </button>
      </form>

      {/* Send to doctor */}
      <form onSubmit={handleSendDoctor} className="rounded-xl border border-border bg-white p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-green-800 flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5" />
          Envoyer au médecin prescripteur
        </p>
        <input
          type="file"
          accept="application/pdf,image/*"
          required
          onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
        />
        <input
          type="text"
          value={docNote}
          onChange={(e) => setDocNote(e.target.value)}
          placeholder="Note optionnelle…"
          className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
        />
        {docMsg && <p className={`text-sm ${docMsg.startsWith("Erreur") ? "text-red-600" : "text-green-700"}`}>{docMsg}</p>}
        <button
          type="submit"
          disabled={sendingDoc || !docFile}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {sendingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Envoyer au médecin
        </button>
      </form>
    </div>
  );
}

// ─── Historique tab ────────────────────────────────────────────────────────────

function HistoriqueTab({ order }: { order: OrderData }) {
  const events = [
    { label: "Commande créée", at: order.createdAt, show: true },
    { label: "Prélèvement effectué", at: order.specimenCollectedAt, show: !!order.specimenCollectedAt },
    { label: "Résultats téléversés", at: order.resultUploadedAt, show: !!order.resultUploadedAt },
    { label: "Commande complétée", at: order.completedAt, show: !!order.completedAt },
  ].filter((e) => e.show);

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-4">Chronologie</p>
      <ol className="relative border-l-2 border-green-200 ml-2 space-y-5">
        {events.map((ev, i) => (
          <li key={i} className="ml-5">
            <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-2 ring-white">
              <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={3} />
            </span>
            <p className="text-sm font-semibold text-foreground">{ev.label}</p>
            <p className="text-xs text-muted-foreground">{fmtDT(ev.at)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Main tabs component ───────────────────────────────────────────────────────

export function OrderTabs({ order, patient, doctor, labKind, technicians }: Props) {
  const [activeTab, setActiveTab] = useState("patient");

  const age = calcAge(patient.dob);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-white rounded-2xl border border-border p-1 mb-5 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={[
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                active
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-50",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "patient" && (
        <div className="rounded-xl border border-border bg-white p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-green-800">Informations patient</p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Nom</p>
              <p className="font-semibold text-foreground">{patient.name}</p>
            </div>
            {patient.cin && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">CIN</p>
                <p className="font-medium text-foreground" dir="ltr">{patient.cin}</p>
              </div>
            )}
            {patient.phone && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Téléphone</p>
                <p className="font-medium text-foreground" dir="ltr">{patient.phone}</p>
              </div>
            )}
            {patient.email && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Email</p>
                <p className="font-medium text-foreground">{patient.email}</p>
              </div>
            )}
            {patient.dob && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Date de naissance</p>
                <p className="font-medium text-foreground">
                  {fmt(patient.dob)}{age !== null ? ` (${age} ans)` : ""}
                </p>
              </div>
            )}
            {patient.gender && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Genre</p>
                <p className="font-medium text-foreground capitalize">{patient.gender}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "demande" && <DemandeTab order={order} labKind={labKind} />}

      {activeTab === "resultats" && (
        <ResultsTab order={order} labKind={labKind} technicians={technicians} />
      )}

      {activeTab === "echange" && <EchangeTab order={order} patient={patient} />}

      {activeTab === "historique" && <HistoriqueTab order={order} />}
    </div>
  );
}
