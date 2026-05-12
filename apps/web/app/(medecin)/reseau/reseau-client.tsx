"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Star,
  MapPin,
  Stethoscope,
  UserPlus,
  Users,
  Compass,
  Mail,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type DoctorCard = {
  id: string;
  name: string;
  slug: string;
  specialty: string | null;
  city: string | null;
  photoUrl: string | null;
  averageRating: number | null | string;
  reviewCount: number | null | string;
  bio: string | null;
};

type Tab = "mon-reseau" | "decouvrir" | "invitations";

export function ReseauClient({
  doctors,
  connections,
  pendingRequests = [],
  sentRequests = [],
}: {
  doctors: DoctorCard[];
  connections: DoctorCard[];
  pendingRequests?: (DoctorCard & { connectionId: string; createdAt: string })[];
  sentRequests?: (DoctorCard & { connectionId: string; createdAt: string })[];
}) {
  const t = useTranslations("medecin.reseau");
  const [tab, setTab] = useState<Tab>("mon-reseau");
  const [invitationsSubTab, setInvitationsSubTab] = useState<"received" | "sent">(
    "received",
  );
  const [query, setQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  // Local optimistic state so accepted/declined/cancelled requests
  // disappear without a hard reload.
  const [requests, setRequests] = useState(pendingRequests);
  const [sent, setSent] = useState(sentRequests);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function respond(connectionId: string, action: "accept" | "decline") {
    setRespondingId(connectionId);
    try {
      const res = await fetch(`/api/doctor/network/connect/${connectionId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.connectionId !== connectionId));
        // Force a refresh of the connections list on the next page load.
        if (action === "accept") window.location.reload();
      }
    } finally {
      setRespondingId(null);
    }
  }

  async function cancelSent(connectionId: string) {
    setRespondingId(connectionId);
    try {
      const res = await fetch(`/api/doctor/network/connect/${connectionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSent((prev) => prev.filter((r) => r.connectionId !== connectionId));
      }
    } finally {
      setRespondingId(null);
    }
  }

  const source = tab === "mon-reseau" ? connections : doctors;

  const specialties = useMemo(() => {
    const set = new Set<string>();
    for (const d of source) if (d.specialty) set.add(d.specialty);
    return Array.from(set).sort();
  }, [source]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((d) => {
      if (specialtyFilter && d.specialty !== specialtyFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.specialty ?? "").toLowerCase().includes(q) ||
        (d.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [source, query, specialtyFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("pageTitle")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t("pageSubtitle")}
        </p>
      </div>

      <div className="inline-flex ds-card p-1 shadow-sm">
        <TabButton
          active={tab === "mon-reseau"}
          onClick={() => setTab("mon-reseau")}
          icon={<Users className="h-4 w-4" />}
          label={t("myNetwork")}
          count={connections.length}
        />
        <TabButton
          active={tab === "decouvrir"}
          onClick={() => setTab("decouvrir")}
          icon={<Compass className="h-4 w-4" />}
          label={t("discover")}
          count={doctors.length}
        />
        <TabButton
          active={tab === "invitations"}
          onClick={() => setTab("invitations")}
          icon={<Mail className="h-4 w-4" />}
          label={t("invitations")}
          count={requests.length + sent.length}
        />
      </div>

      {tab !== "invitations" && (
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full h-10 rounded-xl border border-border bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary md:w-64"
          >
            <option value="">{t("allSpecialties")}</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {tab === "invitations" ? (
        <div className="space-y-3">
          {/* Sub-tabs: received / sent */}
          <div className="inline-flex rounded-xl border border-border bg-white p-1">
            <button
              type="button"
              onClick={() => setInvitationsSubTab("received")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                invitationsSubTab === "received"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-secondary"
              }`}
            >
              {t("invitationsReceived")}
              <span
                className={`ms-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  invitationsSubTab === "received"
                    ? "bg-white/20 text-white"
                    : "bg-secondary text-gray-700"
                }`}
              >
                {requests.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInvitationsSubTab("sent")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                invitationsSubTab === "sent"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-secondary"
              }`}
            >
              {t("invitationsSent")}
              <span
                className={`ms-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  invitationsSubTab === "sent"
                    ? "bg-white/20 text-white"
                    : "bg-secondary text-gray-700"
                }`}
              >
                {sent.length}
              </span>
            </button>
          </div>

          {invitationsSubTab === "received" ? (
            requests.length === 0 ? (
              <EmptyState tab={tab} hasQuery={false} />
            ) : (
              <ul className="ds-card divide-y divide-border">
                {requests.map((r) => (
                  <li
                    key={r.connectionId}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    {r.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.photoUrl}
                        alt={r.name}
                        width={40}
                        height={40}
                        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <span
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[12px] font-bold"
                        style={{ background: "#F1F5F9", color: "#475569" }}
                      >
                        {r.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] truncate text-foreground">
                        {r.name}
                      </div>
                      <div className="text-[12.5px] truncate text-gray-500">
                        {[r.specialty, r.city].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={respondingId === r.connectionId}
                      onClick={() => respond(r.connectionId, "accept")}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t("accept")}
                    </button>
                    <button
                      type="button"
                      disabled={respondingId === r.connectionId}
                      onClick={() => respond(r.connectionId, "decline")}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-secondary disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("decline")}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : sent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
              <Mail className="h-10 w-10 text-gray-300 mx-auto" />
              <h3 className="mt-3 font-semibold text-foreground">
                {t("noInvitationsSent")}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t("noInvitationsSentDesc")}
              </p>
            </div>
          ) : (
            <ul className="ds-card divide-y divide-border">
              {sent.map((r) => (
                <li
                  key={r.connectionId}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {r.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.photoUrl}
                      alt={r.name}
                      width={40}
                      height={40}
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[12px] font-bold"
                      style={{ background: "#F1F5F9", color: "#475569" }}
                    >
                      {r.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[14px] truncate text-foreground">
                      {r.name}
                    </div>
                    <div className="text-[12.5px] truncate text-gray-500">
                      {[r.specialty, r.city].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-semibold rounded-full px-2 py-1"
                    style={{ background: "#FEF3C7", color: "#92400E" }}
                  >
                    {t("pendingResponse")}
                  </span>
                  <button
                    type="button"
                    disabled={respondingId === r.connectionId}
                    onClick={() => cancelSent(r.connectionId)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-secondary disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("cancelInvitation")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState tab={tab} hasQuery={!!query || !!specialtyFilter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <DoctorCardView
              key={d.id}
              doctor={d}
              connected={tab === "mon-reseau"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-primary text-white shadow-sm"
          : "text-gray-600 hover:bg-secondary"
      }`}
    >
      {icon}
      {label}
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
          active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ tab, hasQuery }: { tab: Tab; hasQuery: boolean }) {
  const t = useTranslations("medecin.reseau");
  if (hasQuery) {
    return (
      <div className="ds-card p-8 text-center text-sm text-gray-500">
        {t("noResults")}
      </div>
    );
  }
  if (tab === "mon-reseau") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
        <Users className="h-10 w-10 text-gray-300 mx-auto" />
        <h3 className="mt-3 font-semibold text-foreground">{t("noNetwork")}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t("noNetworkDesc")}
        </p>
      </div>
    );
  }
  if (tab === "invitations") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
        <Mail className="h-10 w-10 text-gray-300 mx-auto" />
        <h3 className="mt-3 font-semibold text-foreground">{t("noInvitations")}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t("noInvitationsDesc")}
        </p>
      </div>
    );
  }
  return (
    <div className="ds-card p-8 text-center text-sm text-gray-500">
      {t("noDoctors")}
    </div>
  );
}

function DoctorCardView({
  doctor,
  connected,
}: {
  doctor: DoctorCard;
  connected: boolean;
}) {
  const t = useTranslations("medecin.reseau");
  const rating = Number(doctor.averageRating ?? 0);
  const reviewCount = Number(doctor.reviewCount ?? 0);
  const initials = doctor.name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="flex flex-col ds-card hover:shadow-md transition-shadow overflow-hidden">
      <Link
        href={`/reseau/${doctor.id}`}
        className="flex-1 flex flex-col p-5 space-y-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-start gap-3">
          {doctor.photoUrl ? (
            <Image
              src={doctor.photoUrl}
              alt={doctor.name}
              width={56}
              height={56}
              className="h-14 w-14 rounded-2xl object-cover shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{doctor.name}</p>
            {doctor.specialty && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Stethoscope className="h-3 w-3 shrink-0" />
                <span className="truncate">{doctor.specialty}</span>
              </p>
            )}
            {doctor.city && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                {doctor.city}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className="inline-flex items-center gap-1 rounded-full bg-yellow-50 text-yellow-700 px-2 py-0.5 text-xs font-semibold border border-yellow-200">
            <Star className="h-3 w-3 fill-current" />
            {rating.toFixed(1)}
          </div>
          <span className="text-xs text-gray-400">
            {t("reviews", { count: reviewCount })}
          </span>
        </div>

        {doctor.bio && (
          <p className="text-xs text-gray-600 line-clamp-3 flex-1">{doctor.bio}</p>
        )}
      </Link>

      <div className="p-5 pt-3 border-t border-border flex gap-2">
        <ConnectButton doctorId={doctor.id} connected={connected} />
      </div>
    </div>
  );
}

function ConnectButton({ doctorId, connected }: { doctorId: string; connected: boolean }) {
  const t = useTranslations("medecin.reseau");
  const tCommon = useTranslations("medecin.common");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "connected">(
    connected ? "connected" : "idle"
  );
  async function send(e: React.MouseEvent) {
    e.preventDefault();
    if (state !== "idle") return;
    setState("sending");
    try {
      const res = await fetch("/api/doctor/network/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: doctorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      if (data.already) {
        toast.info(t("alreadyInvited"));
      } else {
        toast.success(t("invitationSent"));
      }
      setState("sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setState("idle");
    }
  }
  return (
    <button
      onClick={send}
      disabled={state !== "idle"}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-opacity ${
        state === "connected"
          ? "border border-border bg-white text-foreground"
          : state === "sent"
            ? "bg-gray-100 text-gray-600"
            : "bg-primary text-white hover:opacity-90 disabled:opacity-60"
      }`}
    >
      <UserPlus className="h-3.5 w-3.5" />
      {state === "connected"
        ? t("connected")
        : state === "sent"
          ? t("invitationSent")
          : state === "sending"
            ? tCommon("sending")
            : t("connect")}
    </button>
  );
}
