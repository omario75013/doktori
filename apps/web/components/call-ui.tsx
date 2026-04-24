"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Phone, PhoneOff, Mic, MicOff, PhoneIncoming } from "lucide-react";
import { toast } from "sonner";
import { osNotify } from "@/lib/os-notify";

export type PeerType = "doctor" | "secretary" | "patient";

type CallStatus = "idle" | "outgoing" | "incoming" | "active" | "ended";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// ─── 1. Button to start a call ────────────────────────────────────────────────

export function CallButton({
  peerType,
  peerId,
  peerName,
}: {
  peerType: PeerType;
  peerId: string;
  peerName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Appeler ${peerName}`}
        className="h-9 w-9 rounded-full bg-primary text-white hover:opacity-90 flex items-center justify-center"
      >
        <Phone className="h-4 w-4" />
      </button>
      {open && (
        <OutgoingCall
          peerType={peerType}
          peerId={peerId}
          peerName={peerName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── 2. Outgoing call dialog (caller side) ────────────────────────────────────

function OutgoingCall({
  peerType,
  peerId,
  peerName,
  onClose,
}: {
  peerType: PeerType;
  peerId: string;
  peerName: string;
  onClose: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const createdRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ calleeType: peerType, calleeId: peerId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        setSessionId(data.session.id);
        setStatus("outgoing");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
        onCloseRef.current();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerType, peerId]);

  // Poll remote status until answered / declined / timeout
  useEffect(() => {
    if (!sessionId || status !== "outgoing") return;
    let stopped = false;
    const timeout = setTimeout(async () => {
      if (stopped) return;
      await fetch(`/api/calls/${sessionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      }).catch(() => {});
      setStatus("ended");
      toast.info("Pas de réponse");
      onCloseRef.current();
    }, 60_000);

    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/calls/${sessionId}/status`);
        if (!r.ok) return;
        const data = await r.json();
        if (data.status === "active") {
          clearTimeout(timeout);
          setStatus("active");
        } else if (data.status === "declined" || data.status === "ended") {
          clearTimeout(timeout);
          toast.info(data.status === "declined" ? "Appel refusé" : "Appel terminé");
          setStatus("ended");
          onCloseRef.current();
        }
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => {
      stopped = true;
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, [sessionId, status]);

  async function cancel() {
    if (sessionId) {
      await fetch(`/api/calls/${sessionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      }).catch(() => {});
    }
    onClose();
  }

  if (status === "active" && sessionId) {
    return <InCallPanel sessionId={sessionId} peerName={peerName} role="caller" onEnd={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs rounded-3xl bg-white shadow-2xl p-6 space-y-4 text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center animate-pulse">
          <Phone className="h-8 w-8" />
        </div>
        <div>
          <p className="text-lg font-bold">{peerName}</p>
          <p className="text-sm text-gray-500">Appel en cours…</p>
        </div>
        <button
          type="button"
          onClick={cancel}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 text-white px-4 py-3 text-base font-bold hover:bg-red-600"
        >
          <PhoneOff className="h-5 w-5" />
          Raccrocher
        </button>
      </div>
    </div>
  );
}

// ─── 3. Incoming call listener — mounts in layouts ────────────────────────────

type IncomingPayload = {
  id: string;
  callerType: string;
  callerId: string;
  callerName: string | null;
  callerPhotoUrl: string | null;
};

