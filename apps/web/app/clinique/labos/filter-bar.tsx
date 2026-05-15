"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useTranslations } from "next-intl";

type Doctor = { id: string; name: string };

const STATUSES = ["all", "pending", "collected", "completed", "cancelled"] as const;
const URGENCIES = ["all", "routine", "urgent"] as const;

export function LabOrdersFilterBar({ doctors }: { doctors: Doctor[] }) {
  const t = useTranslations("clinique.labos");
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "all";
  const currentUrgency = searchParams.get("urgency") ?? "all";
  const currentDoctor = searchParams.get("doctorId") ?? "";
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";

  const push = useCallback(
    (patch: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) {
          params.set(k, v);
        } else {
          params.delete(k);
        }
      }
      router.push(`/clinique/labos?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Doctor select */}
      <div className="flex flex-col gap-1 min-w-40">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t("filterDoctor")}
        </label>
        <select
          value={currentDoctor}
          onChange={(e) => push({ doctorId: e.target.value })}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t("filterAll")}</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status chips */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t("filterStatus")}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => push({ status: s === "all" ? "" : s })}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                currentStatus === s || (s === "all" && !searchParams.get("status"))
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-white dark:bg-gray-900",
              ].join(" ")}
            >
              {s === "all" ? t("filterAll") : t(`status.${s}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Urgency chips */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t("filterUrgency")}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {URGENCIES.map((u) => (
            <button
              key={u}
              onClick={() => push({ urgency: u === "all" ? "" : u })}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                currentUrgency === u || (u === "all" && !searchParams.get("urgency"))
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-white dark:bg-gray-900",
              ].join(" ")}
            >
              {u === "all" ? t("filterAll") : t(`urgency.${u}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Date
        </label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={currentFrom}
            onChange={(e) => push({ from: e.target.value })}
            className="border border-border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-muted-foreground text-xs">→</span>
          <input
            type="date"
            value={currentTo}
            onChange={(e) => push({ to: e.target.value })}
            className="border border-border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
}
