"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Award,
  Plus,
  X as XIcon,
  Trash2,
  Printer,
  FileDown,
  ExternalLink,
  Loader2,
  Share2,
} from "lucide-react";
import { QuillEditor } from "../../modeles/components/quill-editor";
import { TemplateLookup } from "../../modeles/components/template-lookup";

// Self-contained doctor-side UI for medical certificates. Kept in its
// own file so the (already huge) patient-detail page only has to
// render <CertificatesSection patientId={id} /> behind the tab.

export type Certificate = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  appointmentId: string | null;
  verificationToken: string | null;
  sharedWithDoctorIds: string[];
};

type Codoctor = { id: string; name: string; specialty: string | null };

type CompletedAppt = { id: string; startsAt: string; reason?: string | null };

export function CertificatesSection({
  patientId,
  patientName,
  completedAppointments,
}: {
  patientId: string;
  patientName: string;
  completedAppointments: CompletedAppt[];
}) {
  const t = useTranslations("medecin.patientDetail");
  const [items, setItems] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Share popover state
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [codoctors, setCodoctors] = useState<Codoctor[]>([]);
  const [codoctorsLoaded, setCodoctorsLoaded] = useState(false);
  const [shareSelection, setShareSelection] = useState<string[]>([]);
  const [savingShare, setSavingShare] = useState(false);

  async function openSharePopover(certId: string, alreadyShared: string[]) {
    setShareOpenId(certId);
    setShareSelection(alreadyShared);
    if (!codoctorsLoaded) {
      try {
        const r = await fetch(`/api/patients/${patientId}/co-doctors`);
        if (r.ok) setCodoctors(await r.json());
      } finally {
        setCodoctorsLoaded(true);
      }
    }
  }

  async function saveShare(certId: string) {
    setSavingShare(true);
    try {
      const r = await fetch(`/api/medical-certificates/${certId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorIds: shareSelection }),
      });
      if (r.ok) {
        const data = await r.json() as { sharedWithDoctorIds: string[] };
        setItems((prev) =>
          prev.map((c) =>
            c.id === certId ? { ...c, sharedWithDoctorIds: data.sharedWithDoctorIds } : c,
          ),
        );
        setShareOpenId(null);
        toast.success("Partage mis à jour");
      } else {
        const data = await r.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Échec du partage");
      }
    } finally {
      setSavingShare(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/medical-certificates?patientId=${patientId}`);
      if (r.ok) setItems(await r.json());
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm(t("certDeleteConfirm"))) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/medical-certificates/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success(t("certDeleted"));
    } catch {
      toast.error(t("certDeleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="ds-card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            {t("cardCertificates")}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{t("certSubtitle")}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-3 py-2 text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("newCertificateButton")}
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-gray-400">
          <Loader2 className="h-5 w-5 mx-auto animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-400">{t("noCertificates")}</div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((c) => (
            <li key={c.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">
                  <Award className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {c.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(c.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/certificat-medical/${c.id}`}
                    target="_blank"
                    rel="noopener"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-secondary text-gray-500"
                    title={t("certView")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <a
                    href={`/certificat-medical/${c.id}?print=1`}
                    target="_blank"
                    rel="noopener"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-secondary text-gray-500"
                    title={t("certPrint")}
                  >
                    <Printer className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => openSharePopover(c.id, c.sharedWithDoctorIds ?? [])}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-secondary text-gray-500"
                    title="Partager avec un autre médecin"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-50"
                    title={t("certDelete")}
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {/* Share popover */}
              {shareOpenId === c.id && (
                <div className="mt-2 ml-12 rounded-xl border border-border bg-white shadow-md p-4 space-y-3 max-w-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Partager avec…</p>
                    <button type="button" onClick={() => setShareOpenId(null)} className="text-gray-400 hover:text-gray-600">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                  {codoctors.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucun autre médecin n&apos;a suivi ce patient.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {codoctors.map((d) => (
                        <li key={d.id}>
                          <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={shareSelection.includes(d.id)}
                              onChange={(e) =>
                                setShareSelection((prev) =>
                                  e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id),
                                )
                              }
                            />
                            <span className="font-medium">{d.name}</span>
                            {d.specialty && <span className="text-gray-400">· {d.specialty}</span>}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    disabled={savingShare || codoctors.length === 0}
                    onClick={() => saveShare(c.id)}
                    className="w-full rounded-lg bg-primary text-white text-xs font-medium py-2 hover:opacity-90 disabled:opacity-50"
                  >
                    {savingShare ? "…" : "Enregistrer"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <CertificateModal
          patientId={patientId}
          patientName={patientName}
          completedAppointments={completedAppointments}
          onClose={() => setModalOpen(false)}
          onCreated={(c) => {
            setItems((prev) => [c, ...prev]);
            setModalOpen(false);
            toast.success(t("certCreated"));
            // Open the printable view right after creation so the
            // doctor can hand it to the patient without an extra step.
            window.open(`/certificat-medical/${c.id}?print=1`, "_blank");
          }}
        />
      )}
    </div>
  );
}

function CertificateModal({
  patientId,
  patientName,
  completedAppointments,
  onClose,
  onCreated,
}: {
  patientId: string;
  patientName: string;
  completedAppointments: CompletedAppt[];
  onClose: () => void;
  onCreated: (c: Certificate) => void;
}) {
  const t = useTranslations("medecin.patientDetail");
  const tCommon = useTranslations("medecin.common");
  const [appointmentId, setAppointmentId] = useState(
    completedAppointments[0]?.id ?? "",
  );
  const [withoutAppointment, setWithoutAppointment] = useState(
    completedAppointments.length === 0,
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [usedTemplateId, setUsedTemplateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error(t("certTitleTooShort"));
      return;
    }
    if (content.trim().length < 3) {
      toast.error(t("certContentTooShort"));
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
      };
      if (withoutAppointment) body.patientId = patientId;
      else body.appointmentId = appointmentId;
      if (usedTemplateId && usedTemplateId !== "__blank__")
        body.templateId = usedTemplateId;
      const res = await fetch("/api/medical-certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erreur");
      }
      const created = (await res.json()) as Certificate;
      onCreated(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border bg-white px-5 py-4 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {t("newCertModalTitle")}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-gray-500"
            aria-label={tCommon("close")}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 overflow-y-auto flex-1"
        >
          <p className="text-xs text-gray-500">
            {t("certForPatient", { name: patientName })}
          </p>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={withoutAppointment}
              onChange={(e) => setWithoutAppointment(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            {t("withoutAppointment")}
          </label>

          {!withoutAppointment && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 block">
                {t("fieldAppointment")}
              </label>
              {completedAppointments.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  {t("noCompletedAppts")}
                </p>
              ) : (
                <select
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {completedAppointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {format(new Date(a.startsAt), "d MMM yyyy HH:mm", {
                        locale: fr,
                      })}
                      {a.reason ? ` — ${a.reason}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">
              {t("certFieldTitle")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("certTitlePlaceholder")}
              maxLength={160}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">
              {t("certFieldContent")}
            </label>
            <TemplateLookup
              patientId={patientId}
              appointmentId={appointmentId || undefined}
              targetType="certificat_medical"
              onPick={(rendered, templateId) => {
                if (templateId === "__blank__") {
                  setContent("");
                } else {
                  setContent((prev) =>
                    prev.trim() ? prev + rendered : rendered,
                  );
                  // Pre-fill title from the picked template label if
                  // the doctor hasn't typed one yet.
                  if (!title.trim()) {
                    fetch("/api/medecin/templates?targetType=certificat_medical")
                      .then((r) => (r.ok ? r.json() : null))
                      .then((rows) => {
                        if (Array.isArray(rows)) {
                          const tpl = rows.find(
                            (x: { id: string; title: string }) => x.id === templateId,
                          );
                          if (tpl?.title) setTitle(tpl.title);
                        }
                      })
                      .catch(() => {});
                  }
                }
                setUsedTemplateId(templateId);
              }}
            />
            <QuillEditor
              value={content}
              onChange={setContent}
              placeholder={t("certContentPlaceholder")}
              minHeight="240px"
            />
            {usedTemplateId && usedTemplateId !== "__blank__" && (
              <p className="text-xs text-primary">{t("templateApplied")}</p>
            )}
          </div>
        </form>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              saving ||
              title.trim().length < 3 ||
              content.trim().length < 3 ||
              (!withoutAppointment && completedAppointments.length === 0)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {saving ? tCommon("saving") : t("saveCertificate")}
          </button>
        </div>
      </div>
    </div>
  );
}
