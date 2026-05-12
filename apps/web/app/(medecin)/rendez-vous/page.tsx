"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, CalendarPlus, X, Search, Phone, MessageSquare, UserCheck, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SMSModal } from "@/components/sms-modal";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  checkedInAt: string | null;
  practiceId: string | null;
  patientName: string;
  patientPhone: string;
  patientNoShowCount: number;
  patientLastMinuteCancelCount: number;
};

type Practice = {
  id: string;
  name: string;
  city: string;
  kind: "cabinet" | "clinic";
  isPrimary: boolean;
  isActive: boolean;
};

type PatientOption = {
  id: string;
  name: string;
  phone: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-secondary text-primary",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
};

const TERMINAL_STATUSES = ["cancelled", "completed", "no_show"];

// ─── New appointment modal ────────────────────────────────────────────────────

function NewAppointmentModal({
  onClose,
  onCreated,
  prefillPatientId,
  prefillPatientName,
}: {
  onClose: () => void;
  onCreated: () => void;
  // When set (deep-linked from a referral), the modal auto-selects this
  // patient — even if /api/doctor/patients doesn't list them yet (the
  // doctor has no prior appointments with them). Synthetic option is
  // prepended to patientOptions so the picker can highlight it.
  prefillPatientId?: string;
  prefillPatientName?: string;
}) {
  const t = useTranslations("medecin.appointments");
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>(
    prefillPatientId && prefillPatientName
      ? [{ id: prefillPatientId, name: prefillPatientName, phone: "" }]
      : [],
  );
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(prefillPatientId ?? "");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [type, setType] = useState<"cabinet" | "teleconsult" | "domicile">("cabinet");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/doctor/patients")
      .then((r) => r.json())
      .then((data: PatientOption[]) => {
        const list = Array.isArray(data) ? data : [];
        // Make sure the prefill patient stays in the list when the
        // doctor has no prior appointments with them (referral case).
        if (
          prefillPatientId &&
          prefillPatientName &&
          !list.some((p) => p.id === prefillPatientId)
        ) {
          list.unshift({ id: prefillPatientId, name: prefillPatientName, phone: "" });
        }
        setPatientOptions(list);
      })
      .catch(() => {
        if (prefillPatientId && prefillPatientName) {
          setPatientOptions([{ id: prefillPatientId, name: prefillPatientName, phone: "" }]);
        } else {
          setPatientOptions([]);
        }
      })
      .finally(() => setPatientsLoading(false));
  }, [prefillPatientId, prefillPatientName]);

  const filteredPatients = patientOptions.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedPatientId) {
      setError(t("selectPatientError"));
      return;
    }
    setSubmitting(true);
    try {
      const startsAt = new Date(`${date}T${startTime}:00`);
      const res = await fetch("/api/doctor/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          startsAt: startsAt.toISOString(),
          type,
          reason: reason.trim() || undefined,
        }),
      });
      // Server may return a non-JSON error page on a 500. Read as text
      // first so the error UI never crashes on Response.json() parse.
      const raw = await res.text();
      let data: { error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw.slice(0, 200) || `HTTP ${res.status}` };
      }
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création");
      toast.success(t("createdSuccess"));
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 space-y-4 border border-border max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{t("newModalTitle")}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Patient <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder={t("searchPatientPlaceholder")}
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
              />
            </div>
            {patientsLoading ? (
              <p className="text-xs text-gray-400">{t("loadingPatients")}</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {filteredPatients.length === 0 ? (
                  <p className="p-3 text-xs text-gray-400 text-center">{t("noPatientFound")}</p>
                ) : (
                  filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        selectedPatientId === p.id
                          ? "bg-primary text-white"
                          : "hover:bg-secondary text-foreground"
                      }`}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-2 text-xs opacity-70">{p.phone}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Heure <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              {t("consultationType")}
            </label>
            <div className="flex gap-2">
              {(["cabinet", "teleconsult", "domicile"] as const).map((typeOpt) => (
                <button
                  key={typeOpt}
                  type="button"
                  onClick={() => setType(typeOpt)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    type === typeOpt
                      ? "bg-primary text-white border-primary"
                      : "border-border text-gray-600 hover:bg-secondary"
                  }`}
                >
                  {typeOpt === "cabinet" ? t("typeOffice") : typeOpt === "teleconsult" ? t("typeTeleconsult") : t("typeHome")}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              {t("reasonLabel")}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary text-gray-600 dark:text-gray-400 transition-colors"
            >
              {t("cancelButton")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold disabled:opacity-40 transition-colors"
            >
              {submitting ? t("creatingButton") : t("createButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RendezVousPage() {
  const t = useTranslations("medecin.appointments");
  const tStatus = useTranslations("medecin.appointments.status");

  const STATUS_LABELS: Record<string, string> = {
    pending: tStatus("pending"),
    confirmed: tStatus("confirmed"),
    cancelled: tStatus("cancelled"),
    completed: tStatus("completed"),
    no_show: tStatus("no_show"),
    cancel_requested: "Annulation demandée",
    reschedule_requested: "Report demandé",
  };

  async function respondRequest(appt: Appointment, action: "accept" | "decline") {
    try {
      setUpdating(appt.id);
      const res = await fetch(`/api/appointments/${appt.id}/respond-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) await fetchAppointments();
    } finally {
      setUpdating(null);
    }
  }

  const ACTIONS: { status: string; label: string }[] = [
    { status: "confirmed", label: t("actionConfirm") },
    { status: "completed", label: t("actionComplete") },
    { status: "no_show", label: t("actionNoShow") },
  ];

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [cabinetFilter, setCabinetFilter] = useState<string>("all"); // "all" | practiceId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showNewRdvModal, setShowNewRdvModal] = useState(false);
  const [prefillPatientId, setPrefillPatientId] = useState<string | undefined>(undefined);
  const [prefillPatientName, setPrefillPatientName] = useState<string | undefined>(undefined);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Referrals → "Accepter et prendre RDV" lands here with
  // ?newRdvFor=<patientId>&newRdvName=<name>. Open the modal pre-filled
  // and strip the query string so a back-nav doesn't re-open it.
  useEffect(() => {
    const pid = searchParams.get("newRdvFor");
    const pname = searchParams.get("newRdvName");
    if (pid && pname) {
      setPrefillPatientId(pid);
      setPrefillPatientName(pname);
      setShowNewRdvModal(true);
      router.replace("/rendez-vous", { scroll: false });
    }
  }, [searchParams, router]);

  // CNAM modal state
  const [cnamDialogAppointmentId, setCnamDialogAppointmentId] = useState<string | null>(null);
  const [cnamNumber, setCnamNumber] = useState("");
  const [cnamAmount, setCnamAmount] = useState("40");
  const [cnamError, setCnamError] = useState<string | null>(null);

  // Followup modal state
  const [followupDialogId, setFollowupDialogId] = useState<string | null>(null);
  const [followupWeeks, setFollowupWeeks] = useState("4");
  const [followupError, setFollowupError] = useState<string | null>(null);

  // Cancel modal state
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // SMS modal state
  const [smsAppt, setSmsAppt] = useState<Appointment | null>(null);
  // Edit modal state
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = cabinetFilter === "all" ? "" : `?practiceId=${cabinetFilter}`;
      const res = await fetch(`/api/appointments/doctor${qs}`);
      if (!res.ok) throw new Error(t("retry"));
      const data: Appointment[] = await res.json();
      setAppointments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }, [cabinetFilter, t]);

  useEffect(() => {
    fetchAppointments();
    // Poll every 20s + on tab focus so new bookings and patient cancellations
    // surface without the doctor having to refresh. Aligned with the other
    // doctor surfaces (dashboard today-summary 15s, calendrier 30s).
    const iv = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        fetchAppointments();
      }
    }, 20_000);
    const onFocus = () => fetchAppointments();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAppointments]);

  // Load cabinets once for tabs
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/doctor/practices");
        if (res.ok) {
          const data: Practice[] = await res.json();
          setPractices(data.filter((p) => p.isActive));
        }
      } catch {
        /* ignore — tabs are optional */
      }
    })();
  }, []);

  // Sync cabinet filter with URL (?cabinet=all|<uuid>) for deep-linking.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("cabinet");
    if (fromUrl && fromUrl !== cabinetFilter) setCabinetFilter(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCabinet = (id: string) => {
    setCabinetFilter(id);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (id === "all") params.delete("cabinet");
      else params.set("cabinet", id);
      const qs = params.toString();
      const url = qs ? `?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", url);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur mise à jour");
      }
      toast.success(t("statusUpdated"));
      await fetchAppointments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("updateError"));
    } finally {
      setUpdating(null);
    }
  };

  const toggleCheckin = async (appt: Appointment) => {
    const method = appt.checkedInAt ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/doctor/appointments/${appt.id}/checkin`, { method });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur enregistrement");
      }
      const data = await res.json();
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appt.id ? { ...a, checkedInAt: data.checkedInAt ?? null } : a
        )
      );
      toast.success(appt.checkedInAt ? t("checkInCancelled") : t("checkInSuccess"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("error"));
    }
  };

  const openCnamDialog = (id: string) => {
    setCnamDialogAppointmentId(id);
    setCnamNumber("");
    setCnamAmount("40");
    setCnamError(null);
  };

  const submitCnamClaim = async () => {
    const id = cnamDialogAppointmentId;
    if (!id) return;
    if (!cnamNumber.trim()) {
      setCnamError(t("cnamNumberRequired"));
      return;
    }
    const amountDt = Number(cnamAmount);
    if (!Number.isFinite(amountDt) || amountDt < 1) {
      setCnamError(t("cnamAmountInvalid"));
      return;
    }
    setCnamError(null);
    setCnamDialogAppointmentId(null);
    setUpdating(id);
    try {
      const res = await fetch("/api/cnam/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: id,
          cnamNumber: cnamNumber.trim(),
          amount: Math.round(amountDt * 1000),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t("cnamBordereuError"));
      }
      const claim = await res.json();
      toast.success(t("cnamBordereuCreated"));
      window.open(`/cnam/${claim.id}/print`, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("cnamBordereuError"));
    } finally {
      setUpdating(null);
    }
  };

  const openFollowupDialog = (id: string) => {
    setFollowupDialogId(id);
    setFollowupWeeks("4");
    setFollowupError(null);
  };

  const submitFollowup = async () => {
    const id = followupDialogId;
    if (!id) return;
    const weeks = Number(followupWeeks);
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 104) {
      setFollowupError(t("followupWeeksError"));
      return;
    }
    setFollowupError(null);
    setUpdating(id);
    try {
      const res = await fetch(`/api/appointments/${id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur programmation");
      }
      toast.success(t("followupScheduled", { weeks, s: weeks > 1 ? "s" : "" }));
      setFollowupDialogId(null);
    } catch (e) {
      setFollowupError(e instanceof Error ? e.message : t("error"));
    } finally {
      setUpdating(null);
    }
  };

  const openCancelDialog = (id: string) => {
    setCancelDialogId(id);
    setCancelReason("");
    setCancelError(null);
  };

  const submitCancel = async () => {
    const id = cancelDialogId;
    if (!id) return;
    setCancelError(null);
    setCancelSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${id}/cancel-doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de l'annulation");
      }
      toast.success(t("appointmentCancelled"));
      setCancelDialogId(null);
      await fetchAppointments();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : t("error"));
    } finally {
      setCancelSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-6" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border bg-white dark:bg-gray-900 p-4"
          >
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-secondary" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
            </div>
            <div className="h-8 w-24 shrink-0 animate-pulse rounded-lg bg-secondary" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={fetchAppointments}
          className="text-sm text-primary hover:underline"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewRdvModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white text-sm font-medium transition-colors shadow-sm"
          >
            <CalendarPlus className="h-4 w-4" />
            {t("newButton")}
          </button>
          <button
            onClick={fetchAppointments}
            className="text-sm text-primary hover:text-doktori-teal-dark font-medium border border-border hover:bg-secondary rounded-xl px-3 py-2 transition-colors"
          >
            {t("refresh")}
          </button>
        </div>
      </div>

      {/* Cabinet tabs — always visible if ≥1 cabinet */}
      {practices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCabinet("all")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              cabinetFilter === "all"
                ? "bg-primary text-white shadow-sm"
                : "bg-white border border-border text-foreground hover:bg-secondary"
            }`}
          >
            {t("allPractices")}
          </button>
          {practices.map((p) => (
            <button
              key={p.id}
              onClick={() => setCabinet(p.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                cabinetFilter === p.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-border text-foreground hover:bg-secondary"
              }`}
            >
              {p.name}
              {p.kind === "clinic" && (
                <span
                  className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                    cabinetFilter === p.id
                      ? "bg-white/20 text-white"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {t("clinicBadge")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="ds-card p-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Calendar className="h-7 w-7 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">{t("noAppointments")}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("noAppointmentsDesc")}</p>
        </div>
      ) : (
        <div className="ds-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-left">
                <th className="px-4 py-3 font-medium text-foreground">{t("colDate")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("colPatient")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("colPhone")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("colMotif")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("colStatus")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {appointments.map((appt) => {
                const isTerminal = TERMINAL_STATUSES.includes(appt.status);
                const isUpdating = updating === appt.id;
                return (
                  <tr key={appt.id} className="hover:bg-secondary transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {format(new Date(appt.startsAt), "EEE d MMM yyyy HH:mm", { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{appt.patientName}</span>
                        {appt.patientNoShowCount >= 2 && (
                          <span
                            className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700"
                            title={t("noShowsTooltip", { count: appt.patientNoShowCount })}
                          >
                            ⚠ {appt.patientNoShowCount}
                          </span>
                        )}
                        {appt.patientLastMinuteCancelCount >= 2 && (
                          <span
                            className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700"
                            title={t("lastMinuteCancelsTooltip", { count: appt.patientLastMinuteCancelCount })}
                          >
                            {t("lastMinuteCancelsLabel", { count: appt.patientLastMinuteCancelCount })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${appt.patientPhone}`}
                          title={t("callPatientTooltip", { name: appt.patientName })}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          title={t("sendSMSTooltip")}
                          onClick={() => setSmsAppt(appt)}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{appt.patientPhone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {appt.reason ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          STATUS_STYLES[appt.status] ?? "bg-gray-100"
                        }`}
                      >
                        {STATUS_LABELS[appt.status] ?? appt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isTerminal ? (
                        appt.status === "completed" ? (
                          <div className="flex gap-1.5 flex-wrap">
                            <a
                              href={`/rendez-vous/${appt.id}/consultation`}
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                            >
                              {t("soapNote")}
                            </a>
                            <button
                              onClick={() => openFollowupDialog(appt.id)}
                              disabled={isUpdating}
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                            >
                              {t("scheduleFollowup")}
                            </button>
                            <button
                              onClick={() => openCnamDialog(appt.id)}
                              disabled={isUpdating}
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-border bg-secondary text-primary hover:bg-border disabled:opacity-40 transition-colors"
                            >
                              {t("cnamBordereau")}
                            </button>
                            <a
                              href={`/api/appointments/${appt.id}/calendar`}
                              title={t("addToCalendarTooltip")}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border border-border bg-secondary text-primary hover:bg-border transition-colors"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                              .ics
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )
                      ) : (
                        <div className="flex gap-1.5 flex-wrap">
                          {appt.status === "confirmed" && (
                            <button
                              onClick={() => toggleCheckin(appt)}
                              title={appt.checkedInAt ? t("cancelArrivalTooltip") : t("markArrivedTooltip")}
                              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition-colors ${
                                appt.checkedInAt
                                  ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
                                  : "border-green-300 text-green-700 hover:bg-green-50"
                              }`}
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              {appt.checkedInAt
                                ? t("arrivedAtTime", { time: format(new Date(appt.checkedInAt), "HH:mm") })
                                : t("arrived")}
                            </button>
                          )}
                          {/* Patient-initiated cancel/reschedule requests
                              short-circuit the normal action row: doctor
                              decides Accept (→ apply) or Decline (→ revert
                              to confirmed) via /respond-request. */}
                          {(appt.status === "cancel_requested" ||
                            appt.status === "reschedule_requested") ? (
                            <>
                              <button
                                disabled={isUpdating}
                                onClick={() => respondRequest(appt, "accept")}
                                className="text-xs px-2.5 py-1.5 rounded-xl border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors font-medium"
                              >
                                {appt.status === "cancel_requested"
                                  ? "Accepter l'annulation"
                                  : "Accepter le report"}
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => respondRequest(appt, "decline")}
                                className="text-xs px-2.5 py-1.5 rounded-xl border border-border hover:bg-secondary disabled:opacity-40 transition-colors"
                              >
                                Refuser
                              </button>
                            </>
                          ) : (
                            ACTIONS.filter((a) => a.status !== appt.status).map((action) => (
                              <button
                                key={action.status}
                                disabled={isUpdating}
                                onClick={() => updateStatus(appt.id, action.status)}
                                className="text-xs px-2.5 py-1.5 rounded-xl border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                {isUpdating ? "..." : action.label}
                              </button>
                            ))
                          )}
                          {!isTerminal && (
                            <button
                              onClick={() => setEditAppt(appt)}
                              title={t("editModalTitle")}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t("editButton")}
                            </button>
                          )}
                          <a
                            href={`/api/appointments/${appt.id}/calendar`}
                            title={t("addToCalendarTooltip")}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border border-border bg-secondary text-primary hover:bg-border transition-colors"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                            .ics
                          </a>
                          {["pending", "confirmed"].includes(appt.status) && (
                            <button
                              disabled={isUpdating}
                              onClick={() => openCancelDialog(appt.id)}
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {t("cancel")}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New appointment modal */}
      {showNewRdvModal && (
        <NewAppointmentModal
          onClose={() => {
            setShowNewRdvModal(false);
            setPrefillPatientId(undefined);
            setPrefillPatientName(undefined);
          }}
          onCreated={fetchAppointments}
          prefillPatientId={prefillPatientId}
          prefillPatientName={prefillPatientName}
        />
      )}

      {/* Followup modal */}
      {followupDialogId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setFollowupDialogId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 space-y-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-foreground">{t("followupTitle")}</h2>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                {t("followupWeeks")}
              </label>
              <input
                type="number"
                min="1"
                max="104"
                value={followupWeeks}
                onChange={(e) => setFollowupWeeks(e.target.value)}
                className="w-full h-12 rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">{t("followupNote")}</p>
            </div>

            {followupError && (
              <p className="text-sm text-red-600">{followupError}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setFollowupDialogId(null)}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary text-gray-600 dark:text-gray-400 transition-colors"
              >
                {t("cancelKeep")}
              </button>
              <button
                onClick={submitFollowup}
                disabled={updating === followupDialogId}
                className="px-4 py-2 text-sm rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold disabled:opacity-40 transition-colors"
              >
                {updating === followupDialogId ? "..." : t("cancelConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelDialogId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !cancelSubmitting && setCancelDialogId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 space-y-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-foreground">{t("cancelTitle")}</h2>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                {t("cancelReason")}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t("cancelReasonPlaceholder")}
                rows={3}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                autoFocus
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">{t("cancelNote")}</p>
            </div>

            {cancelError && (
              <p className="text-sm text-red-600">{cancelError}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setCancelDialogId(null)}
                disabled={cancelSubmitting}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary text-gray-600 dark:text-gray-400 disabled:opacity-40 transition-colors"
              >
                {t("cancelKeep")}
              </button>
              <button
                onClick={submitCancel}
                disabled={cancelSubmitting}
                className="px-4 py-2 text-sm rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-40 transition-colors"
              >
                {cancelSubmitting ? t("cancelConfirming") : t("cancelConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMS modal */}
      {smsAppt && (
        <SMSModal
          patientPhone={smsAppt.patientPhone}
          patientName={smsAppt.patientName}
          appointmentId={smsAppt.id}
          appointmentDate={format(new Date(smsAppt.startsAt), "d MMMM yyyy", { locale: fr })}
          appointmentTime={format(new Date(smsAppt.startsAt), "HH:mm")}
          onClose={() => setSmsAppt(null)}
        />
      )}

      {/* Edit appointment modal */}
      {editAppt && (
        <EditAppointmentModal
          appointment={editAppt}
          onClose={() => setEditAppt(null)}
          onSaved={async () => {
            setEditAppt(null);
            await fetchAppointments();
          }}
        />
      )}

      {/* CNAM modal */}
      {cnamDialogAppointmentId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setCnamDialogAppointmentId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 space-y-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-foreground">{t("cnamTitle")}</h2>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                {t("cnamNumber")}
              </label>
              <input
                type="text"
                value={cnamNumber}
                onChange={(e) => setCnamNumber(e.target.value)}
                placeholder="Ex : 12345678"
                className="w-full h-12 rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                {t("cnamAmount")}
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={cnamAmount}
                onChange={(e) => setCnamAmount(e.target.value)}
                className="w-full h-12 rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {cnamError && (
              <p className="text-sm text-red-600">{cnamError}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setCnamDialogAppointmentId(null)}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary text-gray-600 dark:text-gray-400 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={submitCnamClaim}
                className="px-4 py-2 text-sm rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold transition-colors"
              >
                {t("cnamCreate")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit appointment modal ───────────────────────────────────────────────────

function EditAppointmentModal({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: Appointment;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const t = useTranslations("medecin.appointments");
  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(start, "HH:mm"));
  const [endTime, setEndTime] = useState(format(end, "HH:mm"));
  const [type, setType] = useState<"cabinet" | "teleconsult" | "domicile">(
    (appointment.type as "cabinet" | "teleconsult" | "domicile") ?? "cabinet"
  );
  const [reason, setReason] = useState(appointment.reason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const newStart = new Date(`${date}T${startTime}:00`);
    const newEnd = new Date(`${date}T${endTime}:00`);
    if (newEnd <= newStart) {
      setError(t("endTimeMustBeAfterStart"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: newStart.toISOString(),
          endsAt: newEnd.toISOString(),
          type,
          reason: reason.trim() === "" ? null : reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("updateError"));
      toast.success(t("updatedSuccess"));
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4 border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {t("editModalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-secondary"
            aria-label={t("closeBtnLabel")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-gray-500">
          {t("patientLabel")} <span className="font-medium text-foreground">{appointment.patientName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t("dateLabel")}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t("startLabel")}</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t("endLabel")}</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t("typeLabel")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="cabinet">{t("editTypeOffice")}</option>
              <option value="teleconsult">{t("editTypeTeleconsult")}</option>
              <option value="domicile">{t("editTypeHome")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t("reasonFieldLabel")}</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder={t("reasonFieldPlaceholder")}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              {t("editCancelButton")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? t("savingButton") : t("saveButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
