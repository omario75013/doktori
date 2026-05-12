"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { INSURANCES } from "@doktori/shared";
import { Shield, Loader2, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";

export default function ConventionsPage() {
  const t = useTranslations("medecin.conventions");
  const locale = useLocale();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/doctors/me/insurance")
      .then((r) => r.json())
      .then((data: { insuranceType: string }[]) => {
        const set = new Set(data.map((d) => d.insuranceType));
        setSelected(set);
        setInitial(new Set(set));
        setLoading(false);
      });
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === INSURANCES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(INSURANCES.map((i) => i.id)));
    }
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/doctors/me/insurance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ insuranceTypes: Array.from(selected) }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(new Date());
      setInitial(new Set(selected));
      toast.success(t("saveSuccess"));
    } else {
      toast.error(t("saveError"));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 text-primary">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">{t("loading")}</span>
      </div>
    );
  }

  // Dirty = current selection differs from what's persisted.
  const dirty =
    selected.size !== initial.size ||
    [...selected].some((id) => !initial.has(id));

  const q = query.trim().toLowerCase();
  const visible = q
    ? INSURANCES.filter(
        (ins) =>
          ins.label.toLowerCase().includes(q) ||
          ins.labelAr.toLowerCase().includes(q),
      )
    : INSURANCES;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{t("pageTitle")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("pageSubtitle")}
          </p>
        </div>
        <div
          className="text-right text-xs text-gray-500"
          style={{ direction: locale === "ar" ? "rtl" : "ltr" }}
        >
          <div className="text-2xl font-bold text-primary leading-none">
            {selected.size}
            <span className="text-gray-400 font-normal">
              /{INSURANCES.length}
            </span>
          </div>
          <div className="mt-0.5">{t("selectedCount")}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full h-10 rounded-xl border border-border bg-white dark:bg-gray-900 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {selected.size === INSURANCES.length
            ? t("clearAll")
            : t("selectAll")}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="ds-card p-10 text-center text-sm text-gray-500">
          {t("noMatch")}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visible.map((ins) => {
            const checked = selected.has(ins.id);
            return (
              <button
                key={ins.id}
                type="button"
                onClick={() => toggle(ins.id)}
                className={`relative text-start rounded-2xl border bg-white dark:bg-gray-900 p-4 transition shadow-sm ${
                  checked
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div
                  className={`absolute top-3 end-3 h-6 w-6 rounded-full flex items-center justify-center transition ${
                    checked
                      ? "bg-primary text-white"
                      : "bg-secondary text-gray-300"
                  }`}
                  aria-hidden
                >
                  {checked && <Check className="h-3.5 w-3.5" />}
                </div>
                <div
                  className={`inline-flex items-center justify-center h-10 w-10 rounded-xl mb-3 text-[11px] font-bold tracking-wide ${
                    checked
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-gray-600"
                  }`}
                  aria-hidden
                >
                  {ins.label.slice(0, 4).toUpperCase()}
                </div>
                <div className="font-semibold text-[14px] text-foreground leading-tight">
                  {ins.label}
                </div>
                <div className="text-[11.5px] text-gray-500 mt-0.5 truncate">
                  {ins.labelAr}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-md px-4 py-3">
        <div className="text-xs text-gray-500">
          {dirty ? (
            <span className="text-amber-600 font-semibold">
              {t("unsavedChanges")}
            </span>
          ) : savedAt ? (
            <span className="text-primary font-medium">
              {t("savedAt", {
                time: savedAt.toLocaleTimeString(locale === "ar" ? "ar-TN" : "fr-TN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </span>
          ) : (
            t("noChanges")
          )}
        </div>
        <Button
          onClick={save}
          disabled={saving || !dirty}
          className="bg-primary hover:bg-doktori-teal-dark h-10 rounded-xl font-bold text-white px-5 disabled:opacity-50"
        >
          {saving ? t("savingButton") : t("saveButton")}
        </Button>
      </div>
    </div>
  );
}
