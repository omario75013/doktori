"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Mail, MessageSquare, Smartphone, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Prefs {
  emailAppointments: boolean;
  emailMarketing: boolean;
  emailNews: boolean;
  smsAppointments: boolean;
  smsReminders: boolean;
  smsOtp: boolean;
  pushAppointments: boolean;
  pushMessages: boolean;
  reminderOffsetHours: number;
}

const DEFAULT: Prefs = {
  emailAppointments: true,
  emailMarketing: false,
  emailNews: false,
  smsAppointments: true,
  smsReminders: true,
  smsOtp: true,
  pushAppointments: true,
  pushMessages: true,
  reminderOffsetHours: 24,
};

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 py-3 cursor-pointer">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="text-xs text-foreground/60 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function NotificationPrefsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.replace("/mes-rdv");
      return;
    }
    setToken(stored);
  }, [router]);

  const load = useCallback(
    async (t: string) => {
      setLoading(true);
      try {
        const res = await fetch("/api/me/notification-prefs", {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("doktori_patient_token");
          router.replace("/mes-rdv");
          return;
        }
        const data = await res.json();
        setPrefs({
          emailAppointments: !!data.emailAppointments,
          emailMarketing: !!data.emailMarketing,
          emailNews: !!data.emailNews,
          smsAppointments: !!data.smsAppointments,
          smsReminders: !!data.smsReminders,
          smsOtp: !!data.smsOtp,
          pushAppointments: !!data.pushAppointments,
          pushMessages: !!data.pushMessages,
          reminderOffsetHours: data.reminderOffsetHours ?? 24,
        });
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  function update<K extends keyof Prefs>(k: K, v: Prefs[K]) {
    setPrefs((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    const res = await fetch("/api/me/notification-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    if (res.ok) toast.success("Préférences enregistrées");
    else toast.error("Erreur lors de l'enregistrement");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary/40">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-primary to-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Préférences de notifications</h1>
            <p className="text-white/70 text-xs mt-0.5">
              Choisissez comment Doktori vous contacte
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Email</h2>
          </div>
          <div className="divide-y divide-border">
            <Toggle
              label="Confirmations & rappels de RDV"
              description="Reçus à la prise et avant chaque rendez-vous."
              checked={prefs.emailAppointments}
              onChange={(v) => update("emailAppointments", v)}
            />
            <Toggle
              label="Offres et promotions"
              description="Nouveaux services, codes promo, parrainage."
              checked={prefs.emailMarketing}
              onChange={(v) => update("emailMarketing", v)}
            />
            <Toggle
              label="Actualités santé"
              description="Articles, conseils prévention, campagnes santé publique."
              checked={prefs.emailNews}
              onChange={(v) => update("emailNews", v)}
            />
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">SMS</h2>
          </div>
          <div className="divide-y divide-border">
            <Toggle
              label="Confirmations de RDV"
              checked={prefs.smsAppointments}
              onChange={(v) => update("smsAppointments", v)}
            />
            <Toggle
              label="Rappels avant RDV"
              checked={prefs.smsReminders}
              onChange={(v) => update("smsReminders", v)}
            />
            <Toggle
              label="Codes de connexion (OTP)"
              description="Désactiver bloque la connexion par téléphone."
              checked={prefs.smsOtp}
              onChange={(v) => update("smsOtp", v)}
            />
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Notifications push</h2>
          </div>
          <div className="divide-y divide-border">
            <Toggle
              label="Mises à jour de RDV"
              checked={prefs.pushAppointments}
              onChange={(v) => update("pushAppointments", v)}
            />
            <Toggle
              label="Nouveaux messages"
              checked={prefs.pushMessages}
              onChange={(v) => update("pushMessages", v)}
            />
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-3">Délai des rappels</h2>
          <p className="text-xs text-foreground/60 mb-3">
            Recevez un rappel cet intervalle avant chaque RDV.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[2, 12, 24, 48].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => update("reminderOffsetHours", h)}
                className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  prefs.reminderOffsetHours === h
                    ? "bg-primary text-white border-primary"
                    : "bg-white dark:bg-gray-800 border-border text-foreground hover:border-primary/40"
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </section>

        <Button
          onClick={save}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark font-bold text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
