"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock, User, Building2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WaitingRoom {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  appointmentId: string;
  checkedInAt: string;
  waitMinutes: number;
  motif: string | null;
  type: string;
  practiceId: string | null;
  practiceName: string | null;
}

interface WaitingRoomData {
  rooms: WaitingRoom[];
  stats: { totalWaiting: number; avgWaitMinutes: number };
}

// ── Wait badge ────────────────────────────────────────────────────────────────

function WaitBadge({ minutes, tv }: { minutes: number; tv: boolean }) {
  const cls =
    minutes < 15
      ? "bg-green-100 text-green-800"
      : minutes < 30
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full font-bold tabular-nums",
        tv ? "px-4 py-1.5 text-lg" : "px-2.5 py-1 text-xs",
        cls,
      ].join(" ")}
    >
      <Clock className={tv ? "h-5 w-5" : "h-3.5 w-3.5"} strokeWidth={2.5} />
      {minutes} min
    </span>
  );
}

// ── Patient card ──────────────────────────────────────────────────────────────

function PatientCard({ room, tv }: { room: WaitingRoom; tv: boolean }) {
  return (
    <div
      className={[
        "rounded-2xl border shadow-sm flex flex-col gap-3",
        tv
          ? "bg-gray-900 border-gray-700 p-7"
          : "bg-white border-border p-5",
      ].join(" ")}
    >
      {/* Top row: name + wait badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={[
              "flex shrink-0 items-center justify-center rounded-full font-black text-white",
              tv ? "h-14 w-14 text-xl" : "h-10 w-10 text-sm",
            ].join(" ")}
            style={{ background: "#0891B2" }}
          >
            <User className={tv ? "h-7 w-7" : "h-5 w-5"} strokeWidth={2} />
          </div>
          <span
            className={[
              "font-black truncate",
              tv ? "text-white text-2xl" : "text-foreground text-base",
            ].join(" ")}
          >
            {room.patientName}
          </span>
        </div>
        <WaitBadge minutes={room.waitMinutes} tv={tv} />
      </div>

      {/* Doctor */}
      <div className={["flex items-center gap-2", tv ? "text-gray-300 text-lg" : "text-sm text-muted-foreground"].join(" ")}>
        <User className={tv ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0"} strokeWidth={2} />
        <span className="font-semibold truncate">{room.doctorName}</span>
        <span className={tv ? "text-gray-400" : "text-muted-foreground/60"}>·</span>
        <span className="truncate">{room.doctorSpecialty}</span>
      </div>

      {/* Practice */}
      {room.practiceName && (
        <div className={["flex items-center gap-2", tv ? "text-gray-400 text-base" : "text-xs text-muted-foreground/70"].join(" ")}>
          <Building2 className={tv ? "h-5 w-5 shrink-0" : "h-3.5 w-3.5 shrink-0"} strokeWidth={2} />
          <span className="truncate">{room.practiceName}</span>
        </div>
      )}

      {/* Motif */}
      {room.motif && (
        <p
          className={[
            "line-clamp-2",
            tv ? "text-gray-400 text-base" : "text-xs text-muted-foreground/70",
          ].join(" ")}
        >
          {room.motif}
        </p>
      )}
    </div>
  );
}

// ── Inner component (needs useSearchParams) ───────────────────────────────────

function SalleAttenteInner() {
  const t = useTranslations("clinique.salleAttente");
  const searchParams = useSearchParams();
  const tv = searchParams.get("display") === "tv";

  const [data, setData] = useState<WaitingRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    fetch("/api/clinique/waiting-room")
      .then((res) => {
        if (!res.ok) return res.json().then((d: { error: string }) => Promise.reject(d.error));
        return res.json() as Promise<WaitingRoomData>;
      })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err: string) => setError(err ?? "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, tv ? 10_000 : 15_000);
    return () => clearInterval(interval);
  }, [fetchData, tv]);

  // TV mode: full-screen dark overlay hiding normal layout chrome
  const wrapClass = tv
    ? "fixed inset-0 z-50 overflow-y-auto p-8"
    : "";
  const wrapStyle = tv ? { background: "#0B1120" } : undefined;

  if (loading && !data) {
    return (
      <div className={wrapClass} style={wrapStyle}>
        <div className="space-y-4 animate-pulse">
          <div className={["rounded-xl", tv ? "h-10 w-64 bg-gray-700" : "h-7 w-56 bg-gray-200"].join(" ")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={["rounded-2xl", tv ? "h-48 bg-gray-800" : "h-36 bg-gray-100"].join(" ")} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={wrapClass} style={wrapStyle}>
        <p className={tv ? "text-red-400 text-xl" : "text-red-500 text-sm py-12 text-center"}>
          Erreur : {error}
        </p>
      </div>
    );
  }

  const { rooms, stats } = data ?? { rooms: [], stats: { totalWaiting: 0, avgWaitMinutes: 0 } };

  return (
    <div className={[wrapClass, "space-y-6"].join(" ")} style={wrapStyle}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1
            className={[
              "font-black",
              tv ? "text-white text-4xl" : "text-foreground text-2xl",
            ].join(" ")}
          >
            {t("title")}
          </h1>
          <p className={tv ? "text-gray-400 text-xl mt-1" : "text-muted-foreground text-sm mt-1"}>
            {t("subtitle")}
          </p>
        </div>

        {/* Stats chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full font-bold",
              tv
                ? "bg-cyan-900/50 text-cyan-300 px-5 py-2 text-xl border border-cyan-800"
                : "bg-cyan-50 text-cyan-700 px-3 py-1.5 text-sm border border-cyan-200",
            ].join(" ")}
          >
            <User className={tv ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.5} />
            {t("totalWaiting", { count: stats.totalWaiting })}
          </span>

          {stats.totalWaiting > 0 && (
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full font-bold",
                tv
                  ? "bg-gray-800 text-gray-300 px-5 py-2 text-xl border border-gray-700"
                  : "bg-gray-100 text-gray-600 px-3 py-1.5 text-sm border border-gray-200",
              ].join(" ")}
            >
              <Clock className={tv ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.5} />
              {t("avgWait", { min: stats.avgWaitMinutes })}
            </span>
          )}
        </div>
      </div>

      {/* Cards grid or empty state */}
      {rooms.length === 0 ? (
        <div
          className={[
            "flex flex-col items-center justify-center rounded-2xl border",
            tv
              ? "bg-gray-900 border-gray-700 py-32 text-gray-500 text-2xl"
              : "bg-white border-border py-20 text-muted-foreground text-sm",
          ].join(" ")}
        >
          <User
            className={tv ? "h-16 w-16 mb-4 text-gray-700" : "h-10 w-10 mb-3 text-gray-200"}
            strokeWidth={1.5}
          />
          <p className="font-medium">{t("empty")}</p>
        </div>
      ) : (
        <div
          className={[
            "grid gap-4",
            tv
              ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          ].join(" ")}
        >
          {rooms.map((room) => (
            <PatientCard key={room.appointmentId} room={room} tv={tv} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page (Suspense boundary for useSearchParams) ──────────────────────────────

export default function SalleAttentePage() {
  return (
    <Suspense>
      <SalleAttenteInner />
    </Suspense>
  );
}
