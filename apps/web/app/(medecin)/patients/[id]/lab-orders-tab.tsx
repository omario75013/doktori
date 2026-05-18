"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FlaskConical,
  Plus,
  X as XIcon,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

type LabOrder = {
  id: string;
  patientId: string;
  labId: string | null;
  labName: string | null;
  tests: { code: string; label: string }[];
  instructions: string | null;
  urgency: string;
  status: string;
  accessToken: string;
  completedAt: string | null;
  createdAt: string;
};

type Lab = {
  id: string;
  name: string;
  city: string;
  services: string[];
  kind?: string;
  clinicId?: string | null;
};

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium">
        <CheckCircle2 className="h-3 w-3" />
        {t("statusCompleted")}
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
        <XCircle className="h-3 w-3" />
        {t("statusCancelled")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 font-medium">
      <Clock className="h-3 w-3" />
      {t("statusPending")}
    </span>
  );
}

export function LabOrdersSection({ patientId }: { patientId: string }) {
  const t = useTranslations("medecin.patients.labOrders");
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/doctor/lab-orders?patientId=${patientId}`);
      if (r.ok) {
        const data = await r.json() as { orders: LabOrder[] };
        setOrders(data.orders);
      }
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCancel(id: string) {
    if (!confirm(t("cancel") + " ?")) return;
    setCancellingId(id);
    try {
      const r = await fetch(`/api/doctor/lab-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!r.ok) throw new Error();
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)),
      );
    } catch {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-white overflow-hidden ring-1 ring-cyan-100 border-cyan-200">
      <div className="px-4 py-2.5 border-b bg-cyan-50 border-cyan-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-cyan-600 bg-cyan-100">
            <FlaskConical className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold text-foreground">{t("tabTitle")}</h2>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("newOrder")}
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="h-5 w-5 mx-auto animate-spin text-gray-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-400">{t("empty")}</div>
      ) : (
        <ul className="divide-y divide-border">
          {orders.map((order) => (
            <li key={order.id} className="p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {order.tests.map((t) => t.label).join(", ")}
                  </span>
                  {order.urgency === "urgent" && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {t("urgencyUrgent")}
                    </span>
                  )}
                </div>
                {order.labName && (
                  <div className="text-xs text-gray-500 mt-0.5">{order.labName}</div>
                )}
                {!order.labName && (
                  <div className="text-xs text-gray-400 mt-0.5 italic">{t("anyLab")}</div>
                )}
                <div className="text-xs text-gray-400 mt-0.5">
                  {format(new Date(order.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
                </div>
                {order.instructions && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {order.instructions}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={order.status} t={t} />
                {order.status === "pending" && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {cancellingId === order.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      t("cancel")
                    )}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <NewOrderModal
          patientId={patientId}
          onClose={() => setModalOpen(false)}
          onCreated={(order) => {
            setOrders((prev) => [order, ...prev]);
            setModalOpen(false);
            toast.success(t("newOrder") + " ✓");
          }}
        />
      )}
    </div>
  );
}

function NewOrderModal({
  patientId,
  onClose,
  onCreated,
}: {
  patientId: string;
  onClose: () => void;
  onCreated: (order: LabOrder) => void;
}) {
  const t = useTranslations("medecin.patients.labOrders");
  const [inHouseLabs, setInHouseLabs] = useState<Lab[]>([]);
  const [externalLabs, setExternalLabs] = useState<Lab[]>([]);
  const [labId, setLabId] = useState<string>("");
  const [testsRaw, setTestsRaw] = useState("");
  const [instructions, setInstructions] = useState("");
  const [urgency, setUrgency] = useState<"routine" | "urgent">("routine");
  const [saving, setSaving] = useState(false);

  // Lazy-load labs list with in-house priority.
  useEffect(() => {
    fetch("/api/labs/list?segment=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { inHouse?: Lab[]; external?: Lab[]; labs?: Lab[] } | null) => {
        if (!data) return;
        if (data.inHouse !== undefined || data.external !== undefined) {
          setInHouseLabs(data.inHouse ?? []);
          setExternalLabs(data.external ?? []);
        } else if (data.labs) {
          setExternalLabs(data.labs);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const tests = testsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label, i) => ({ code: `t${i + 1}`, label }));

    if (tests.length === 0) {
      toast.error(t("tests") + " requis");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/doctor/lab-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          labId: labId || null,
          tests,
          instructions: instructions.trim() || null,
          urgency,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Erreur");
      }
      const data = await res.json() as { order: LabOrder };
      onCreated(data.order);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            {t("newOrder")}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-gray-500"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Lab selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">
              {t("selectLab")}
            </label>
            <select
              value={labId}
              onChange={(e) => setLabId(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("anyLab")}</option>
              {inHouseLabs.length > 0 && (
                <optgroup label="— Labos de la clinique —">
                  {inHouseLabs.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name} — {lab.city}
                    </option>
                  ))}
                </optgroup>
              )}
              {externalLabs.length > 0 && (
                <optgroup label={inHouseLabs.length > 0 ? "— Labos externes —" : ""}>
                  {externalLabs.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name} — {lab.city}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Tests */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">
              {t("tests")} *
            </label>
            <input
              type="text"
              value={testsRaw}
              onChange={(e) => setTestsRaw(e.target.value)}
              placeholder={t("testsPlaceholder")}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-400">Séparez les analyses par des virgules</p>
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">
              {t("instructions")}
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Urgency */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">
              {t("urgency")}
            </label>
            <div className="flex gap-4">
              {(["routine", "urgent"] as const).map((u) => (
                <label key={u} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="urgency"
                    value={u}
                    checked={urgency === u}
                    onChange={() => setUrgency(u)}
                    className="h-4 w-4 text-primary"
                  />
                  {u === "routine" ? t("urgencyRoutine") : t("urgencyUrgent")}
                </label>
              ))}
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !testsRaw.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
