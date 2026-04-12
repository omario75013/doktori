"use client";

import { X } from "lucide-react";

export type AuditEvent = {
  id: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  createdAt: string;
};

export function EventDrawer({
  event,
  onClose,
}: {
  event: AuditEvent | null;
  onClose: () => void;
}) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative ml-auto w-full max-w-xl h-full bg-white shadow-2xl flex flex-col">
        <div className="p-5 border-b border-slate-200 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {event.resourceType}
              {event.resourceId ? ` / ${event.resourceId}` : ""}
            </p>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {event.action}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {event.actorEmail} ·{" "}
              {new Date(event.createdAt).toLocaleString("fr-FR")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {event.reason && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                Raison
              </h3>
              <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3">
                {event.reason}
              </p>
            </div>
          )}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              Avant
            </h3>
            <pre className="text-xs text-slate-800 bg-slate-50 rounded-lg p-3 overflow-x-auto font-mono">
              {event.before ? JSON.stringify(event.before, null, 2) : "—"}
            </pre>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              Après
            </h3>
            <pre className="text-xs text-slate-800 bg-slate-50 rounded-lg p-3 overflow-x-auto font-mono">
              {event.after ? JSON.stringify(event.after, null, 2) : "—"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
