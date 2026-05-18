"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Loader2,
  UserPlus,
  X,
  Check,
  Clock,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DoctorRow {
  id: string;
  name: string;
  specialty: string;
  email: string;
  photoUrl: string | null;
  role: string;
  joinedAt: string;
  invitationStatus?: "pending" | "accepted";
}

interface ClinicDoctorsResponse {
  doctors: DoctorRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  member: "Membre",
};

const INVITATION_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Invitation envoyée — en attente d'acceptation",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  accepted: {
    label: "Actif",
    className: "bg-green-50 text-green-700 border-green-200",
  },
};

// ── InviteModal ───────────────────────────────────────────────────────────────

type ModalTab = "invite" | "create";

function InviteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<ModalTab>("invite");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Create form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [fee, setFee] = useState("");
  const [gender, setGender] = useState("");

  function switchTab(next: ModalTab) {
    setTab(next);
    setError(null);
    setSuccess(null);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/clinique/doctors", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "invite", email: inviteEmail, role: inviteRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setError(data.error ?? "Erreur inconnue"); return; }
      setSuccess("Invitation envoyée — en attente d'acceptation.");
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !createEmail || !phone || !specialty) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/clinique/doctors", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "create",
          firstName,
          lastName,
          email: createEmail,
          phone,
          specialty,
          consultationFee: fee ? parseFloat(fee) : undefined,
          gender: gender || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setError(data.error ?? "Erreur inconnue"); return; }
      setSuccess("Compte médecin créé. Les identifiants ont été envoyés par email.");
      setTimeout(() => { onSuccess(); onClose(); }, 2000);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Ajouter un médecin</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(["invite", "create"] as ModalTab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-teal-600 text-teal-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "invite" ? "Inviter un médecin existant" : "Créer un nouveau médecin"}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700">
              <Check className="h-4 w-4 mt-0.5 shrink-0" />
              {success}
            </div>
          )}

          {/* ── Invite tab ── */}
          {tab === "invite" && (
            <form onSubmit={(e) => void handleInvite(e)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email du médecin <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="medecin@exemple.tn"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Administrateur</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !inviteEmail.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Envoyer l&apos;invitation
              </button>
            </form>
          )}

          {/* ── Create tab ── */}
          {tab === "create" && (
            <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Sami"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Bouaziz"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  placeholder="medecin@exemple.tn"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <PhoneInput value={phone} onChange={setPhone} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Genre</label>
                  <div className="relative">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Non précisé</option>
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Spécialité <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  required
                  placeholder="Médecine générale"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Honoraires (DT)
                </label>
                <input
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  min="0"
                  step="0.5"
                  placeholder="50"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Créer le compte médecin
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CliniqueMedecinsPage() {
  const { data: session } = useSession();
  const clinicId = session?.user?.id ?? null;
  const [doctorsList, setDoctorsList] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    if (!clinicId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clinique/doctors", { credentials: "include" });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Erreur inconnue");
        return;
      }
      const data = (await res.json()) as ClinicDoctorsResponse;
      setDoctorsList(data.doctors);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  if (loading && doctorsList.length === 0) {
    return (
      <div className="flex items-center gap-2 py-20 justify-center text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-20 justify-center text-sm text-red-500">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Médecins</h1>
          <p className="text-sm text-gray-500 mt-1">
            {doctorsList.length} médecin{doctorsList.length !== 1 ? "s" : ""} associé
            {doctorsList.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          + Ajouter un médecin
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Nom</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Spécialité</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Rôle</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-end px-4 py-3 font-medium text-gray-600">Depuis le</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {doctorsList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  Aucun médecin associé à cette clinique
                </td>
              </tr>
            ) : (
              doctorsList.map((doc) => {
                const invStatus = doc.invitationStatus ?? "accepted";
                const statusMeta = INVITATION_STATUS_META[invStatus];
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{doc.name}</td>
                    <td className="px-4 py-3 text-gray-600">{doc.specialty}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${
                          doc.role === "admin"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {ROLE_LABELS[doc.role] ?? doc.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${statusMeta?.className ?? ""}`}
                      >
                        {invStatus === "pending" ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        {statusMeta?.label ?? invStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end text-gray-500">
                      {new Date(doc.joinedAt).toLocaleDateString("fr-TN")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <InviteModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => void load()}
        />
      )}
    </div>
  );
}
