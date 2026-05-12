"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, isPast, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  Calendar,
  Filter,
  Video,
  CheckCircle,
  MapPin,
  Heart,
  ClipboardList,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "upcoming" | "past" | "cancelled";

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  doctorName: string;
  doctorSpecialty: string;
  doctorAddress: string;
  doctorId: string;
  doctorSlug: string;
  beneficiaryName: string | null;
  beneficiaryRelation: string | null;
  doctorPhotoUrl?: string | null;
  hasReview?: boolean;
}

function isUpcoming(a: Appointment) {
  return (a.status === "confirmed" || a.status === "pending" || a.status === "reschedule_requested") && !isPast(new Date(a.startsAt));
}
function isPastAppt(a: Appointment) {
  return a.status === "completed" || (a.status !== "cancelled" && isPast(new Date(a.startsAt)));
}

const MONTH_FR_SHORT = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUIN", "JUIL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];
const DAY_FR_SHORT = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

export default function MesRdvPage() {
  const router = useRouter();
  const t = useTranslations("patient.mesRdv");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : fr;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "cabinet" | "teleconsult">("all");
  const [proche, setProche] = useState<"all" | "self" | "proche">("all");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [actionMode, setActionMode] = useState<"reschedule" | "cancel" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  async function reload() {
    const a = await fetch("/api/appointments/patient", { credentials: "include" });
    if (a.ok) setAppointments(await a.json());
  }

  async function submitAction(appt: Appointment, type: "reschedule" | "cancel", note: string) {
    setActionSaving(true);
    try {
      // Cancel = direct cancellation (subject to the doctor's cancellation
      // window). Reschedule still goes through change-request — the doctor
      // must propose a new slot, so cancel_requested stays for that flow.
      const url =
        type === "cancel"
          ? `/api/appointments/${appt.id}/cancel`
          : `/api/appointments/${appt.id}/change-request`;
      const body =
        type === "cancel"
          ? undefined
          : JSON.stringify({ type, note: note.trim() || undefined });
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(
          type === "cancel" ? "Rendez-vous annulé" : "Demande de report envoyée",
        );
        setActionMode(null);
        setActionNote("");
        setSelectedAppt(null);
        await reload();
      } else if (
        type === "cancel" &&
        data?.error === "CANCEL_WINDOW_TOO_CLOSE" &&
        typeof data.windowHours === "number"
      ) {
        toast.error(
          `Annulation impossible : ce médecin n'accepte plus d'annulation moins de ${data.windowHours}h avant le rendez-vous.`,
        );
      } else {
        toast.error(typeof data?.error === "string" ? data.error : "Erreur");
      }
    } finally {
      setActionSaving(false);
    }
  }

  useEffect(() => {
    let legacy: string | null = null;
    try { legacy = localStorage.getItem("doktori_patient_token"); } catch { /* ignore */ }
    (async () => {
      let r = await fetch("/api/patients/me", { credentials: "include" });
      if (!r.ok && legacy) {
        r = await fetch("/api/patients/me", {
          credentials: "include",
          headers: { Authorization: `Bearer ${legacy}` },
        });
      }
      if (!r.ok) {
        router.replace("/connexion-patient");
        return;
      }
      try { sessionStorage.setItem("doktori_patient_session", "1"); } catch {}
      try { localStorage.removeItem("doktori_patient_token"); } catch {}
      const a = await fetch("/api/appointments/patient", { credentials: "include" });
      if (a.ok) {
        const data = await a.json();
        setAppointments(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })().catch(() => {
      setLoading(false);
    });
  }, [router]);

  const upcoming = appointments.filter(isUpcoming);
  const past = appointments.filter(isPastAppt);
  const cancelled = appointments.filter((a) => a.status === "cancelled");
  const tabBase = tab === "upcoming" ? upcoming : tab === "past" ? past : cancelled;

  // Apply filter chips (type + proche/self + search)
  const visible = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return tabBase.filter((a) => {
      if (typeFilter !== "all") {
        const isVid = a.type === "teleconsult" || a.type === "teleconsultation";
        if (typeFilter === "teleconsult" && !isVid) return false;
        if (typeFilter === "cabinet" && isVid) return false;
      }
      if (proche === "self" && a.beneficiaryName) return false;
      if (proche === "proche" && !a.beneficiaryName) return false;
      if (q) {
        const hay = `${a.doctorName} ${a.doctorSpecialty} ${a.beneficiaryName ?? ""} ${a.reason ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tabBase, typeFilter, proche, searchQ]);

  const activeFilterCount =
    (typeFilter !== "all" ? 1 : 0) + (proche !== "all" ? 1 : 0) + (searchQ.trim() ? 1 : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div className="ds-eyebrow">Mon agenda</div>
          <h1 className="ds-page-title">Mes rendez-vous</h1>
          <p className="ds-page-sub">
            {upcoming.length} à venir · {past.length} passés
          </p>
        </div>
        <a href="/recherche" className="ds-btn ds-btn-primary">
          <Plus className="w-4 h-4" /> Nouveau rendez-vous
        </a>
      </div>

      {/* Tabs + filters */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="ds-tabs">
          <button
            type="button"
            className={`ds-tab ${tab === "upcoming" ? "on" : ""}`}
            onClick={() => setTab("upcoming")}
          >
            À venir{" "}
            <span
              className="inline-block ms-2 px-2 rounded-full text-[11px]"
              style={{ background: "var(--primary-50)", color: "var(--primary-700)" }}
            >
              {upcoming.length}
            </span>
          </button>
          <button
            type="button"
            className={`ds-tab ${tab === "past" ? "on" : ""}`}
            onClick={() => setTab("past")}
          >
            Passés
          </button>
          <button
            type="button"
            className={`ds-tab ${tab === "cancelled" ? "on" : ""}`}
            onClick={() => setTab("cancelled")}
          >
            Annulés
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={`ds-btn ds-btn-sm ${filterOpen ? "ds-btn-primary" : "ds-btn-ghost"}`}
          >
            <Filter className="w-4 h-4" /> Filtrer
            {activeFilterCount > 0 && (
              <span
                className="ms-1 inline-block px-1.5 rounded-full text-[10px] font-bold"
                style={{ background: "rgba(255,255,255,0.25)" }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setView((v) => (v === "list" ? "calendar" : "list"))}
            className={`ds-btn ds-btn-sm ${view === "calendar" ? "ds-btn-primary" : "ds-btn-ghost"}`}
          >
            <Calendar className="w-4 h-4" /> {view === "calendar" ? "Vue liste" : "Vue calendrier"}
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="ds-card-patient mb-4" style={{ padding: 14 }}>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--ink-400)" }}>
                Recherche
              </div>
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl px-3 py-2 text-[13.5px] outline-none"
                style={{ background: "#fff", border: "1px solid var(--line-cool)" }}
              />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--ink-400)" }}>
                Type
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="rounded-xl px-3 py-2 text-[13.5px] outline-none"
                style={{ background: "#fff", border: "1px solid var(--line-cool)" }}
              >
                <option value="all">Tous</option>
                <option value="cabinet">Cabinet</option>
                <option value="teleconsult">Téléconsult</option>
              </select>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--ink-400)" }}>
                Pour
              </div>
              <select
                value={proche}
                onChange={(e) => setProche(e.target.value as typeof proche)}
                className="rounded-xl px-3 py-2 text-[13.5px] outline-none"
                style={{ background: "#fff", border: "1px solid var(--line-cool)" }}
              >
                <option value="all">Tous</option>
                <option value="self">Moi</option>
                <option value="proche">Un proche</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQ("");
                  setTypeFilter("all");
                  setProche("all");
                }}
                className="ds-btn ds-btn-ghost ds-btn-sm"
              >
                <X className="w-3.5 h-3.5" /> Effacer
              </button>
            )}
          </div>
        </div>
      )}

      {view === "calendar" && (
        <CalendarView
          appointments={appointments}
          month={calendarMonth}
          onPrev={() => setCalendarMonth((m) => subMonths(m, 1))}
          onNext={() => setCalendarMonth((m) => addMonths(m, 1))}
          onSelect={setSelectedAppt}
        />
      )}

      {/* Appointments list */}
      <div className={`flex flex-col gap-3.5 ${view === "calendar" ? "mt-4" : ""}`}>
        {visible.length === 0 ? (
          <div className="ds-card-patient ds-card-pad-lg text-center py-10">
            <div className="w-16 h-16 mx-auto rounded-full grid place-items-center mb-4" style={{ background: "var(--primary-50)" }}>
              <Calendar className="w-7 h-7" style={{ color: "var(--primary-500)" }} />
            </div>
            <p className="font-bold text-[15px] mb-1" style={{ color: "var(--ink-900)" }}>
              {tab === "upcoming" ? "Aucun rendez-vous à venir" : tab === "past" ? "Aucun rendez-vous passé" : "Aucun rendez-vous annulé"}
            </p>
            {tab === "upcoming" && (
              <>
                <p className="text-[13.5px] mb-4" style={{ color: "var(--ink-500)" }}>
                  Trouvez un médecin et prenez rendez-vous en quelques clics.
                </p>
                <a href="/recherche" className="ds-btn ds-btn-primary ds-btn-sm">
                  Trouver un médecin
                </a>
              </>
            )}
          </div>
        ) : (
          visible.map((a) => (
            <ApptCard key={a.id} a={a} onOpen={() => setSelectedAppt(a)} />
          ))
        )}

        {tab === "upcoming" && (
          <div
            className="ds-card-patient flex gap-3.5 items-center"
            style={{
              background: "linear-gradient(135deg, var(--tone-mint-bg), var(--primary-50))",
              borderColor: "var(--primary-100)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl bg-white grid place-items-center shrink-0"
              style={{ color: "var(--primary-600)" }}
            >
              <Heart className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[14px]" style={{ color: "var(--ink-900)" }}>
                Bilan annuel à programmer
              </div>
              <div className="text-[13px]" style={{ color: "var(--ink-500)" }}>
                Pensez à programmer un bilan complet avec votre généraliste.
              </div>
            </div>
            <a href="/recherche?specialty=generaliste" className="ds-btn ds-btn-primary ds-btn-sm shrink-0">
              Programmer
            </a>
          </div>
        )}
      </div>

      {selectedAppt && (
        <DetailsModal
          a={selectedAppt}
          mode={actionMode}
          note={actionNote}
          saving={actionSaving}
          onSetMode={setActionMode}
          onSetNote={setActionNote}
          onSubmit={() =>
            actionMode && submitAction(selectedAppt, actionMode, actionNote)
          }
          onClose={() => {
            setSelectedAppt(null);
            setActionMode(null);
            setActionNote("");
          }}
        />
      )}
    </div>
  );
}

const RELATION_LABEL: Record<string, string> = {
  child: "Enfant",
  parent: "Parent",
  spouse: "Conjoint(e)",
  sibling: "Frère / sœur",
  other: "Proche",
  self: "",
};

function ApptCard({ a, onOpen }: { a: Appointment; onOpen: () => void }) {
  const date = new Date(a.startsAt);
  const end = new Date(a.endsAt);
  const isVideo = a.type === "teleconsult" || a.type === "teleconsultation";
  const isPending = a.status === "pending";
  const isConfirmed = a.status === "confirmed";
  const isCancelled = a.status === "cancelled";
  const dur = Math.round((end.getTime() - date.getTime()) / 60000);

  return (
    <div className="ds-card-patient" style={{ padding: 18 }}>
      <div className="flex gap-4 items-center">
        {/* Date pill */}
        <div
          className="flex flex-col items-center py-2.5 rounded-2xl shrink-0"
          style={{
            width: 78,
            background: isPending ? "var(--tone-amber-bg)" : isCancelled ? "#F3F4F6" : "var(--primary-50)",
            color: isPending ? "#8B6224" : isCancelled ? "#6B7280" : "var(--primary-700)",
          }}
        >
          <div className="text-[11px] font-bold tracking-wide">{DAY_FR_SHORT[date.getDay()]}</div>
          <div className="text-[28px] font-extrabold leading-none" style={{ fontFamily: "Manrope, sans-serif" }}>
            {date.getDate()}
          </div>
          <div className="text-[11px] font-bold opacity-80">{MONTH_FR_SHORT[date.getMonth()]}</div>
        </div>

        {/* Avatar (doctor photo if available, otherwise initials gradient) */}
        <div
          className="w-12 h-12 rounded-full overflow-hidden grid place-items-center text-white font-bold text-[14px] shrink-0"
          style={{
            background: isVideo
              ? "linear-gradient(135deg, #6FA9CB, #3D75A8)"
              : "linear-gradient(135deg, #5BAEBB, #0F7B8A)",
          }}
        >
          {a.doctorPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.doctorPhotoUrl}
              alt={a.doctorName}
              className="w-full h-full object-cover"
            />
          ) : (
            a.doctorName
              .replace(/^Dr\.?\s*/i, "")
              .split(/\s+/)
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
          )}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <div className="font-bold text-[16px]" style={{ color: "var(--ink-900)", fontFamily: "Manrope, sans-serif" }}>
              {a.doctorName}
            </div>
            {isVideo && (
              <span className="ds-chip ds-chip-sky">
                <Video className="w-3 h-3" /> Vidéo
              </span>
            )}
            {isConfirmed ? (
              <span className="ds-chip ds-chip-mint">
                <CheckCircle className="w-3 h-3" /> Confirmé
              </span>
            ) : isPending ? (
              <span className="ds-chip ds-chip-amber">En attente</span>
            ) : isCancelled ? (
              <span className="ds-chip" style={{ background: "#F3F4F6", color: "#6B7280" }}>
                Annulé
              </span>
            ) : null}
            {a.beneficiaryName && (
              <span
                className="ds-chip"
                style={{
                  background: "var(--tone-coral-bg, #FEEBE2)",
                  color: "#B05F3D",
                }}
                title={`Rendez-vous pour ${a.beneficiaryName}${
                  a.beneficiaryRelation && RELATION_LABEL[a.beneficiaryRelation]
                    ? ` (${RELATION_LABEL[a.beneficiaryRelation]})`
                    : ""
                }`}
              >
                <Users className="w-3 h-3" /> Pour {a.beneficiaryName}
              </span>
            )}
          </div>
          <div className="text-[13px]" style={{ color: "var(--ink-500)" }}>
            {a.doctorSpecialty}
          </div>
          <div className="flex gap-3.5 text-[12.5px] mt-1.5 flex-wrap" style={{ color: "var(--ink-500)" }}>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {format(date, "HH:mm", { locale: fr })} · {dur} min
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {isVideo ? "Vidéo · lien envoyé 30 min avant" : a.doctorAddress || "—"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {isVideo ? (
            <a href={`/teleconsult/${a.id}`} className="ds-btn ds-btn-primary ds-btn-sm">
              <Video className="w-4 h-4" /> Rejoindre
            </a>
          ) : (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(a.doctorAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ds-btn ds-btn-primary ds-btn-sm"
            >
              Itinéraire
            </a>
          )}
          <button type="button" onClick={onOpen} className="ds-btn ds-btn-ghost ds-btn-sm">
            Détails
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Details + action modal ───────── */
function DetailsModal({
  a,
  mode,
  note,
  saving,
  onSetMode,
  onSetNote,
  onSubmit,
  onClose,
}: {
  a: Appointment;
  mode: "reschedule" | "cancel" | null;
  note: string;
  saving: boolean;
  onSetMode: (m: "reschedule" | "cancel" | null) => void;
  onSetNote: (s: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("patient.mesRdv");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : fr;
  const date = new Date(a.startsAt);
  const end = new Date(a.endsAt);
  const isVideo = a.type === "teleconsult" || a.type === "teleconsultation";
  const isCancelled = a.status === "cancelled";
  const isRescheduleReq = a.status === "reschedule_requested";
  const isCancelReq = a.status === "cancel_requested";
  const canEdit = ["pending", "confirmed"].includes(a.status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg ds-card-patient max-h-[90vh] overflow-y-auto"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--line-cool)]">
          <h2 className="font-bold text-[16px]" style={{ color: "var(--ink-900)" }}>
            Détails du rendez-vous
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[color:var(--surface-2)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="font-extrabold text-[18px]" style={{ color: "var(--ink-900)" }}>
              {a.doctorName}
            </div>
            <div className="text-[13.5px]" style={{ color: "var(--ink-500)" }}>
              {a.doctorSpecialty}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Info label={t("fieldDate")} value={format(date, "EEEE d MMMM yyyy", { locale: dateLocale })} />
            <Info
              label={t("fieldTime")}
              value={`${format(date, "HH:mm", { locale: dateLocale })} – ${format(end, "HH:mm", { locale: dateLocale })}`}
            />
            <Info label={t("fieldType")} value={isVideo ? t("typeTeleconsult") : t("typeCabinet")} />
            <Info
              label={t("fieldStatus")}
              value={
                isCancelled
                  ? t("statusCancelled")
                  : isRescheduleReq
                  ? t("statusRescheduleRequested")
                  : isCancelReq
                  ? t("statusCancelRequested")
                  : a.status === "confirmed"
                  ? t("statusConfirmed")
                  : t("statusPending")
              }
            />
            {!isVideo && a.doctorAddress && (
              <Info label={t("fieldAddress")} value={a.doctorAddress} wide />
            )}
            {a.beneficiaryName && (
              <Info
                label={t("fieldFor")}
                wide
                value={`${a.beneficiaryName}${
                  a.beneficiaryRelation && RELATION_LABEL[a.beneficiaryRelation]
                    ? ` · ${RELATION_LABEL[a.beneficiaryRelation]}`
                    : ""
                }`}
              />
            )}
            {a.reason && <Info label={t("fieldReason")} value={a.reason} wide />}
          </div>

          {/* Action area */}
          {mode === null && canEdit && (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => onSetMode("reschedule")}
                className="ds-btn ds-btn-soft ds-btn-sm flex-1 justify-center"
              >
                <ClipboardList className="w-4 h-4" /> Décaler
              </button>
              <button
                type="button"
                onClick={() => onSetMode("cancel")}
                className="ds-btn ds-btn-sm flex-1 justify-center"
                style={{
                  background: "#FEE2E2",
                  color: "#B91C1C",
                  border: "none",
                }}
              >
                <X className="w-4 h-4" /> Annuler
              </button>
            </div>
          )}

          {mode !== null && (
            <div
              className="rounded-xl p-3 space-y-2"
              style={{ background: "var(--surface-2)" }}
            >
              <div className="text-[12.5px] font-bold" style={{ color: "var(--ink-900)" }}>
                {mode === "reschedule"
                  ? "Pourquoi souhaitez-vous décaler ce rendez-vous ?"
                  : "Indiquez la raison de l'annulation"}
              </div>
              <textarea
                value={note}
                onChange={(e) => onSetNote(e.target.value)}
                placeholder={t("notePlaceholder")}
                rows={3}
                maxLength={400}
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={{ background: "#fff", border: "1px solid var(--line-cool)" }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onSetMode(null);
                    onSetNote("");
                  }}
                  className="ds-btn ds-btn-ghost ds-btn-sm"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={saving}
                  className="ds-btn ds-btn-primary ds-btn-sm"
                >
                  {saving
                    ? "Envoi…"
                    : mode === "reschedule"
                    ? "Demander un report"
                    : "Confirmer l'annulation"}
                </button>
              </div>
            </div>
          )}

          {!canEdit && !isCancelled && (
            <p className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
              Ce rendez-vous ne peut plus être modifié (statut « {a.status} »).
            </p>
          )}

          <div className="pt-2 flex flex-wrap gap-2">
            <a
              href={`/medecin/${a.doctorSlug}`}
              className="ds-btn ds-btn-ghost ds-btn-sm"
              target="_blank"
              rel="noreferrer"
            >
              Voir le médecin
            </a>
            {!isVideo && a.doctorAddress && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(a.doctorAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="ds-btn ds-btn-ghost ds-btn-sm"
              >
                Itinéraire
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div
        className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
        style={{ color: "var(--ink-400)" }}
      >
        {label}
      </div>
      <div className="text-[13.5px] font-semibold" style={{ color: "var(--ink-900)" }}>
        {value}
      </div>
    </div>
  );
}

/* ───────── Calendar view ───────── */
function CalendarView({
  appointments,
  month,
  onPrev,
  onNext,
  onSelect,
}: {
  appointments: Appointment[];
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (a: Appointment) => void;
}) {
  const tCal = useTranslations("patient.mesRdv");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : fr;
  // Build a 6×7 grid starting on Monday
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const startWeekday = (start.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - startWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  const byDate = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const k = new Date(a.startsAt).toDateString();
    const list = byDate.get(k) ?? [];
    list.push(a);
    byDate.set(k, list);
  }

  return (
    <div className="ds-card-patient" style={{ padding: 16 }}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={onPrev} className="ds-btn ds-btn-ghost ds-btn-sm" aria-label={tCal("prevMonth")}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="font-bold text-[15px]" style={{ color: "var(--ink-900)" }}>
          {format(month, "MMMM yyyy", { locale: fr })}
        </div>
        <button type="button" onClick={onNext} className="ds-btn ds-btn-ghost ds-btn-sm" aria-label={tCal("nextMonth")}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--ink-400)" }}>
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const inMonth = isSameMonth(d, month);
          const today = isSameDay(d, new Date());
          const items = byDate.get(d.toDateString()) ?? [];
          return (
            <div
              key={i}
              className="rounded-lg min-h-[64px] p-1"
              style={{
                background: today ? "var(--primary-50)" : inMonth ? "#fff" : "var(--surface-2)",
                border: "1px solid var(--line-cool)",
                opacity: inMonth ? 1 : 0.55,
              }}
            >
              <div
                className="text-[11px] font-bold text-end mb-0.5"
                style={{ color: today ? "var(--primary-700)" : "var(--ink-700)" }}
              >
                {d.getDate()}
              </div>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 2).map((a) => {
                  const isVid = a.type === "teleconsult" || a.type === "teleconsultation";
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a)}
                      className="text-start text-[10.5px] font-semibold rounded px-1 py-0.5 truncate"
                      style={{
                        background: isVid ? "#E0F2FE" : "var(--primary-100)",
                        color: isVid ? "#075985" : "var(--primary-700)",
                      }}
                    >
                      {format(new Date(a.startsAt), "HH:mm")} {a.doctorName.replace(/^Dr\.?\s*/i, "")}
                    </button>
                  );
                })}
                {items.length > 2 && (
                  <div className="text-[10px]" style={{ color: "var(--ink-500)" }}>
                    +{items.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
