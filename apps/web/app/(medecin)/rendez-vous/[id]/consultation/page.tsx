"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { searchIcd10, type Icd10Code } from "@/lib/icd10-tn";
import { CheckCircle2, X, ClipboardList, ArrowLeft, Send, FileText, ExternalLink } from "lucide-react";

type Vitals = {
  bp_systolic?: number | "";
  bp_diastolic?: number | "";
  heart_rate?: number | "";
  temperature?: number | "";
  weight?: number | "";
  height?: number | "";
  spo2?: number | "";
  respiratory_rate?: number | "";
};

type ConsultationNote = {
  id?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitals: Vitals;
  icd10Codes: Icd10Code[];
};

const EMPTY_NOTE: ConsultationNote = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  vitals: {},
  icd10Codes: [],
};

function VitalsGrid({
  vitals,
  onChange,
}: {
  vitals: Vitals;
  onChange: (v: Vitals) => void;
}) {
  const fields: { key: keyof Vitals; label: string; unit: string; placeholder: string }[] = [
    { key: "bp_systolic", label: "PA systolique", unit: "mmHg", placeholder: "120" },
    { key: "bp_diastolic", label: "PA diastolique", unit: "mmHg", placeholder: "80" },
    { key: "heart_rate", label: "Fréquence cardiaque", unit: "bpm", placeholder: "70" },
    { key: "temperature", label: "Température", unit: "°C", placeholder: "37.0" },
    { key: "weight", label: "Poids", unit: "kg", placeholder: "70" },
    { key: "height", label: "Taille", unit: "cm", placeholder: "170" },
    { key: "spo2", label: "SpO2", unit: "%", placeholder: "98" },
    { key: "respiratory_rate", label: "FR respiratoire", unit: "/min", placeholder: "16" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {fields.map(({ key, label, unit, placeholder }) => (
        <div key={key}>
          <label className="block text-xs text-[#134E4A] font-medium mb-1">
            {label}
            <span className="ml-1 text-gray-400 font-normal">({unit})</span>
          </label>
          <input
            type="number"
            step="any"
            placeholder={placeholder}
            value={vitals[key] ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange({
                ...vitals,
                [key]: val === "" ? "" : parseFloat(val),
              });
            }}
            className="w-full h-10 border border-[#E6F4F1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent bg-white"
          />
        </div>
      ))}
    </div>
  );
}

