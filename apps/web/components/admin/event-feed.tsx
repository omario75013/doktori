"use client";

import useSWR from "swr";
import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  Shield,
  Activity,
} from "lucide-react";
import { EventDrawer, type AuditEvent } from "./event-drawer";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function actionMeta(action: string) {
  if (action.endsWith(".activate") || action.endsWith(".approve"))
    return { icon: CheckCircle2, color: "text-green-600 bg-green-50" };
  if (action.endsWith(".deactivate") || action.endsWith(".reject"))
    return { icon: XCircle, color: "text-amber-600 bg-amber-50" };
  if (action.endsWith(".delete"))
    return { icon: Trash2, color: "text-red-600 bg-red-50" };
  if (action.endsWith(".update"))
    return { icon: Edit, color: "text-blue-600 bg-blue-50" };
  return { icon: Activity, color: "text-slate-600 bg-slate-100" };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `il y a ${Math.floor(diff)}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function EventFeed() {
  const { data, isLoading } = useSWR<{ events: AuditEvent[] }>(
    "/api/admin/events?limit=50",
    fetcher,
    { refreshInterval: 4000 }
  );
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const events = data?.events ?? [];

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[640px]">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              Flux d&apos;événements
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {events.length} récents
          </span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoading && (
            <div className="p-6 text-center text-sm text-slate-400">
              Chargement…
            </div>
          )}
          {!isLoading && events.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-400">
              Aucune activité admin pour le moment
            </div>
          )}
          {events.map((e) => {
            const meta = actionMeta(e.action);
            const Icon = meta.icon;
            return (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 items-start"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {e.action}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {e.actorEmail} · {e.resourceType}
                    {e.resourceId ? `/${e.resourceId.slice(0, 8)}` : ""}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                  {formatTime(e.createdAt)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <EventDrawer event={selected} onClose={() => setSelected(null)} />
    </>
  );
}
