"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { fr, ar as arLocale } from "date-fns/locale";
import { Calendar, CalendarPlus, X, Search, Phone, MessageSquare, UserCheck } from "lucide-react";
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
  patientName: string;
  patientPhone: string;
  patientId: string;
  patientNoShowCount: number;
  patientLastMinuteCancelCount: number;
};

type PatientOption = {
  id: string;
  name: string;
  phone: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-teal-50 text-teal-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
};

const TERMINAL_STATUSES = ["cancelled", "completed", "no_show"];

// ─── New appointment modal ────────────────────────────────────────────────────

function NewAppointmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations("secretaire.rendezVous");
  const locale = useLocale();
  const dateFnsLocale = locale === "ar" ? arLocale : fr;
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [type, setType] = useState<"cabinet" | "teleconsult" | "domicile">("cabinet");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/secretaire/patients")
      .then((r) => r.json())
      .then((data: PatientOption[]) => setPatientOptions(Array.isArray(data) ? data : []))
      .catch(() => setPatientOptions([]))
      .finally(() => setPatientsLoading(false));
  }, []);

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("createRdv"));
      toast.success(t("createRdv"));
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("selectPatientError"));
    } finally {
      setSubmitting(false);
    }
  }

  const typeLabels: Record<string, string> = {
    cabinet: t("cabinet"),
    teleconsult: t("teleconsult"),
    domicile: t("domicile"),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 space-y-4 border border-border max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{t("modalTitle")}</h2>
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
              {t("patient")} <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder={t("searchPatient")}
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
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
                          ? "text-white"
                          : "hover:bg-secondary text-foreground"
                      }`}
                      style={selectedPatientId === p.id ? { background: "#0891B2" } : undefined}
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
                {t("date")} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                {t("time")} <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              {t("consultationType")}
            </label>
            <div className="flex gap-2">
              {(["cabinet", "teleconsult", "domicile"] as const).map((typeKey) => (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setType(typeKey)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    type === typeKey
                      ? "text-white border-transparent"
                      : "border-border text-gray-600 hover:bg-secondary"
                  }`}
                  style={type === typeKey ? { background: "#0891B2" } : undefined}
                >
                  {typeLabels[typeKey]}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              {t("reason")} <span className="text-gray-300 font-normal normal-case">{t("reasonOptional")}</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex : Suivi tension, douleurs abdominales…"
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary text-gray-600 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-xl text-white font-bold disabled:opacity-40 transition-colors"
              style={{ background: "#0891B2" }}
            >
              {submitting ? t("creating") : t("createRdv")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SecretaireRendezVousPage() {
  const t = useTranslations("secretaire.rendezVous");
  const locale = useLocale();
  const dateFnsLocale = locale === "ar" ? arLocale : fr;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showNewRdvModal, setShowNewRdvModal] = useState(false);
  const [smsAppt, setSmsAppt] = useState<Appointment | null>(null);

  const STATUS_LABELS: Record<string, string> = {
    pending: t("statusPending"),
    confirmed: t("statusConfirmed"),
    cancelled: t("statusCancelled"),
    completed: t("statusCompleted"),
    no_show: t("statusNoShow"),
  };

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/secretaire/appointments");
      if (!res.ok) throw new Error(t("noAppointments"));
      const data: Appointment[] = await res.json();
      setAppointments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("noAppointments"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/secretaire/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t("noAppointments"));
      }
      toast.success(t("statusConfirmed"));
      await fetchAppointments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("noAppointments"));
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
        throw new Error(data.error ?? t("noAppointments"));
      }
      const data = await res.json();
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appt.id ? { ...a, checkedInAt: data.checkedInAt ?? null } : a
        )
      );
      toast.success(appt.checkedInAt ? t("statusCancelled") : t("statusConfirmed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("noAppointments"));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-6" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border bg-white p-4"
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
        <button onClick={fetchAppointments} className="text-sm text-primary hover:underline">
          {t("refresh")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: "#F0FDFA" }}
          >
            <Calendar className="h-5 w-5" style={{ color: "#0891B2" }} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewRdvModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors shadow-sm"
            style={{ background: "#0891B2" }}
          >
            <CalendarPlus className="h-4 w-4" />
            {t("newRdv")}
          </button>
          <button
            onClick={fetchAppointments}
            className="text-sm font-medium border border-border hover:bg-secondary rounded-xl px-3 py-2 transition-colors text-foreground"
          >
            {t("refresh")}
          </button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "#F0FDFA" }}
          >
            <Calendar className="h-7 w-7" style={{ color: "#0891B2" }} />
          </div>
          <p className="text-foreground font-medium mb-1">{t("noAppointments")}</p>
          <p className="text-sm text-gray-400">{t("scheduleEmpty")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-start">
                <th className="px-4 py-3 font-medium text-foreground">{t("colDate")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("colPatient")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("colPhone")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("colReason")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("colStatus")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {appointments.map((appt) => {
                const isTerminal = TERMINAL_STATUSES.includes(appt.status);
                const isUpdating = updating === appt.id;

                return (
                  <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {format(new Date(appt.startsAt), "EEE d MMM yyyy HH:mm", { locale: dateFnsLocale })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{appt.patientName}</span>
                        {appt.patientNoShowCount >= 2 && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            ⚠ {appt.patientNoShowCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${appt.patientPhone}`}
                          title={`Appeler ${appt.patientName}`}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          title="Envoyer un SMS"
                          onClick={() => setSmsAppt(appt)}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs text-gray-500" dir="ltr">{appt.patientPhone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
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
                        <span className="text-xs text-gray-300">—</span>
                      ) : (
                        <div className="flex gap-1.5 flex-wrap">
                          {appt.status === "confirmed" && (
                            <button
                              onClick={() => toggleCheckin(appt)}
                              title={appt.checkedInAt ? "Annuler l'arrivée" : "Marquer comme arrivé(e)"}
                              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition-colors ${
                                appt.checkedInAt
                                  ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
                                  : "border-green-300 text-green-700 hover:bg-green-50"
                              }`}
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              {appt.checkedInAt
                                ? `${t("statusConfirmed")} ${format(new Date(appt.checkedInAt), "HH:mm")}`
                                : t("statusConfirmed")}
                            </button>
                          )}
                          {appt.status !== "confirmed" && (
                            <button
                              disabled={isUpdating}
                              onClick={() => updateStatus(appt.id, "confirmed")}
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-border hover:bg-secondary disabled:opacity-40 transition-colors"
                            >
                              {isUpdating ? "…" : t("confirm")}
                            </button>
                          )}
                          <button
                            disabled={isUpdating}
                            onClick={() => updateStatus(appt.id, "no_show")}
                            className="text-xs px-2.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          >
                            {isUpdating ? "…" : t("absent")}
                          </button>
                          <button
                            disabled={isUpdating}
                            onClick={() => updateStatus(appt.id, "cancelled")}
                            className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                          >
                            {isUpdating ? "…" : t("cancel")}
                          </button>
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
          onClose={() => setShowNewRdvModal(false)}
          onCreated={fetchAppointments}
        />
      )}

      {/* SMS modal */}
      {smsAppt && (
        <SMSModal
          patientPhone={smsAppt.patientPhone}
          patientName={smsAppt.patientName}
          appointmentId={smsAppt.id}
          appointmentDate={format(new Date(smsAppt.startsAt), "d MMMM yyyy", { locale: dateFnsLocale })}
          appointmentTime={format(new Date(smsAppt.startsAt), "HH:mm")}
          onClose={() => setSmsAppt(null)}
        />
      )}
    </div>
  );
}