function IcdTagger({
  selected,
  onChange,
}: {
  selected: Icd10Code[];
  onChange: (codes: Icd10Code[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Icd10Code[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim()) {
      setResults(searchIcd10(query));
      setOpen(true);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, [query]);

  const addCode = (code: Icd10Code) => {
    if (!selected.find((c) => c.code === code.code)) {
      onChange([...selected, code]);
    }
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeCode = (code: string) => {
    onChange(selected.filter((c) => c.code !== code));
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Rechercher un code CIM-10 (ex: diabète, I10...)"
          className="w-full h-10 border border-[#E6F4F1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2] bg-white"
        />
        {open && results.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#E6F4F1] rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.code}
                type="button"
                onMouseDown={() => addCode(r)}
                className="w-full text-left px-3 py-2 hover:bg-[#F0FDFA] text-sm flex items-center gap-2 transition-colors"
              >
                <span className="font-mono text-xs bg-[#E6F4F1] text-[#0891B2] px-1.5 py-0.5 rounded-lg font-bold shrink-0">
                  {r.code}
                </span>
                <span className="text-gray-700">{r.label}</span>
                <span className="ml-auto text-xs text-gray-400 shrink-0">{r.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((c) => (
            <span
              key={c.code}
              className="inline-flex items-center gap-1.5 bg-[#E6F4F1] text-[#134E4A] text-xs px-2 py-1 rounded-full font-medium"
            >
              <span className="font-mono font-bold text-[#0891B2]">{c.code}</span>
              {c.label}
              <button
                type="button"
                onClick={() => removeCode(c.code)}
                className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SoapSection({
  label,
  letter,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  letter: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-full bg-[#0891B2] text-white flex items-center justify-center text-xs font-bold shrink-0">
          {letter}
        </span>
        <label className="font-medium text-[#134E4A] text-sm">{label}</label>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full border border-[#E6F4F1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2] resize-y bg-white text-gray-800"
      />
    </div>
  );
}

type SendStatus = "idle" | "sending" | "sent" | "error";

export default function ConsultationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = params.id;

  const [note, setNote] = useState<ConsultationNote>(EMPTY_NOTE);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [appointmentDate, setAppointmentDate] = useState<string | null>(null);
  const [appointmentStatus, setAppointmentStatus] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientEmail, setPatientEmail] = useState<string | null | undefined>(undefined);
  const [sendPrescriptionStatus, setSendPrescriptionStatus] = useState<SendStatus>("idle");
  const [sendCnamStatus, setSendCnamStatus] = useState<SendStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing note
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch appointment date and status
        const apptRes = await fetch(`/api/appointments/${appointmentId}`);
        if (apptRes.ok) {
          const apptData = await apptRes.json();
          if (apptData?.startsAt) {
            setAppointmentDate(apptData.startsAt);
          }
          if (apptData?.status) {
            setAppointmentStatus(apptData.status);
          }
          if (apptData?.patientId) {
            setPatientId(apptData.patientId);
            // Fetch patient email
            const ptRes = await fetch(`/api/patients/${apptData.patientId}`);
            if (ptRes.ok) {
              const ptData = await ptRes.json();
              setPatientEmail(ptData?.patient?.email ?? null);
            } else {
              setPatientEmail(null);
            }
          }
        }

        const res = await fetch(`/api/consultation-notes/${appointmentId}`);
        if (res.ok) {
          const data = await res.json();
          setNote({
            id: data.id,
            subjective: data.subjective ?? "",
            objective: data.objective ?? "",
            assessment: data.assessment ?? "",
            plan: data.plan ?? "",
            vitals: data.vitals ?? {},
            icd10Codes: data.icd10Codes ?? [],
          });
        }
      } catch {
        // Start with empty note
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [appointmentId]);

  const save = useCallback(
    async (current: ConsultationNote) => {
      setSaveStatus("saving");
      try {
        const cleanVitals: Record<string, number> = {};
        for (const [k, v] of Object.entries(current.vitals)) {
          if (v !== "" && v !== undefined && v !== null && !isNaN(Number(v))) {
            cleanVitals[k] = Number(v);
          }
        }

        const res = await fetch("/api/consultation-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId,
            subjective: current.subjective || null,
            objective: current.objective || null,
            assessment: current.assessment || null,
            plan: current.plan || null,
            vitals: Object.keys(cleanVitals).length > 0 ? cleanVitals : null,
            icd10_codes: current.icd10Codes.length > 0 ? current.icd10Codes : null,
          }),
        });
        if (!res.ok) throw new Error("save failed");
        const data = await res.json();
        setNote((prev) => ({ ...prev, id: data.id }));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [appointmentId]
  );

  const scheduleAutoSave = useCallback(
    (updated: ConsultationNote) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        save(updated);
      }, 500);
    },
    [save]
  );

  const updateNote = useCallback(
    (patch: Partial<ConsultationNote>) => {
      setNote((prev) => {
        const updated = { ...prev, ...patch };
        scheduleAutoSave(updated);
        setSaveStatus("idle");
        return updated;
      });
    },
    [scheduleAutoSave]
  );

  const sendDocument = async (
    endpoint: "send-prescription" | "send-cnam",
    setStatus: (s: SendStatus) => void
  ) => {
    setStatus("sending");
    try {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/${endpoint}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error(`[${endpoint}] failed:`, data);
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (loading) {
    return <p className="text-[#0891B2] text-sm p-6">Chargement de la note de consultation...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/rendez-vous")}
          className="h-9 w-9 rounded-xl border border-[#E6F4F1] hover:bg-[#F0FDFA] flex items-center justify-center text-gray-500 hover:text-[#0891B2] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#134E4A]">Note de consultation SOAP</h1>
          {appointmentDate && (
            <p className="text-sm text-gray-500 mt-0.5">
              RDV du {format(new Date(appointmentDate), "d MMMM yyyy à HH:mm", { locale: fr })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          {saveStatus === "saving" && (
            <span className="text-gray-400">Enregistrement...</span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[#0891B2] font-medium">
              <CheckCircle2 size={15} />
              Enregistré
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-red-500">Erreur lors de l&apos;enregistrement</span>
          )}
        </div>
      </div>

      {/* Vitals */}
      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#134E4A] text-sm uppercase tracking-wide">
          Constantes vitales
        </h2>
        <VitalsGrid
          vitals={note.vitals}
          onChange={(vitals) => updateNote({ vitals })}
        />
      </div>

      {/* SOAP Sections */}
      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5 shadow-sm space-y-6">
        <SoapSection
          letter="S"
          label="Subjectif — Ce que rapporte le patient"
          value={note.subjective}
          onChange={(subjective) => updateNote({ subjective })}
          placeholder="Motif de consultation, symptômes décrits par le patient, évolution..."
        />
        <SoapSection
          letter="O"
          label="Objectif — Observations cliniques"
          value={note.objective}
          onChange={(objective) => updateNote({ objective })}
          placeholder="Examen physique, résultats biologiques, signes cliniques..."
        />

        {/* Assessment with ICD-10 tagger */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-full bg-[#0891B2] text-white flex items-center justify-center text-xs font-bold shrink-0">
              A
            </span>
            <label className="font-medium text-[#134E4A] text-sm">
              Assessment — Diagnostic
            </label>
          </div>
          <textarea
            value={note.assessment}
            onChange={(e) => updateNote({ assessment: e.target.value })}
            placeholder="Diagnostic principal, diagnostics différentiels..."
            rows={3}
            className="w-full border border-[#E6F4F1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2] resize-y bg-white text-gray-800 mb-3"
          />
          <div className="space-y-1.5">
            <div className="text-xs text-[#134E4A] font-medium">Codes CIM-10</div>
            <IcdTagger
              selected={note.icd10Codes}
              onChange={(icd10Codes) => updateNote({ icd10Codes })}
            />
          </div>
        </div>

        <SoapSection
          letter="P"
          label="Plan — Traitement et suivi"
          value={note.plan}
          onChange={(plan) => updateNote({ plan })}
          placeholder="Traitement prescrit, examens à effectuer, renvoi spécialiste, suivi..."
        />
      </div>

      {/* Documents du patient — only for completed appointments */}
      {appointmentStatus === "completed" && (
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0891B2]" />
            <h2 className="font-semibold text-[#134E4A] text-sm uppercase tracking-wide">
              Documents du patient
            </h2>
          </div>

          {/* Patient email info */}
          {patientEmail === undefined ? null : patientEmail ? (
            <p className="text-xs text-gray-500">
              Documents envoyés à :{" "}
              <span className="font-medium text-[#134E4A]">{patientEmail}</span>
            </p>
          ) : (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Le patient n&apos;a pas d&apos;adresse email — les documents seront envoyés par SMS uniquement.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {/* Send prescription */}
            <button
              onClick={() => sendDocument("send-prescription", setSendPrescriptionStatus)}
              disabled={sendPrescriptionStatus === "sending"}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#E6F4F1] bg-white hover:bg-[#F0FDFA] text-sm font-medium text-[#134E4A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendPrescriptionStatus === "sending" ? (
                <span className="h-4 w-4 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4 text-[#0891B2]" />
              )}
              {sendPrescriptionStatus === "sent"
                ? "Ordonnance envoyée"
                : sendPrescriptionStatus === "error"
                ? "Erreur — réessayer"
                : "Envoyer l'ordonnance"}
            </button>

            {/* Send CNAM */}
            <button
              onClick={() => sendDocument("send-cnam", setSendCnamStatus)}
              disabled={sendCnamStatus === "sending"}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#E6F4F1] bg-white hover:bg-[#F0FDFA] text-sm font-medium text-[#134E4A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendCnamStatus === "sending" ? (
                <span className="h-4 w-4 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4 text-[#0891B2]" />
              )}
              {sendCnamStatus === "sent"
                ? "Bordereau CNAM envoyé"
                : sendCnamStatus === "error"
                ? "Erreur — réessayer"
                : "Envoyer le bordereau CNAM"}
            </button>

            {/* View patient dossier */}
            {patientId && (
              <a
                href={`/patients/${patientId}`}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#0891B2] bg-[#F0FDFA] text-sm font-medium text-[#0891B2] hover:bg-[#E6F4F1] transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Voir le dossier patient
              </a>
            )}
          </div>

          {(sendPrescriptionStatus === "sent" || sendCnamStatus === "sent") && (
            <p className="flex items-center gap-1.5 text-xs text-[#0891B2] font-medium">
              <CheckCircle2 size={14} />
              Document(s) envoyé(s) avec succès par SMS
              {patientEmail ? " et email" : ""}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
