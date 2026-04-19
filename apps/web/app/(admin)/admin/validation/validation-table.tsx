"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

type Document = {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
};

type DoctorRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string;
  city: string;
  isActive: boolean;
  createdAt: string;
  verificationStatus: string;
  verificationNote: string | null;
  documents: Document[];
};

const DOC_TYPE_LABELS: Record<string, string> = {
  diplome: "Diplôme",
  carte_cnom: "Carte CNOM",
  cin: "CIN/Passeport",
  autre: "Autre",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "documents_submitted") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
        <Clock className="w-3 h-3" />
        Documents soumis
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
      <AlertCircle className="w-3 h-3" />
      En attente
    </span>
  );
}

function RejectModal({
  doctorName,
  onConfirm,
  onCancel,
}: {
  doctorName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Refuser les documents</h2>
        <p className="text-sm text-slate-600">
          Vous allez refuser les documents de <strong>{doctorName}</strong>. Le médecin
          recevra un email avec la raison.
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Raison du refus <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex: Le diplôme est illisible. Veuillez soumettre une photo plus claire."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
}

function DoctorCard({ doctor }: { doctor: DoctorRow }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(
    doctor.verificationStatus === "documents_submitted"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleApprove() {
    if (!confirm(`Approuver le compte de ${doctor.name} ?`)) return;
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/admin/doctors/${doctor.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });

    setBusy(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erreur lors de l'approbation");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function handleReject(reason: string) {
    setShowRejectModal(false);
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/admin/doctors/${doctor.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reason }),
    });

    setBusy(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erreur lors du refus");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/admin/medecins/${doctor.id}`}
              className="font-semibold text-slate-900 hover:text-teal-700 transition-colors"
            >
              {doctor.name}
            </Link>
            <StatusBadge status={doctor.verificationStatus} />
          </div>
          <div className="text-sm text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>{doctor.email}</span>
            {doctor.phone && <span>{doctor.phone}</span>}
            <span className="capitalize">{doctor.specialty}</span>
            <span className="capitalize">{doctor.city}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Inscrit le {new Date(doctor.createdAt).toLocaleDateString("fr-FR")}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/admin/medecins/${doctor.id}`}
            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
            title="Voir le profil complet"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title={expanded ? "Réduire" : "Voir les documents"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-red-400">
            ✕
          </button>
        </div>
      )}

      {/* Documents section */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Documents soumis ({doctor.documents.length})
          </p>

          {doctor.documents.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Aucun document téléversé pour le moment.
            </p>
          ) : (
            <div className="grid gap-2">
              {doctor.documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 rounded-lg transition-colors group"
                >
                  <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 group-hover:text-teal-700 truncate">
                      {doc.fileName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {DOC_TYPE_LABELS[doc.type] ?? doc.type} —{" "}
                      {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-3 justify-end bg-slate-50/50">
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={busy || isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Refuser
        </button>
        <button
          onClick={handleApprove}
          disabled={busy || isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approuver
        </button>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <RejectModal
          doctorName={doctor.name}
          onConfirm={handleReject}
          onCancel={() => setShowRejectModal(false)}
        />
      )}
    </div>
  );
}

export function ValidationTable({ doctors }: { doctors: DoctorRow[] }) {
  return (
    <div className="space-y-4">
      {doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} />
      ))}
    </div>
  );
}
