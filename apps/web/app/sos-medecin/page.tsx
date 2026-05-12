"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SOSRequest {
  id: string;
  symptom_category: string | null;
  description: string | null;
  requested_at: string;
  expires_at: string;
  patient_name: string;
  distance_m: number;
}

interface ActiveSession {
  id: string;
  patient_name: string;
  symptom_category: string | null;
  distance_m: number;
  accepted_at: string;
}

interface HistoryRow {
  id: string;
  status: string;
  symptom_category: string | null;
  requested_at: string;
  patient_name: string;
  fee: number | null;
  rating: number | null;
}

interface Earnings {
  total_fee: number;
  total_commission: number;
  session_count: number;
}

import {
  SOS_STATUS_LABELS,
  SOS_STATUS_COLORS,
  formatDT,
  formatElapsed as timeSince,
} from "@/lib/sos-constants";

const STATUS_LABELS = Object.fromEntries(
  Object.entries(SOS_STATUS_LABELS).map(([k, label]) => [
    k,
    { label, className: SOS_STATUS_COLORS[k] ?? "" },
  ]),
);

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveTimer({ since }: { since: string }) {
  const [display, setDisplay] = useState(timeSince(since));

  useEffect(() => {
    const t = setInterval(() => setDisplay(timeSince(since)), 10000);
    return () => clearInterval(t);
  }, [since]);

  return <span>{display}</span>;
}

