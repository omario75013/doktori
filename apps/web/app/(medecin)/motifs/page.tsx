"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Stethoscope, Plus, Loader2, Building2, Pencil, X as XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface AppointmentType {
  id: string;
  name: string;
  durationMinutes: number;
  fee: number | null;
  color: string;
  mode: string;
  isActive: boolean;
  practiceIds: string[];
}

interface Practice {
  id: string;
  name: string;
  city: string;
  kind: "cabinet" | "clinic";
  isPrimary: boolean;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  duration?: string;
  practices?: string;
}

export default function MotifsPage() {
  const t = useTranslations("medecin.motifs");
  const tCommon = useTranslations("medecin.common");

  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("20");
  const [fee, setFee] = useState("");
  const [mode, setMode] = useState<"cabinet" | "teleconsult">("cabinet");
  const [selectedPractices, setSelectedPractices] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPractices, setEditingPractices] = useState<Set<string>>(new Set());
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingMotif, setEditingMotif] = useState<AppointmentType | null>(null);

  async function refresh() {
    const [typesRes, practicesRes] = await Promise.all([
      fetch("/api/appointment-types"),
      fetch("/api/doctor/practices"),
    ]);
    const typesData: AppointmentType[] = await typesRes.json();
    const practicesData: Practice[] = await practicesRes.json();
    setTypes(typesData.filter((item) => item.isActive));
    const active = practicesData.filter((p) => p.isActive);
    setPractices(active);
    if (selectedPractices.size === 0 && active.length > 0) {
      const primary = active.find((p) => p.isPrimary) ?? active[0];
      setSelectedPractices(new Set([primary.id]));
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function togglePractice(setFn: typeof setSelectedPractices, id: string) {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function validate(): boolean {
    const errors: FormErrors = {};
    if (!name.trim()) errors.name = t("nameRequired");
    const dur = Number(duration);
    if (!duration || isNaN(dur) || dur < 5 || dur > 120) {
      errors.duration = t("durationRangeError");
    }
    if (selectedPractices.size === 0 && mode !== "teleconsult") {
      errors.practices = t("selectCabinet");
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (practices.length === 0) {
      toast.error(t("addCabinetFirst"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/appointment-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          durationMinutes: Number(duration),
          fee: fee ? Number(fee) : undefined,
          mode,
          practiceIds: Array.from(selectedPractices),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? t("creationError"));
        return;
      }
      toast.success(t("addedSuccess", { name: name.trim() }));
      setName("");
      setDuration("20");
      setFee("");
      setFormErrors({});
      await refresh();
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, motifName: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/appointment-types/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error(t("deletionError"));
        return;
      }
      toast.success(t("deletedSuccess", { name: motifName }));
      await refresh();
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  }

  async function savePractices() {
    if (!editingId) return;
    if (editingPractices.size === 0) {
      toast.error(t("selectCabinet"));
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/appointment-types/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceIds: Array.from(editingPractices) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? t("updateFailed"));
        return;
      }
      toast.success(t("cabinetsUpdated"));
      setEditingId(null);
      await refresh();
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-primary text-sm p-6">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{t("loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("pageTitle")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("pageSubtitle")}
          </p>
        </div>
      </div>

      {practices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center max-w-xl">
          <Building2 className="h-10 w-10 text-primary mx-auto" />
          <p className="mt-3 text-foreground font-semibold">{t("noCabinets")}</p>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
            {t("noCabinetsDesc")}
          </p>
          <Link
            href="/cabinets"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t("manageCabinets")}
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 p-6 shadow-sm max-w-xl">
          <h2 className="font-semibold text-foreground mb-4">{t("addMotif")}</h2>
          <form onSubmit={handleCreate} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="name" className="text-foreground font-medium">
                {t("nameLabel")}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder={t("namePlaceholder")}
                className={`h-12 rounded-xl border-border focus-visible:ring-primary mt-1 ${
                  formErrors.name ? "border-red-400 focus-visible:ring-red-400" : ""
                }`}
              />
              {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="duration" className="text-foreground font-medium">
                  {t("durationLabel")}
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={120}
                  value={duration}
                  onChange={(e) => {
                    setDuration(e.target.value);
                    if (formErrors.duration) {
                      setFormErrors((prev) => ({ ...prev, duration: undefined }));
                    }
                  }}
                  className={`h-12 rounded-xl border-border focus-visible:ring-primary mt-1 ${
                    formErrors.duration ? "border-red-400 focus-visible:ring-red-400" : ""
                  }`}
                />
                {formErrors.duration && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.duration}</p>
                )}
              </div>
              <div>
                <Label htmlFor="fee" className="text-foreground font-medium">
                  {t("feeLabel")}
                </Label>
                <Input
                  id="fee"
                  type="number"
                  min={0}
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="optionnel"
                  className="h-12 rounded-xl border-border focus-visible:ring-primary mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-foreground font-medium">{t("typeLabel")}</Label>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("cabinet")}
                  className={`rounded-xl px-3 py-2 text-sm font-medium ${
                    mode === "cabinet"
                      ? "bg-primary text-white"
                      : "border border-border bg-white text-foreground hover:bg-secondary"
                  }`}
                >
                  {t("typeCabinet")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("teleconsult")}
                  className={`rounded-xl px-3 py-2 text-sm font-medium ${
                    mode === "teleconsult"
                      ? "bg-primary text-white"
                      : "border border-border bg-white text-foreground hover:bg-secondary"
                  }`}
                >
                  {t("typeTeleconsult")}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-foreground font-medium">{t("cabinetsOffered")}</Label>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">
                {t("cabinetsNote")}
              </p>
              <div className="space-y-2">
                {practices.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 cursor-pointer hover:bg-secondary"
                  >
                    <Checkbox
                      checked={selectedPractices.has(p.id)}
                      onCheckedChange={() => togglePractice(setSelectedPractices, p.id)}
                    />
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="text-xs text-gray-500">· {p.city}</span>
                    {p.kind === "clinic" && (
                      <span className="text-[10px] rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5">
                        Clinique
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {formErrors.practices && (
                <p className="text-xs text-red-600 mt-1">{formErrors.practices}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-doktori-teal-dark h-12 rounded-xl font-bold text-white flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("adding")}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {tCommon("add")}
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-sm max-w-xl">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{t("activeMotifs")}</h2>
          <span className="text-xs text-primary font-semibold bg-secondary px-2.5 py-1 rounded-full">
            {types.length}
          </span>
        </div>
        {types.length === 0 ? (
          <div className="p-10 text-center">
            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <p className="text-foreground font-medium mb-1">{t("noMotifs")}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t("noMotifsDes")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {types.map((motifType) => {
              const motifPractices = practices.filter((p) => motifType.practiceIds.includes(p.id));
              const isEditing = editingId === motifType.id;
              return (
                <div key={motifType.id} className="p-4 space-y-2 hover:bg-secondary transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{motifType.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {motifType.durationMinutes} min
                        {motifType.fee ? ` · ${motifType.fee / 1000} DT` : ""}
                        {motifType.mode === "teleconsult" && ` · ${t("typeTeleconsult")}`}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {motifPractices.length === 0 ? (
                          <span className="text-[11px] text-red-600 italic">
                            {t("noCabinetAttached")}
                          </span>
                        ) : (
                          motifPractices.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 text-[11px] rounded-full bg-secondary px-2 py-0.5 text-foreground"
                            >
                              <Building2 className="h-3 w-3" />
                              {p.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingMotif(motifType)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:bg-border border border-border rounded-xl px-3 py-1.5"
                      >
                        <Pencil className="h-3 w-3" />
                        {tCommon("edit")}
                      </button>
                      <button
                        onClick={() => {
                          if (isEditing) {
                            setEditingId(null);
                          } else {
                            setEditingId(motifType.id);
                            setEditingPractices(new Set(motifType.practiceIds));
                          }
                        }}
                        className="text-xs font-semibold text-foreground hover:bg-border border border-border rounded-xl px-3 py-1.5"
                      >
                        {isEditing ? "Fermer" : "Cabinets"}
                      </button>
                      <Link
                        href={`/motifs/${motifType.id}/questions`}
                        className="text-xs font-semibold text-primary hover:bg-border border border-border rounded-xl px-3 py-1.5"
                      >
                        {t("questions")}
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingId === motifType.id}
                        onClick={() => handleDelete(motifType.id, motifType.name)}
                        className="border border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-xs"
                      >
                        {deletingId === motifType.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          tCommon("delete")
                        )}
                      </Button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                      <p className="text-xs text-gray-600">{t("selectCabinetsForMotif")}</p>
                      <div className="space-y-1.5">
                        {practices.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={editingPractices.has(p.id)}
                              onCheckedChange={() =>
                                togglePractice(setEditingPractices, p.id)
                              }
                            />
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            <span>{p.name}</span>
                            <span className="text-xs text-gray-500">· {p.city}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-xl border border-border bg-white px-3 py-1 text-xs hover:bg-white"
                        >
                          {tCommon("cancel")}
                        </button>
                        <button
                          onClick={savePractices}
                          disabled={savingEdit}
                          className="rounded-xl bg-primary text-white px-3 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                        >
                          {savingEdit ? "..." : tCommon("save")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingMotif && (
        <EditMotifDialog
          motif={editingMotif}
          practices={practices}
          onClose={() => setEditingMotif(null)}
          onSaved={async () => {
            setEditingMotif(null);
            await refresh();
            toast.success("Motif mis à jour");
          }}
        />
      )}
    </div>
  );
}

function EditMotifDialog({
  motif,
  practices,
  onClose,
  onSaved,
}: {
  motif: AppointmentType;
  practices: Practice[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const t = useTranslations("medecin.motifs");
  const tCommon = useTranslations("medecin.common");

  const [name, setName] = useState(motif.name);
  const [duration, setDuration] = useState(String(motif.durationMinutes));
  const [fee, setFee] = useState(motif.fee ? String(motif.fee / 1000) : "");
  const [mode, setMode] = useState<"cabinet" | "teleconsult">(
    motif.mode === "teleconsult" ? "teleconsult" : "cabinet",
  );
  const [practiceIds, setPracticeIds] = useState<Set<string>>(new Set(motif.practiceIds));
  const [saving, setSaving] = useState(false);

  function togglePractice(id: string) {
    setPracticeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    const dur = Number(duration);
    if (isNaN(dur) || dur < 5 || dur > 120) {
      toast.error(t("durationRangeError"));
      return;
    }
    if (practiceIds.size === 0 && mode !== "teleconsult") {
      toast.error(t("selectCabinet"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/appointment-types/${motif.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          durationMinutes: dur,
          fee: fee ? Number(fee) : null,
          mode,
          practiceIds: Array.from(practiceIds),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? t("updateFailed"));
        return;
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Modifier le motif</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl hover:bg-secondary flex items-center justify-center text-gray-500"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <Label className="text-foreground font-medium">{t("nameLabel")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground font-medium">{t("durationLabel")}</Label>
              <Input
                type="number"
                min={5}
                max={120}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-11 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-foreground font-medium">{t("feeLabel")}</Label>
              <Input
                type="number"
                min={0}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="optionnel"
                className="h-11 rounded-xl mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-foreground font-medium">{t("typeLabel")}</Label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("cabinet")}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${
                  mode === "cabinet"
                    ? "bg-primary text-white"
                    : "border border-border bg-white text-foreground hover:bg-secondary"
                }`}
              >
                {t("typeCabinet")}
              </button>
              <button
                type="button"
                onClick={() => setMode("teleconsult")}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${
                  mode === "teleconsult"
                    ? "bg-primary text-white"
                    : "border border-border bg-white text-foreground hover:bg-secondary"
                }`}
              >
                {t("typeTeleconsult")}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-foreground font-medium">{t("cabinetsOffered")}</Label>
            <div className="mt-2 space-y-2">
              {practices.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 cursor-pointer hover:bg-secondary"
                >
                  <Checkbox
                    checked={practiceIds.has(p.id)}
                    onCheckedChange={() => togglePractice(p.id)}
                  />
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-gray-500">· {p.city}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button
            onClick={onClose}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            {tCommon("cancel")}
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {saving ? tCommon("saving") : tCommon("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
