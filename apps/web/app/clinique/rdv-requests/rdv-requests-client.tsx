"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Phone,
  Mail,
  Calendar,
  Clock,
  XCircle,
  User,
  FileText,
} from "lucide-react";

interface ClinicDoctor {
  id: string;
  name: string;
  specialty: string;
}

interface RdvRequest {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  patientCin: string | null;
  motif: string | null;
  specialtyHint: string | null;
  preferredDate: string;
  preferredTimeRange: "morning" | "afternoon" | "evening" | "any";
  notes: string | null;
  status: "pending" | "assigned" | "fulfilled" | "cancelled";
  assignedDoctorId: string | null;
  assignedDoctorName: string | null;
  assignedAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
}

const TIME_LABELS = {
  morning: "Matin (08h-12h)",
  afternoon: "Après-midi (12h-17h)",
  evening: "Soir (17h-20h)",
  any: "Peu importe",
};

const STATUS_LABELS: Record<RdvRequest["status"], { label: string; color: string }> = {
  pending: { label: "À traiter", color: "bg-amber-100 text-amber-800" },
  assigned: { label: "Médecin assigné", color: "bg-blue-100 text-blue-800" },
  fulfilled: { label: "RDV programmé", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Annulée", color: "bg-gray-100 text-gray-600" },
};

export default function RdvRequestsClient({
  clinicDoctors: _clinicDoctors,
}: {
  clinicDoctors: ClinicDoctor[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState<RdvRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [assigning, setAssigning] = useState<string | null>(null);
  // Slot picker state — populated when admin opens the assign panel
  type DoctorSlot = {
    id: string;
    name: string;
    specialty: string;
    slots: { startTime: string; endTime: string }[];
  };
  const [slotsByRequest, setSlotsByRequest] = useState<Record<string, DoctorSlot[]>>({});
  const [slotsLoading, setSlotsLoading] = useState<Record<string, boolean>>({});
  const [slotDate, setSlotDate] = useState<Record<string, string>>({});

  async function fetchRequests() {
    setLoading(true);
    try {
      const url =
        filterStatus === "all"
          ? "/api/clinique/rdv-requests"
          : `/api/clinique/rdv-requests?status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  async function loadSlots(reqId: string, date: string, range: string) {
    setSlotsLoading((s) => ({ ...s, [reqId]: true }));
    try {
      const res = await fetch(
        `/api/clinique/rdv-requests/${reqId}/slots?date=${date}&range=${range}`,
      );
      if (res.ok) {
        const data = await res.json();
        setSlotsByRequest((s) => ({ ...s, [reqId]: data.doctors ?? [] }));
      }
    } finally {
      setSlotsLoading((s) => ({ ...s, [reqId]: false }));
    }
  }

  async function bookSlot(
    reqId: string,
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) {
    const res = await fetch(`/api/clinique/rdv-requests/${reqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        doctorId,
        date,
        startTime,
        endTime,
      }),
    });
    if (res.ok) {
      setAssigning(null);
      setSlotsByRequest((s) => {
        const next = { ...s };
        delete next[reqId];
        return next;
      });
      fetchRequests();
      // The new RDV is created with status='pending' (awaiting doctor
      // confirmation). Offer to navigate to the clinic rendez-vous list so
      // the user actually sees the new row (default date filter is "today").
      const view = confirm(
        `RDV créé pour le ${new Date(date).toLocaleDateString("fr-FR")} à ${startTime}.\n\nEn attente de confirmation du médecin.\n\nVoir dans la liste des RDV ?`,
      );
      if (view) {
        router.push(`/clinique/rendez-vous?date=&status=pending&doctorId=${doctorId}`);
      }
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Erreur lors de la réservation");
    }
  }

  async function doAction(
    id: string,
    action: "assign" | "fulfill" | "cancel",
    payload: Record<string, unknown> = {},
  ) {
    const res = await fetch(`/api/clinique/rdv-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    if (res.ok) {
      setAssigning(null);
      fetchRequests();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Erreur");
    }
  }

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-black text-foreground">
            Demandes de RDV
          </h1>
          <p className="text-sm text-muted-foreground">
            Les patients qui n&apos;ont pas choisi de médecin attendent votre
            assignation.
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["pending", "assigned", "fulfilled", "cancelled", "all"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={[
                "px-3 py-1.5 rounded-lg text-sm font-semibold border",
                filterStatus === s
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-foreground hover:bg-secondary",
              ].join(" ")}
            >
              {s === "all" ? "Toutes" : STATUS_LABELS[s].label}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucune demande {filterStatus !== "all" ? "dans cet état" : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const statusBadge = STATUS_LABELS[req.status];
            return (
              <div
                key={req.id}
                className="rounded-2xl border border-border bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-foreground">{req.patientName}</span>
                    {req.patientCin && (
                      <span className="text-xs text-muted-foreground">CIN: {req.patientCin}</span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge.color}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${req.patientPhone}`} className="hover:text-primary">
                      {req.patientPhone}
                    </a>
                  </div>
                  {req.patientEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${req.patientEmail}`} className="hover:text-primary truncate">
                        {req.patientEmail}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(req.preferredDate).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {TIME_LABELS[req.preferredTimeRange]}
                  </div>
                </div>

                {(req.motif || req.specialtyHint || req.notes) && (
                  <div className="rounded-xl bg-secondary p-3 text-sm text-foreground space-y-1 mb-3">
                    {req.specialtyHint && (
                      <p>
                        <strong>Spécialité souhaitée :</strong> {req.specialtyHint}
                      </p>
                    )}
                    {req.motif && (
                      <p>
                        <strong>Motif :</strong> {req.motif}
                      </p>
                    )}
                    {req.notes && (
                      <p className="flex items-start gap-1.5">
                        <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                        {req.notes}
                      </p>
                    )}
                  </div>
                )}

                {req.assignedDoctorName && (
                  <p className="text-sm text-blue-700 mb-3">
                    Assignée à <strong>{req.assignedDoctorName}</strong>
                  </p>
                )}
                {req.cancelledReason && (
                  <p className="text-sm text-gray-500 mb-3">
                    Raison : {req.cancelledReason}
                  </p>
                )}

                {(req.status === "pending" || req.status === "assigned") && (
                  <div className="border-t border-border pt-3">
                    {assigning === req.id ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs font-semibold text-foreground">Date :</label>
                          <input
                            type="date"
                            value={slotDate[req.id] ?? req.preferredDate}
                            onChange={(e) => {
                              setSlotDate((s) => ({ ...s, [req.id]: e.target.value }));
                              loadSlots(req.id, e.target.value, req.preferredTimeRange);
                            }}
                            className="h-9 px-2 rounded-lg border border-border bg-white text-sm"
                          />
                          <span className="text-xs text-muted-foreground">
                            Plage : {TIME_LABELS[req.preferredTimeRange]}
                          </span>
                          <button
                            onClick={() => {
                              setAssigning(null);
                              setSlotsByRequest((s) => {
                                const next = { ...s };
                                delete next[req.id];
                                return next;
                              });
                            }}
                            className="ml-auto h-9 px-3 rounded-lg border border-border text-sm hover:bg-secondary"
                          >
                            Fermer
                          </button>
                        </div>

                        {slotsLoading[req.id] ? (
                          <p className="text-sm text-muted-foreground">Chargement des créneaux…</p>
                        ) : (slotsByRequest[req.id] ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Aucun médecin chargé. Choisissez une date pour voir les créneaux disponibles.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {(slotsByRequest[req.id] ?? []).map((doc) => (
                              <div key={doc.id} className="rounded-xl border border-border p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="text-sm font-bold text-foreground">{doc.name}</p>
                                    <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {doc.slots.length} créneaux libres
                                  </span>
                                </div>
                                {doc.slots.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">
                                    Aucun créneau dans la plage demandée.
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {doc.slots.map((s) => (
                                      <button
                                        key={`${s.startTime}-${s.endTime}`}
                                        onClick={() =>
                                          bookSlot(
                                            req.id,
                                            doc.id,
                                            slotDate[req.id] ?? req.preferredDate,
                                            s.startTime,
                                            s.endTime,
                                          )
                                        }
                                        className="h-8 px-2.5 rounded-lg border border-border bg-white text-xs font-semibold hover:border-primary hover:bg-primary/5 hover:text-primary"
                                        title={`Réserver ${s.startTime} avec ${doc.name}`}
                                      >
                                        {s.startTime}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setAssigning(req.id);
                            setSlotDate((s) => ({ ...s, [req.id]: req.preferredDate }));
                            loadSlots(req.id, req.preferredDate, req.preferredTimeRange);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-doktori-teal-dark"
                        >
                          <User className="h-4 w-4" />
                          {req.status === "assigned" ? "Changer le créneau" : "Choisir médecin + créneau"}
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt("Raison de l'annulation ? (optionnel)") ?? "";
                            doAction(req.id, "cancel", { reason });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-secondary"
                        >
                          <XCircle className="h-4 w-4" /> Annuler
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* The slot-picker handles both pending + assigned via the
                    `(pending || assigned)` block above; no separate UI here. */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