import { StarRating } from "@/components/star-rating";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SOSPage() {
  const t = useTranslations("sos.medecin");

  // Settings
  const [sosAvailable, setSosAvailable] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [fee, setFee] = useState(100);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Feed
  const [feed, setFeed] = useState<SOSRequest[]>([]);
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set());

  // Active session
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeFee, setCompleteFee] = useState("");
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Action-level error (accept, complete, cancel)
  const [actionError, setActionError] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);

  // Location watch
  const watchRef = useRef<number | null>(null);
  const lastLocationPut = useRef<number>(0);

  // ── Load settings on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/sos/doctor/settings")
      .then((r) => r.json())
      .then((data) => {
        setSosAvailable(data.sos_available || false);
        setRadiusKm(data.sos_radius_km || 10);
        setFee(data.sos_fee ? data.sos_fee / 1000 : 100);
        if (data.sos_available_from) setAvailableFrom(data.sos_available_from.slice(0, 5));
        if (data.sos_available_to) setAvailableTo(data.sos_available_to.slice(0, 5));
        setAllDay(!data.sos_available_from && !data.sos_available_to);
        setLoading(false);
      });
  }, []);

  // ── Load history on mount ───────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/sos/doctor/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.history) setHistory(data.history);
        if (data.earnings) setEarnings(data.earnings);
      })
      .catch(() => {});
  }, [activeSession]); // Refresh after session state change

  // ── Continuous location watch ───────────────────────────────────────────────
  const stopWatch = useCallback(() => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation || watchRef.current != null) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastLocationPut.current < 30_000) return;
        lastLocationPut.current = now;
        fetch("/api/sos/doctor/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sosAvailable: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  useEffect(() => {
    if (sosAvailable) {
      startWatch();
    } else {
      stopWatch();
    }
    return stopWatch;
  }, [sosAvailable, startWatch, stopWatch]);

  // Stop watch on page unload
  useEffect(() => {
    const handler = () => stopWatch();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stopWatch]);

  // ── Real-time feed ──────────────────────────────────────────────────────────
  const refreshFeed = useCallback(() => {
    fetch("/api/sos/doctor/feed")
      .then((r) => r.json())
      .then((data) => setFeed(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sosAvailable) {
      setFeed([]);
      return;
    }

    refreshFeed();

    const SOCKETIO_URL =
      process.env.NEXT_PUBLIC_SOCKETIO_URL || "http://localhost:3010";
    const socket: Socket = io(SOCKETIO_URL, { path: "/sos-socket" });

    socket.on("connect", () => {
      socket.emit("join-doctor-feed", "all");
    });

    socket.on("new-request", () => refreshFeed());

    socket.on("request-taken", (data: { sessionId: string }) => {
      setFeed((prev) => prev.filter((r) => r.id !== data.sessionId));
    });

    const fallback = setInterval(refreshFeed, 10_000);

    return () => {
      socket.disconnect();
      clearInterval(fallback);
    };
  }, [sosAvailable, refreshFeed]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function toggleSOS() {
    setError("");

    if (sosAvailable) {
      await fetch("/api/sos/doctor/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sosAvailable: false,
          availableFrom: allDay ? null : availableFrom || null,
          availableTo: allDay ? null : availableTo || null,
        }),
      });
      setSosAvailable(false);
      stopWatch();
      return;
    }

    if (!navigator.geolocation) {
      setError(t("settings.geoUnsupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch("/api/sos/doctor/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sosAvailable: true,
            sosRadiusKm: radiusKm,
            sosFee: fee,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            availableFrom: allDay ? null : availableFrom || null,
            availableTo: allDay ? null : availableTo || null,
          }),
        });
        if (res.ok) {
          setSosAvailable(true);
        } else {
          const err = await res.json();
          setError(err.error || t("settings.genericError"));
        }
      },
      () => setError(t("settings.geoDenied")),
    );
  }

  async function accept(request: SOSRequest) {
    const res = await fetch("/api/sos/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: request.id }),
    });
    if (res.ok) {
      setFeed([]);
      setActiveSession({
        id: request.id,
        patient_name: request.patient_name,
        symptom_category: request.symptom_category,
        distance_m: request.distance_m,
        accepted_at: new Date().toISOString(),
      });
      setCompleteFee(String(fee));
    } else {
      const err = await res.json();
      setActionError(err.error || t("active.acceptError"));
    }
  }

  async function decline(sessionId: string, reason: string) {
    await fetch("/api/sos/decline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, reason }),
    });
    setDeclinedIds((prev) => new Set([...prev, sessionId]));
  }

  async function completeSession() {
    if (!activeSession) return;
    const feeNum = parseFloat(completeFee);
    if (isNaN(feeNum) || feeNum <= 0) {
      setActionError(t("active.invalidFee"));
      return;
    }
    setCompleting(true);
    const res = await fetch("/api/sos/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSession.id, fee: Math.round(feeNum * 1000) }),
    });
    setCompleting(false);
    if (res.ok) {
      setActiveSession(null);
      setShowCompleteForm(false);
      refreshFeed();
    } else {
      const err = await res.json();
      setActionError(err.error || t("active.closeError"));
    }
  }

  async function cancelSession() {
    if (!activeSession) return;
    setShowCancelConfirm(true);
  }

  async function confirmCancelSession() {
    if (!activeSession) return;
    setShowCancelConfirm(false);
    setCancelling(true);
    const res = await fetch("/api/sos/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSession.id, cancelledBy: "doctor" }),
    });
    setCancelling(false);
    if (res.ok) {
      setActiveSession(null);
      refreshFeed();
    } else {
      const err = await res.json();
      setActionError(err.error || t("active.cancelError"));
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <p className="text-gray-400 p-6">{t("loading")}</p>;

  const visibleFeed = feed.filter((r) => !declinedIds.has(r.id));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Action error banner */}
      {actionError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex-1">{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="shrink-0 text-red-400 hover:text-red-600 font-medium leading-none"
            aria-label={t("actionErrorClose")}
          >
            ✕
          </button>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-foreground">{t("cancelModal.title")}</h3>
            <p className="text-sm text-gray-600">
              {t("cancelModal.body")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t("cancelModal.no")}
              </button>
              <button
                onClick={confirmCancelSession}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                {t("cancelModal.yesCancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("header.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t("header.subtitle")}
        </p>
        <strong className="block mt-1 text-sm text-orange-600">
          {t("header.notVital")}
        </strong>
      </div>

      {/* Settings card */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        {/* Status badge */}
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            sosAvailable
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {sosAvailable
            ? t("settings.statusAvailable")
            : t("settings.statusDisabled")}
        </div>

        {/* Settings fields (shown when disabled) */}
        {!sosAvailable && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="radius">{t("settings.radiusLabel")}</Label>
              <Input
                id="radius"
                type="number"
                min={1}
                max={30}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="fee">{t("settings.feeLabel")}</Label>
              <Input
                id="fee"
                type="number"
                min={20}
                max={500}
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
              />
            </div>

            {/* Time window */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="allday"
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="allday" className="cursor-pointer">
                  {t("settings.allDayLabel")}
                </Label>
              </div>

              {!allDay && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label htmlFor="from">{t("settings.fromLabel")}</Label>
                    <input
                      id="from"
                      type="time"
                      value={availableFrom}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="to">{t("settings.toLabel")}</Label>
                    <input
                      id="to"
                      type="time"
                      value={availableTo}
                      onChange={(e) => setAvailableTo(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button
          onClick={toggleSOS}
          className={sosAvailable ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"}
        >
          {sosAvailable ? t("settings.deactivate") : t("settings.activate")}
        </Button>
      </div>

      {/* Active session card */}
      {sosAvailable && activeSession && (
        <div className="bg-white rounded-xl border border-primary p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="font-semibold text-foreground">{t("active.title")}</h2>
          </div>

          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-500">{t("active.patient")}</span>{" "}
              <span className="font-medium">{activeSession.patient_name}</span>
            </p>
            <p>
              <span className="text-gray-500">{t("active.symptom")}</span>{" "}
              {activeSession.symptom_category || t("active.symptomUnspecified")}
            </p>
            <p>
              <span className="text-gray-500">{t("active.distance")}</span>{" "}
              {(activeSession.distance_m / 1000).toFixed(1)} km
            </p>
            <p>
              <span className="text-gray-500">{t("active.elapsed")}</span>{" "}
              <LiveTimer since={activeSession.accepted_at} />
            </p>
          </div>

          {!showCompleteForm ? (
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCompleteForm(true)}
                className="bg-primary hover:bg-primary/90"
              >
                {t("active.complete")}
              </Button>
              <Button
                variant="outline"
                onClick={cancelSession}
                disabled={cancelling}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                {cancelling ? t("active.cancelling") : t("active.cancel")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label htmlFor="completeFee">{t("active.feeLabel")}</Label>
                <Input
                  id="completeFee"
                  type="number"
                  min={0}
                  step={1}
                  value={completeFee}
                  onChange={(e) => setCompleteFee(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={completeSession}
                  disabled={completing}
                  className="bg-primary hover:bg-primary/90"
                >
                  {completing ? t("active.saving") : t("active.confirmComplete")}
                </Button>
                <Button variant="outline" onClick={() => setShowCompleteForm(false)}>
                  {t("active.back")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feed */}
      {sosAvailable && !activeSession && (
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              {t("feed.title", { count: visibleFeed.length })}
            </h2>
            <span className="text-xs text-gray-400">{t("feed.liveUpdate")}</span>
          </div>

          {visibleFeed.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">
              {t("feed.empty")}
            </p>
          ) : (
            <div className="divide-y">
              {visibleFeed.map((r) => (
                <FeedCard
                  key={r.id}
                  request={r}
                  onAccept={() => accept(r)}
                  onDecline={(reason) => decline(r.id, reason)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t("history.title")}</h2>

        {/* Earnings KPI strip */}
        {earnings && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label={t("history.kpiRevenues")}
              value={formatDT(Number(earnings.total_fee))}
            />
            <KpiCard
              label={t("history.kpiCommission")}
              value={formatDT(Number(earnings.total_commission))}
            />
            <KpiCard
              label={t("history.kpiNet")}
              value={formatDT(Number(earnings.total_fee) - Number(earnings.total_commission))}
            />
            <KpiCard
              label={t("history.kpiSessions")}
              value={String(earnings.session_count)}
            />
          </div>
        )}

        {/* History table */}
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">{t("history.empty")}</p>
        ) : (
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-start text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">{t("history.colDate")}</th>
                  <th className="px-4 py-3">{t("history.colPatient")}</th>
                  <th className="px-4 py-3">{t("history.colSymptom")}</th>
                  <th className="px-4 py-3">{t("history.colStatus")}</th>
                  <th className="px-4 py-3 text-end">{t("history.colFee")}</th>
                  <th className="px-4 py-3 text-end">{t("history.colRating")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((row) => {
                  const badge = STATUS_LABELS[row.status] ?? {
                    label: row.status,
                    className: "bg-gray-100 text-gray-600",
                  };
                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(row.requested_at).toLocaleDateString("fr-TN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">{row.patient_name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.symptom_category || t("history.symptomDash")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">{formatDT(row.fee)}</td>
                      <td className="px-4 py-3 text-end">
                        <StarRating value={row.rating ?? 0} readOnly size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feed card ────────────────────────────────────────────────────────────────

function FeedCard({
  request,
  onAccept,
  onDecline,
}: {
  request: SOSRequest;
  onAccept: () => void;
  onDecline: (reason: string) => void;
}) {
  const t = useTranslations("sos.medecin.feed");
  const [selectedReason, setSelectedReason] = useState("");

  const DECLINE_REASONS = [
    { value: "too_far", label: t("reasonTooFar") },
    { value: "unavailable", label: t("reasonUnavailable") },
    { value: "out_of_scope", label: t("reasonOutOfScope") },
    { value: "other", label: t("reasonOther") },
  ];

  function handleDecline() {
    if (!selectedReason) return;
    onDecline(selectedReason);
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground">{request.patient_name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {(request.distance_m / 1000).toFixed(1)} km &middot;{" "}
            {request.symptom_category || t("symptomUnspecified")}
          </div>
          {request.description && (
            <div className="text-sm text-gray-700 mt-2 line-clamp-2">
              {request.description}
            </div>
          )}
        </div>
        <Button
          size="sm"
          onClick={onAccept}
          className="shrink-0 bg-primary hover:bg-primary/90"
        >
          {t("accept")}
        </Button>
      </div>

      {/* Decline controls */}
      <div className="flex items-center gap-2">
        <select
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t("declineChoose")}</option>
          {DECLINE_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={!selectedReason}
          className="border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          {t("decline")}
        </Button>
      </div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border p-4 text-center">
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
