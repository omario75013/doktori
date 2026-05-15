"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  DoorOpen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  CalendarClock,
  Wrench,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Site {
  id: string;
  name: string;
  isPrimary: boolean;
}

interface Room {
  id: string;
  siteId: string;
  name: string;
  color: string;
  isActive: boolean;
  capacity: number;
  floor: string | null;
  equipmentNotes: string | null;
  status: string;
  lastCleanedAt: Date | string | null;
  createdAt: Date | string;
  todayBookings?: number;
}

const PRESET_COLORS = [
  "#2563eb", "#0891b2", "#059669", "#7c3aed",
  "#d97706", "#dc2626", "#db2777", "#65a30d",
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  maintenance: { label: "Maintenance", color: "text-amber-700 bg-amber-50 border-amber-200" },
  closed: { label: "Fermée", color: "text-red-700 bg-red-50 border-red-200" },
};

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
            value === c ? "border-gray-700 scale-110" : "border-transparent"
          }`}
          style={{ background: c }}
          title={c}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded-full border border-border p-0.5"
        title="Couleur personnalisée"
      />
    </div>
  );
}

function RoomModal({
  sites,
  initial,
  defaultSiteId,
  onClose,
  onSaved,
}: {
  sites: Site[];
  initial?: Room;
  defaultSiteId?: string;
  onClose: () => void;
  onSaved: (room: Room) => void;
}) {
  const [siteId, setSiteId] = useState(initial?.siteId ?? defaultSiteId ?? sites[0]?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#2563eb");
  const [capacity, setCapacity] = useState(initial?.capacity ?? 1);
  const [floor, setFloor] = useState(initial?.floor ?? "");
  const [equipmentNotes, setEquipmentNotes] = useState(initial?.equipmentNotes ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [lastCleanedAt, setLastCleanedAt] = useState(
    initial?.lastCleanedAt
      ? new Date(initial.lastCleanedAt).toISOString().slice(0, 16)
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!name.trim()) { setNameError("Le nom est requis."); return; }
    if (!siteId) { toast.error("Sélectionnez un site."); return; }
    setSaving(true);
    try {
      const payload = initial
        ? { name: name.trim(), color, capacity, floor: floor.trim() || null, equipmentNotes: equipmentNotes.trim() || null, status, lastCleanedAt: lastCleanedAt || null }
        : { siteId, name: name.trim(), color, capacity, floor: floor.trim() || null, equipmentNotes: equipmentNotes.trim() || null, status, lastCleanedAt: lastCleanedAt || null };

      const res = await fetch(
        initial ? `/api/clinique/rooms/${initial.id}` : "/api/clinique/rooms",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data: Room & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(initial ? "Salle mise à jour." : "Salle créée.");
      onSaved(data);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4 border border-border my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {initial ? "Modifier la salle" : "Nouvelle salle"}
          </h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!initial && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Site <span className="text-red-500">*</span>
              </label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Choisir un site…</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(null); }}
              className={`w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${nameError ? "border-red-400" : "border-border"}`}
              placeholder="Salle 1, Consultation A…"
            />
            {nameError && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {nameError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Capacité
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Étage / Emplacement
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="RDC, 1er…"
                className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Statut
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="closed">Fermée</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Équipements / Notes
            </label>
            <textarea
              value={equipmentNotes}
              onChange={(e) => setEquipmentNotes(e.target.value)}
              rows={2}
              placeholder="Stéthoscope, ECG, lit d'examen…"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Dernier nettoyage (optionnel)
            </label>
            <input
              type="datetime-local"
              value={lastCleanedAt}
              onChange={(e) => setLastCleanedAt(e.target.value)}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Couleur
            </label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary text-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold disabled:opacity-40 transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "text-gray-600 bg-gray-50 border-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${s.color}`}>
      {status === "active" ? (
        <CheckCircle2 className="h-2.5 w-2.5" />
      ) : status === "maintenance" ? (
        <Wrench className="h-2.5 w-2.5" />
      ) : (
        <XCircle className="h-2.5 w-2.5" />
      )}
      {s.label}
    </span>
  );
}

export function SallesClient({
  initialSites,
  initialRooms,
}: {
  initialSites: Site[];
  initialRooms: Room[];
}) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(initialSites[0]?.id ?? "");
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredRooms = selectedSiteId
    ? rooms.filter((r) => r.siteId === selectedSiteId)
    : rooms;

  function handleSaved(room: Room) {
    setRooms((prev) => {
      const idx = prev.findIndex((r) => r.id === room.id);
      if (idx === -1) return [...prev, room];
      return prev.map((r, i) => (i === idx ? room : r));
    });
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer la salle "${name}" ?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/clinique/rooms/${id}`, { method: "DELETE" });
      const data: { ok?: boolean; deactivated?: boolean; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      if (data.deactivated) {
        setRooms((prev) => prev.map((r) => r.id === id ? { ...r, isActive: false } : r));
        toast.info("Salle désactivée (des rendez-vous y sont associés).");
      } else {
        setRooms((prev) => prev.filter((r) => r.id !== id));
        toast.success("Salle supprimée.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setDeletingId(null);
    }
  }

  if (initialSites.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center bg-white">
        <DoorOpen className="mx-auto h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="mt-2 text-sm text-muted-foreground">
          Créez d&apos;abord un site dans <strong>Paramètres → Sites</strong>.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Site selector */}
      <div className="flex flex-wrap gap-2">
        {initialSites.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSiteId(s.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedSiteId === s.id
                ? "bg-primary text-white shadow-sm"
                : "bg-white border border-border text-foreground hover:bg-secondary"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Room cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className={`rounded-xl border bg-white p-4 space-y-3 ${!room.isActive ? "opacity-60" : ""}`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white text-lg font-black"
                  style={{ background: room.color }}
                >
                  {room.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{room.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <StatusBadge status={room.status} />
                    {!room.isActive && (
                      <span className="text-[10px] text-gray-400 font-medium">Désactivée</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setEditingRoom(room); setShowModal(true); }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-secondary transition-colors"
                  title="Modifier"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => handleDelete(room.id, room.name)}
                  disabled={deletingId === room.id}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Supprimer"
                >
                  {deletingId === room.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">Capacité :</span>{" "}
                {room.capacity} personne{room.capacity !== 1 ? "s" : ""}
              </div>
              {room.floor && (
                <div>
                  <span className="font-semibold text-foreground">Étage :</span>{" "}
                  {room.floor}
                </div>
              )}
              <div className="col-span-2 flex items-center gap-1">
                <CalendarClock className="h-3 w-3 shrink-0" />
                <span>
                  <span className="font-semibold text-foreground">{room.todayBookings ?? 0}</span>{" "}
                  RDV aujourd&apos;hui
                </span>
              </div>
              {room.equipmentNotes && (
                <div className="col-span-2 text-[11px] text-muted-foreground/80 line-clamp-2 italic">
                  {room.equipmentNotes}
                </div>
              )}
              {room.lastCleanedAt && (
                <div className="col-span-2 text-[10px] text-gray-400">
                  Dernier nettoyage :{" "}
                  {new Date(room.lastCleanedAt).toLocaleString("fr-TN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={() => { setEditingRoom(undefined); setShowModal(true); }}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-white"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Nouvelle salle
        </button>
      </div>

      {showModal && (
        <RoomModal
          sites={initialSites}
          initial={editingRoom}
          defaultSiteId={selectedSiteId}
          onClose={() => { setShowModal(false); setEditingRoom(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
