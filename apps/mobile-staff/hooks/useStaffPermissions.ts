import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { api } from "@doktori/mobile-core";

export type StaffPermissions = {
  agenda: boolean;
  patients: boolean;
  patientsCreate: boolean;
  patientsEdit: boolean;
  patientsDelete: boolean;
  rendezVous: boolean;
  rendezVousCreate: boolean;
  rendezVousEdit: boolean;
  rendezVousCancel: boolean;
  messagerie: boolean;
  wallet: boolean;
  factures: boolean;
  motifs: boolean;
  cabinets: boolean;
  teleconsult: boolean;
};

// ─── Module-level shared state ────────────────────────────────────────────────

let cache: StaffPermissions | null = null;

// All mounted hook instances subscribe here so they all update at once.
const subscribers = new Set<(p: StaffPermissions) => void>();

function notify(p: StaffPermissions) {
  cache = p;
  subscribers.forEach((fn) => fn(p));
}

async function fetchPermissions() {
  try {
    const data = await api<{ role: string; permissions: StaffPermissions }>(
      "/api/staff/me",
      { noRedirect: true }
    );
    notify(data.permissions);
  } catch {
    // keep whatever is cached — transient network errors shouldn't wipe permissions
  }
}

// ─── Real-time machinery ──────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60_000; // 60 s background poll

let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;

function startRealtime() {
  if (pollTimer) return; // already running
  pollTimer = setInterval(() => { void fetchPermissions(); }, POLL_INTERVAL_MS);
  appStateSub = AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "active") void fetchPermissions();
  });
}

function stopRealtime() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (appStateSub) { appStateSub.remove(); appStateSub = null; }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Call on logout — clears cache and stops background polling. */
export function clearPermissionsCache() {
  cache = null;
  stopRealtime();
}

export function useStaffPermissions() {
  const [permissions, setPermissions] = useState<StaffPermissions | null>(cache);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    // Register this instance as a subscriber so it gets all future updates.
    const handler = (p: StaffPermissions) => {
      setPermissions(p);
      setLoading(false);
    };
    subscribers.add(handler);

    if (cache) {
      // Already have a value — show it immediately, then refresh in background.
      setLoading(false);
      void fetchPermissions();
    } else {
      void fetchPermissions().finally(() => setLoading(false));
    }

    // Start polling + AppState listener (no-op if already running).
    startRealtime();

    return () => {
      subscribers.delete(handler);
      // Stop background work only when every screen has unmounted.
      if (subscribers.size === 0) stopRealtime();
    };
  }, []);

  return { permissions, loading };
}
