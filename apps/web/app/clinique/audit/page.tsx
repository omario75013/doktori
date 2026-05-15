"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList, Download, ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AuditRow {
  id: string;
  actorType: string;
  actorId: string | null;
  actorLabel: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ── Action options shown in the filter dropdown ───────────────────────────────

const ACTION_OPTIONS = [
  "doctor.invite",
  "doctor.remove",
  "note.create",
  "note.update",
  "note.delete",
  "rdv.update",
  "rdv.status_change",
  "room.assign",
  "sms.bulk_send",
  "site.create",
  "site.update",
  "site.delete",
  "room.create",
  "room.update",
  "room.delete",
];

const ACTOR_OPTIONS = ["clinic", "doctor", "secretary", "admin"];

// Static FR labels for action keys — avoids next-intl dot-path traversal issue
const ACTION_LABELS_FR: Record<string, string> = {
  "doctor.invite": "Invitation médecin",
  "doctor.remove": "Retrait médecin",
  "note.create": "Note créée",
  "note.update": "Note modifiée",
  "note.delete": "Note supprimée",
  "rdv.update": "RDV modifié",
  "rdv.status_change": "Statut RDV changé",
  "room.assign": "Salle assignée",
  "sms.bulk_send": "SMS groupé envoyé",
  "site.create": "Site créé",
  "site.update": "Site modifié",
  "site.delete": "Site supprimé",
  "room.create": "Salle créée",
  "room.update": "Salle modifiée",
  "room.delete": "Salle supprimée",
};

function actionLabel(action: string): string {
  return ACTION_LABELS_FR[action] ?? action;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByDay(rows: AuditRow[]): { day: string; rows: AuditRow[] }[] {
  const map = new Map<string, AuditRow[]>();
  for (const row of rows) {
    const day = new Date(row.createdAt).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(row);
  }
  return Array.from(map.entries()).map(([day, rows]) => ({ day, rows }));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Row item ──────────────────────────────────────────────────────────────────

function AuditRowItem({ row }: { row: AuditRow }) {
  const t = useTranslations("clinique.audit");
  const [expanded, setExpanded] = useState(false);

  const label = actionLabel(row.action);
  const hasMetadata = row.metadata && Object.keys(row.metadata).length > 0;

  return (
    <div className="border-l-2 border-teal-200 pl-4 py-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-semibold text-gray-800">{row.actorLabel}</span>
            <span className="text-gray-500">·</span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: "#CCFBF1", color: "#0F766E" }}
            >
              {label}
            </span>
            {row.targetType && (
              <>
                <span className="text-gray-400 text-xs">{row.targetType}</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {capitalize(
              formatDistanceToNow(new Date(row.createdAt), {
                addSuffix: true,
                locale: fr,
              }),
            )}
          </p>
        </div>
        {hasMetadata && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 shrink-0 mt-0.5"
          >
            {t("metadataLabel")}
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
      {expanded && hasMetadata && (
        <pre className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 overflow-auto max-h-48">
          {JSON.stringify(row.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const t = useTranslations("clinique.audit");

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [action, setAction] = useState("");
  const [actorType, setActorType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const buildUrl = useCallback(
    (format?: string) => {
      const params = new URLSearchParams();
      if (action) params.set("action", action);
      if (actorType) params.set("actorType", actorType);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        params.set("to", d.toISOString());
      }
      if (format) params.set("format", format);
      return `/api/clinique/audit?${params.toString()}`;
    },
    [action, actorType, from, to],
  );

  const fetchRows = useCallback(() => {
    setLoading(true);
    fetch(buildUrl())
      .then((r) => r.json() as Promise<{ rows: AuditRow[] }>)
      .then((d) => setRows(d.rows ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [buildUrl]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const grouped = groupByDay(rows);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-600" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
        </div>
        <a
          href={buildUrl("csv")}
          download="audit-clinique.csv"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ background: "#0891B2" }}
        >
          <Download className="h-4 w-4" />
          {t("exportCsv")}
        </a>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action filter */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t("filterAction")}
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">{t("filterAll")}</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {actionLabel(a)}
                </option>
              ))}
            </select>
          </div>

          {/* Actor type filter */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t("filterActor")}
            </label>
            <select
              value={actorType}
              onChange={(e) => setActorType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">{t("filterAll")}</option>
              <option value="clinic">{t("actorClinic")}</option>
              <option value="doctor">{t("actorDoctor")}</option>
              <option value="secretary">{t("actorSecretary")}</option>
              <option value="admin">{t("actorAdmin")}</option>
            </select>
          </div>

          {/* Date from */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Depuis</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Date to */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Jusqu'au</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("empty")}
          </p>
        ) : (
          grouped.map(({ day, rows: dayRows }) => (
            <div key={day} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {day}
              </h3>
              <div className="space-y-3">
                {dayRows.map((row) => (
                  <AuditRowItem key={row.id} row={row} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