export function IncomingCallListener() {
  const [incoming, setIncoming] = useState<IncomingPayload | null>(null);
  const [active, setActive] = useState<{ sessionId: string; peerName: string } | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/calls/pending", { cache: "no-store" });
      if (!res.ok) return;
      const rows: IncomingPayload[] = await res.json();
      const next = rows.find((r) => !seenRef.current.has(r.id));
      if (next) {
        seenRef.current.add(next.id);
        setIncoming(next);
        osNotify({
          title: "📞 Appel entrant",
          body: next.callerName ?? "Nouvel appel",
        });
        try {
          // play a ringtone beep
          const AudioCtx =
            (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = 660;
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
          }
        } catch {
          /* no audio */
        }
        if ("vibrate" in navigator) navigator.vibrate?.(300);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [poll]);

  async function accept() {
    if (!incoming) return;
    await fetch(`/api/calls/${incoming.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    setActive({ sessionId: incoming.id, peerName: incoming.callerName ?? "Appel entrant" });
    setIncoming(null);
  }
  async function reject() {
    if (!incoming) return;
    await fetch(`/api/calls/${incoming.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    setIncoming(null);
  }

  if (active) {
    return (
      <InCallPanel
        sessionId={active.sessionId}
        peerName={active.peerName}
        role="callee"
        onEnd={() => setActive(null)}
      />
    );
  }

  if (!incoming) return null;

  const initials = (incoming.callerName ?? "?")
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs rounded-3xl bg-white shadow-2xl p-6 space-y-4 text-center">
        <div className="mx-auto h-20 w-20">
          {incoming.callerPhotoUrl ? (
            <Image
              src={incoming.callerPhotoUrl}
              alt={incoming.callerName ?? "appelant"}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-primary/40 animate-pulse"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold animate-pulse ring-4 ring-primary/40">
              {initials}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1">
            <PhoneIncoming className="h-3 w-3" /> Appel entrant
          </p>
          <p className="text-lg font-bold mt-1">{incoming.callerName ?? "Inconnu"}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reject}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 text-white px-4 py-3 text-sm font-bold hover:bg-red-600"
          >
            <PhoneOff className="h-4 w-4" />
            Refuser
          </button>
          <button
            type="button"
            onClick={accept}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 text-white px-4 py-3 text-sm font-bold hover:bg-green-600"
          >
            <Phone className="h-4 w-4" />
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 4. In-call panel with WebRTC ────────────────────────────────────────────

function InCallPanel({
  sessionId,
  peerName,
  role,
  onEnd,
}: {
  sessionId: string;
  peerName: string;
  role: "caller" | "callee";
  onEnd: () => void;
}) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        fetch(`/api/calls/${sessionId}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "ice", payload: e.candidate.toJSON() }),
        }).catch(() => {});
      }
    };

    pc.ontrack = (e) => {
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0];
        audioRef.current.play().catch(() => {});
      }
    };

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        for (const track of stream.getTracks()) pc.addTrack(track, stream);

        if (role === "caller") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await fetch(`/api/calls/${sessionId}/signal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "offer", payload: offer }),
          });
        }
      } catch (e) {
        toast.error("Accès microphone refusé");
        end();
      }
    }
    init();

    // Poll signals
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls/${sessionId}/signal`);
        if (!res.ok) return;
        const signals: Array<{ kind: string; payload: RTCSessionDescriptionInit | RTCIceCandidateInit }> =
          await res.json();
        for (const s of signals) {
          if (s.kind === "offer") {
            await pc.setRemoteDescription(s.payload as RTCSessionDescriptionInit);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await fetch(`/api/calls/${sessionId}/signal`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind: "answer", payload: answer }),
            });
          } else if (s.kind === "answer") {
            await pc.setRemoteDescription(s.payload as RTCSessionDescriptionInit);
          } else if (s.kind === "ice") {
            try {
              await pc.addIceCandidate(s.payload as RTCIceCandidateInit);
            } catch {
              /* ignore bad candidate */
            }
          }
        }
      } catch {
        /* ignore */
      }
    }, 1000);

    const statusPoll = setInterval(async () => {
      try {
        const r = await fetch(`/api/calls/${sessionId}/status`);
        if (!r.ok) return;
        const d = await r.json();
        if (d.status === "ended" || d.status === "declined") {
          end();
        }
      } catch {
        /* ignore */
      }
    }, 2000);

    return () => {
      clearInterval(poll);
      clearInterval(statusPoll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, role]);

  async function end() {
    try {
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    await fetch(`/api/calls/${sessionId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    }).catch(() => {});
    onEnd();
  }

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6 space-y-5 text-center">
        <audio ref={audioRef} autoPlay playsInline />
        <div className="mx-auto h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center">
          <Phone className="h-8 w-8" />
        </div>
        <div>
          <p className="text-lg font-bold">{peerName}</p>
          <p className="text-sm text-gray-500 font-mono mt-0.5">
            {mm}:{ss}
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={toggleMute}
            className={`h-12 w-12 rounded-full flex items-center justify-center ${
              muted
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            title={muted ? "Réactiver le micro" : "Couper le micro"}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={end}
            className="h-12 w-12 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center"
            title="Raccrocher"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
