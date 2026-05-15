"use client";

import { useEffect, useState, useMemo } from "react";
import { formatDoctorName } from "@/lib/format-doctor-name";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  UserRound,
  Search,
  Phone,
  Mail,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  X,
  FolderOpen,
  Plus,
  Check,
} from "lucide-react";

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  appointmentCount: number;
  lastVisit: string | null;
  lastDoctorName: string;
}

interface PatientHistory {
  id: string;
  startsAt: string;
  status: string;
  doctorName: string;
  doctorSpecialty: string;
  reason: string | null;
}

interface ClinicDoctor {
  id: string;
  name: string;
  specialty: string;
}

interface NewPatientForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cin: string;
  dateOfBirth: string;
  gender: string;
  doctorId: string;
  shareDossierWithClinic: boolean;
  firstRdvAt: string;
}

function NewPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<NewPatientForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    cin: "",
    dateOfBirth: "",
    gender: "",
    doctorId: "",
    shareDossierWithClinic: true,
    firstRdvAt: "",
  });
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/clinique/doctors")
      .then((r) => r.json())
      .then((data: { doctors?: ClinicDoctor[] }) => setDoctors(data.doctors ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/clinique/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          cin: form.cin || null,
          email: form.email || null,
          phone: form.phone,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          doctorId: form.doctorId,
          shareDossierWithClinic: form.shareDossierWithClinic,
          firstRdvAt: form.firstRdvAt || null,
        }),
      });
      const data = (await res.json()) as { patientId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setSuccess(true);
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function set(field: keyof NewPatientForm, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const inputCls =
    "w-full px-3 py-2 rounded-xl border border-border bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30";
  const labelCls = "block text-xs font-semibold text-muted-foreground mb-1";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-border"
          style={{ background: "#134E4A" }}
        >
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            Nouveau patient
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "#0891B2" }}
              >
                <Check className="h-7 w-7 text-white" />
              </div>
              <p className="font-bold text-foreground">Patient créé avec succès</p>
              <p className="text-sm text-muted-foreground">Redirection en cours…</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Prénom *</label>
                  <input
                    className={inputCls}
                    required
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className={labelCls}>Nom *</label>
                  <input
                    className={inputCls}
                    required
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    placeholder="Nom de famille"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Téléphone *</label>
                <input
                  className={inputCls}
                  required
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  type="tel"
                />
              </div>

              <div>
                <label className={labelCls}>CIN (optionnel)</label>
                <input
                  className={inputCls}
                  value={form.cin}
                  onChange={(e) => set("cin", e.target.value)}
                  placeholder="Numéro CIN"
                  maxLength={20}
                />
              </div>

              <div>
                <label className={labelCls}>Email (optionnel)</label>
                <input
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="patient@email.com"
                  type="email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date de naissance</label>
                  <input
                    className={inputCls}
                    value={form.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)}
                    type="date"
                  />
                </div>
                <div>
                  <label className={labelCls}>Genre</label>
                  <select
                    className={inputCls}
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                  >
                    <option value="">— Choisir —</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Médecin traitant *</label>
                <select
                  className={inputCls}
                  required
                  value={form.doctorId}
                  onChange={(e) => set("doctorId", e.target.value)}
                >
                  <option value="">— Sélectionner un médecin —</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatDoctorName(d.name)} — {d.specialty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Date du premier rendez-vous (optionnel)</label>
                <input
                  className={inputCls}
                  value={form.firstRdvAt}
                  onChange={(e) => set("firstRdvAt", e.target.value)}
                  type="datetime-local"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Si vide, le RDV sera créé pour demain à 09:00.
                </p>
              </div>

              {/* Sharing toggle */}
              <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-slate-50 dark:bg-gray-800/50">
                <button
                  type="button"
                  onClick={() => set("shareDossierWithClinic", !form.shareDossierWithClinic)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none mt-0.5 ${
                    form.shareDossierWithClinic ? "bg-cyan-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      form.shareDossierWithClinic ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Partager le dossier avec la clinique
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Si activé, tous les professionnels de la clinique pourront
                    consulter le dossier médical complet du patient.
                  </p>
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60"
                  style={{ background: "#0891B2" }}
                >
                  {loading ? "Création…" : "Créer le patient"}
                </button>
              </div>
            </>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  completed: "text-emerald-600 bg-emerald-50",
  confirmed: "text-blue-600 bg-blue-50",
  pending: "text-amber-600 bg-amber-50",
  cancelled: "text-red-500 bg-red-50",
  no_show: "text-gray-500 bg-gray-100",
};
const STATUS_LABELS: Record<string, string> = {
  completed: "Terminé",
  confirmed: "Confirmé",
  pending: "En attente",
  cancelled: "Annulé",
  no_show: "Absent",
};

function HistoryDrawer({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<PatientHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clinique/patients/${patient.id}`)
      .then((r) => r.json())
      .then(
        (data: {
          appointments?: Array<{
            id: string;
            startsAt: string;
            status: string;
            doctorName: string | null;
            doctorSpecialty: string | null;
            reason: string | null;
          }>;
        }) => {
          setHistory(
            (data.appointments ?? []).map((a) => ({
              id: a.id,
              startsAt: a.startsAt,
              status: a.status,
              doctorName: a.doctorName ?? "",
              doctorSpecialty: a.doctorSpecialty ?? "",
              reason: a.reason,
            }))
          );
        }
      )
      .finally(() => setLoading(false));
  }, [patient.id]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl border-l border-border flex flex-col"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-border"
        style={{ background: "#134E4A" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white"
            style={{ background: "#0891B2" }}
          >
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold text-sm">{patient.name}</p>
            <p className="text-teal-200 text-xs">{patient.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/clinique/patients/${patient.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-white transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Ouvrir le dossier
          </Link>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 border-b border-border grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-black text-foreground tabular-nums">
            {patient.appointmentCount}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">RDV total</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">
            {patient.lastVisit
              ? format(new Date(patient.lastVisit), "d MMM yyyy", { locale: fr })
              : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Dernière visite</div>
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Historique des consultations
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse h-16 bg-gray-100 dark:bg-gray-800 rounded-xl"
              />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">
            Aucune consultation trouvée
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl border border-border bg-slate-50 dark:bg-gray-800/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDoctorName(h.doctorName)}
                    </p>
                    <p className="text-xs text-muted-foreground">{h.doctorSpecialty}</p>
                    {h.reason && (
                      <p className="text-xs text-muted-foreground/70 mt-1 italic">
                        {h.reason}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.startsAt), "d MMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.startsAt), "HH:mm")}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[h.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {STATUS_LABELS[h.status] ?? h.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

type SortKey = "name" | "appointmentCount" | "lastVisit";

export default function CliniquePatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastVisit");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);

  function loadPatients() {
    setLoading(true);
    fetch("/api/clinique/patients")
      .then((r) => r.json())
      .then((data: { patients?: Patient[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setPatients(data.patients ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPatients();
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const sorted = useMemo(() => {
    let list = patients.filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "appointmentCount") {
        cmp = a.appointmentCount - b.appointmentCount;
      } else if (sortKey === "lastVisit") {
        const da = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        const db = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        cmp = da - db;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [patients, search, sortKey, sortAsc]);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k)
      return <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />;
    return sortAsc ? (
      <ChevronUp className="h-3.5 w-3.5" style={{ color: "#0891B2" }} />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" style={{ color: "#0891B2" }} />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <UserRound className="h-6 w-6" style={{ color: "#0891B2" }} strokeWidth={2.5} />
              Patients
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Tous les patients suivis dans la clinique
              {patients.length > 0 && (
                <span className="ml-2 font-semibold text-foreground">
                  ({patients.length})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowNewPatient(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors shrink-0"
            style={{ background: "#0891B2" }}
          >
            <Plus className="h-4 w-4" />
            Nouveau patient
          </button>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="relative max-w-sm"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 shadow-sm"
          />
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-4 flex items-center gap-4 animate-pulse"
                >
                  <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-700" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-36 bg-gray-100 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-4 w-12 bg-gray-100 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500 text-sm">
              Erreur : {error}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <UserRound className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
              <p className="font-medium text-sm">Aucun patient trouvé</p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-2 text-xs underline"
                  style={{ color: "#0891B2" }}
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="border-b border-border bg-slate-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3">
                      <button
                        onClick={() => toggleSort("name")}
                        className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Patient <SortIcon k="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Contact
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Dernier médecin
                    </th>
                    <th className="text-left px-4 py-3">
                      <button
                        onClick={() => toggleSort("lastVisit")}
                        className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Dernière visite <SortIcon k="lastVisit" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3">
                      <button
                        onClick={() => toggleSort("appointmentCount")}
                        className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ml-auto"
                      >
                        RDV total <SortIcon k="appointmentCount" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((patient, i) => (
                    <motion.tr
                      key={patient.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => setSelected(patient)}
                      className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                            style={{ background: "#0891B2" }}
                          >
                            {patient.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-semibold text-foreground">
                            {patient.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs">{patient.phone}</span>
                        </div>
                        {patient.email && (
                          <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs truncate max-w-[160px]">
                              {patient.email}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDoctorName(patient.lastDoctorName)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {patient.lastVisit
                          ? format(new Date(patient.lastVisit), "d MMM yyyy", {
                              locale: fr,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CalendarCheck
                            className="h-3.5 w-3.5"
                            style={{ color: "#0891B2" }}
                          />
                          <span className="font-black text-foreground tabular-nums">
                            {patient.appointmentCount}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Patient history drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setSelected(null)}
            />
            <HistoryDrawer
              patient={selected}
              onClose={() => setSelected(null)}
            />
          </>
        )}
      </AnimatePresence>

      {/* New patient modal */}
      <AnimatePresence>
        {showNewPatient && (
          <NewPatientModal
            onClose={() => setShowNewPatient(false)}
            onCreated={() => loadPatients()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
