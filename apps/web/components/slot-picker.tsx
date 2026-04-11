"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface Props {
  doctorId: string;
  typeId?: string;
  onSelect: (date: string, startTime: string) => void;
}

export function SlotPicker({ doctorId, typeId, onSelect }: Props) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      value: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE d MMM", { locale: fr }),
    };
  });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ doctorId, date: selectedDate });
    if (typeId) params.set("typeId", typeId);
    fetch(`/api/appointments?${params.toString()}`)
      .then((r) => r.json())
      .then((data: Slot[]) => {
        setSlots(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [doctorId, selectedDate, typeId]);

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {dates.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDate(d.value)}
            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap border transition-colors ${
              selectedDate === d.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8 text-sm">Chargement...</p>
      ) : availableSlots.length === 0 ? (
        <p className="text-gray-400 text-center py-8 text-sm">
          Aucun créneau disponible ce jour
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {availableSlots.map((slot) => (
            <Button
              key={slot.startTime}
              variant="outline"
              onClick={() => onSelect(selectedDate, slot.startTime)}
              className="text-sm"
            >
              {slot.startTime}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
