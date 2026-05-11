"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  FileText,
  Trash2,
  AlertCircle,
  Send,
} from "lucide-react";

type VerificationStatus = "pending" | "documents_submitted" | "approved" | "rejected";

type UploadedDocument = {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
};

type DocumentSlot = {
  type: string;
  label: string;
  required: boolean;
  hint: string;
};

function getDocumentSlots(t: ReturnType<typeof useTranslations<"medecin.verification">>): DocumentSlot[] {
  return [
    { type: "diplome", label: t("diplomaLabel"), required: true, hint: t("diplomaHint") },
    { type: "carte_cnom", label: t("cnomLabel"), required: true, hint: t("cnomHint") },
    { type: "cin", label: t("cinLabel"), required: true, hint: t("cinHint") },
    { type: "autre", label: t("otherLabel"), required: false, hint: t("otherHint") },
  ];
}

function StatusBanner({
  status,
  reason,
  t,
}: {
  status: VerificationStatus;
  reason: string | null;
  t: ReturnType<typeof useTranslations<"medecin.verification">>;
}) {
  if (status === "approved") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl"
      >
        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">{t("approvedTitle")}</p>
          <p className="text-sm text-green-700 mt-0.5">{t("approvedMessage")}</p>
        </div>
      </motion.div>
    );
  }

  if (status === "documents_submitted") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl"
      >
        <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-blue-800">{t("pendingDocsTitle")}</p>
          <p className="text-sm text-blue-700 mt-0.5">{t("pendingDocsMessage")}</p>
        </div>
      </motion.div>
    );
  }

  if (status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
      >
        <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-red-800">{t("rejectedTitle")}</p>
          {reason && (
            <p className="text-sm text-red-700 mt-0.5">
              <span className="font-medium">{t("rejectedReason")}</span> {reason}
            </p>
          )}
          <p className="text-sm text-red-700 mt-1">{t("rejectedResubmit")}</p>
        </div>
      </motion.div>
    );
  }

  // pending
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"
    >
      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-amber-800">{t("waitingTitle")}</p>
        <p className="text-sm text-amber-700 mt-0.5">{t("waitingMessage")}</p>
      </div>
    </motion.div>
  );
}

function DocumentSlotCard({
  slot,
  uploaded,
  onUpload,
  onDelete,
  uploading,
  canEdit,
  t,
}: {
  slot: DocumentSlot;
  uploaded: UploadedDocument | undefined;
  onUpload: (type: string, file: File) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
  uploading: boolean;
  canEdit: boolean;
  t: ReturnType<typeof useTranslations<"medecin.verification">>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(slot.type, file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  return (
    <motion.div
      layout
      className="bg-white border border-slate-200 rounded-xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900">{slot.label}</p>
            {slot.required && (
              <span className="text-xs text-red-500 font-medium">{t("requiredLabel")}</span>
            )}
            {!slot.required && (
              <span className="text-xs text-slate-400">{t("optionalLabel")}</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{slot.hint}</p>
        </div>

        {uploaded ? (
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              {t("uploadedBadge")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        {uploaded ? (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <FileText className="w-4 h-4 text-teal-600 shrink-0" />
            <a
              href={uploaded.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-teal-700 hover:text-teal-900 truncate flex-1 min-w-0"
            >
              {uploaded.fileName}
            </a>
            <span className="text-xs text-slate-400 shrink-0">
              {new Date(uploaded.uploadedAt).toLocaleDateString("fr-FR")}
            </span>
            {canEdit && (
              <button
                onClick={() => onDelete(uploaded.id)}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                title={t("deleteTitle")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : canEdit ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {uploading ? t("uploading") : t("uploadButton")}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3 border border-dashed border-slate-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-500">{t("notProvided")}</span>
          </div>
        )}
      </div>

      {canEdit && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </motion.div>
  );
}

export function VerificationClient({
  verificationStatus,
  verificationNote,
  uploadedDocuments,
}: {
  verificationStatus: string;
  verificationNote: string | null;
  uploadedDocuments: UploadedDocument[];
}) {
  const t = useTranslations("medecin.verification");
  const DOCUMENT_SLOTS = getDocumentSlots(t);
  const router = useRouter();
  const [docs, setDocs] = useState<UploadedDocument[]>(uploadedDocuments);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const status = verificationStatus as VerificationStatus;
  const canEdit = status === "pending" || status === "rejected";

  function getDocForType(type: string): UploadedDocument | undefined {
    // Return the most recently uploaded document of this type
    return [...docs].filter((d) => d.type === type).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];
  }

  async function handleUpload(type: string, file: File) {
    setUploadingType(type);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const res = await fetch("/api/doctor/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t("uploadError"));
        return;
      }

      const data = await res.json();
      setDocs((prev) => [...prev, data.document]);
    } catch {
      setError(t("networkError"));
    } finally {
      setUploadingType(null);
    }
  }

  async function handleDelete(docId: string) {
    setError(null);

    const res = await fetch(`/api/doctor/documents?id=${docId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setError(t("deleteError"));
      return;
    }

    setDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  async function handleSubmit() {
    setSubmitError(null);

    const res = await fetch("/api/doctor/documents/submit", { method: "POST" });

    if (!res.ok) {
      const data = await res.json();
      if (data.missing) {
        setSubmitError(t("missingDocs", { list: (data.missing as string[]).join(", ") }));
      } else {
        setSubmitError(data.error ?? t("submitError"));
      }
      return;
    }

    startTransition(() => router.refresh());
  }

  const requiredSlots = DOCUMENT_SLOTS.filter((s) => s.required);
  const allRequiredUploaded = requiredSlots.every((s) => !!getDocForType(s.type));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-teal-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("pageTitle")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("pageSubtitle")}</p>
        </div>
      </div>

      {/* Status banner */}
      <StatusBanner status={status} reason={verificationNote} t={t} />

      {/* Error alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-400 hover:text-red-700 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          {t("requiredDocsSection")}
        </h2>
        {DOCUMENT_SLOTS.map((slot) => (
          <DocumentSlotCard
            key={slot.type}
            slot={slot}
            uploaded={getDocForType(slot.type)}
            onUpload={handleUpload}
            onDelete={handleDelete}
            uploading={uploadingType === slot.type}
            canEdit={canEdit}
            t={t}
          />
        ))}
      </div>

      {/* Submit section */}
      {canEdit && (
        <div className="space-y-3">
          {submitError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <motion.button
            whileHover={allRequiredUploaded ? { scale: 1.01 } : {}}
            whileTap={allRequiredUploaded ? { scale: 0.99 } : {}}
            onClick={handleSubmit}
            disabled={!allRequiredUploaded || isPending || !!uploadingType}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {isPending ? t("submitting") : t("submitButton")}
          </motion.button>

          {!allRequiredUploaded && (
            <p className="text-center text-xs text-slate-500">
              {t("submitDisabledMessage")}
            </p>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-1">{t("faqTitle")}</p>
        <p>{t("faqTrust")}</p>
        <p className="mt-2">{t("faqTimeline")}</p>
      </div>
    </div>
  );
}
