/**
 * Mobile call engine. Thin wrapper around react-native-webrtc that uses the
 * existing Doktori signaling endpoints (callSessions + callSignals tables).
 *
 * Kept engine-agnostic here: the native peer connection class is injected by
 * the consumer so this module doesn't import react-native-webrtc directly
 * (avoids bundling native-only code into the core package).
 */

import { api } from "./api";
import type { CallState } from "./types";

export type CallSession = {
  id: string;
  callerType: "doctor" | "patient" | "secretary";
  callerId: string;
  calleeType: "doctor" | "patient" | "secretary";
  calleeId: string;
  status: "ringing" | "accepted" | "declined" | "ended";
};

export type Signal = {
  kind: "offer" | "answer" | "ice";
  payload: unknown;
};

/** Create a new call session (caller side). */
export async function createCall(
  calleeType: "doctor" | "patient" | "secretary",
  calleeId: string
): Promise<CallSession> {
  return api<CallSession>("/api/calls", {
    method: "POST",
    body: { calleeType, calleeId },
  });
}

/** Accept or decline/end an incoming call. */
export async function callAction(
  sessionId: string,
  action: "accept" | "decline" | "end"
): Promise<void> {
  await api(`/api/calls/${sessionId}/action`, {
    method: "POST",
    body: { action },
  });
}

/** Send a WebRTC signal (SDP offer/answer or ICE candidate). */
export async function sendSignal(sessionId: string, signal: Signal): Promise<void> {
  await api(`/api/calls/${sessionId}/signal`, {
    method: "POST",
    body: signal,
  });
}

/** Poll for pending signals since a given cursor. */
export async function fetchSignals(
  sessionId: string,
  sinceCreatedAt?: string
): Promise<Array<Signal & { id: string; createdAt: string }>> {
  const qs = sinceCreatedAt ? `?since=${encodeURIComponent(sinceCreatedAt)}` : "";
  return api(`/api/calls/${sessionId}/signal${qs}`);
}

/** Poll call status (ringing / accepted / declined / ended). */
export async function fetchCallStatus(sessionId: string): Promise<CallSession> {
  return api(`/api/calls/${sessionId}/status`);
}

/** Poll the list of pending (ringing) incoming calls for the current user. */
export async function fetchPendingCalls(): Promise<CallSession[]> {
  const res = await api<{ calls: CallSession[] }>("/api/calls/pending");
  return res.calls ?? [];
}

export type CallStateUpdate = (state: Partial<CallState>) => void;
