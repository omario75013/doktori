"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  Lock,
  ShieldCheck,
  MessageSquare,
  Mail,
  Smartphone,
  KeyRound,
  QrCode,
  AlertTriangle,
  Copy,
  Clock,
  CheckCircle2,
  X as XIcon,
  Plus,
  Info,
} from "lucide-react";

type NotificationPrefs = {
  emailNewBooking: boolean;
  emailCancellation: boolean;
  emailDailyDigest: boolean;
  pushNewBooking: boolean;
  pushCancellation: boolean;
  pushRemindersEnabled: boolean;
  smsEnabled: boolean;
  cancelAlertChannels: string[];
  cancelAlertTemplate: string | null;
  reminderOffsetsHours: number[];
  cancelAlertOffsetsHours: number[];
};

type TabId = "notifications" | "reminders" | "cancel-alerts" | "security" | "about";

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Push" },
];

const REMINDER_PRESETS: Array<{ hours: number; label: string }> = [
  { hours: 168, label: "7 jours avant" },
  { hours: 72, label: "3 jours avant" },
  { hours: 48, label: "48 h avant" },
  { hours: 24, label: "24 h avant" },
  { hours: 4, label: "4 h avant" },
  { hours: 2, label: "2 h avant" },
  { hours: 1, label: "1 h avant" },
];

const CANCEL_PRESETS: Array<{ hours: number; label: string }> = [
  { hours: 0, label: "Immédiatement" },
  { hours: 1, label: "1 h avant" },
  { hours: 2, label: "2 h avant" },
  { hours: 4, label: "4 h avant" },
  { hours: 24, label: "24 h avant" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("notifications");
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Password
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // 2FA
  const [tfaSecret, setTfaSecret] = useState<string | null>(null);
  const [tfaUri, setTfaUri] = useState<string | null>(null);
  const [tfaCode, setTfaCode] = useState("");
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [tfaBusy, setTfaBusy] = useState(false);
  const [disablePw, setDisablePw] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, mRes] = await Promise.all([
          fetch("/api/doctor/notification-prefs"),
          fetch("/api/doctor/me"),
        ]);
        if (pRes.ok) setPrefs(await pRes.json());
        if (mRes.ok) {
          const m = await mRes.json();
          setTfaEnabled(!!m.totpEnabled);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function savePrefs() {
    if (!prefs) return;
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/doctor/notification-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        toast.error("Sauvegarde échouée");
        return;
      }
      toast.success("Préférences enregistrées");
    } finally {
      setSavingPrefs(false);
    }
  }

  async function changePassword() {
    if (pwNew !== pwConfirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (pwNew.length < 8) {
      toast.error("Minimum 8 caractères");
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch("/api/doctor/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        return;
      }
      toast.success("Mot de passe mis à jour");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } finally {
      setChangingPw(false);
    }
  }

  async function startTfa() {
    setTfaBusy(true);
    try {
      const res = await fetch("/api/doctor/2fa/enable", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        return;
      }
      setTfaSecret(data.secret);
      setTfaUri(data.uri);
    } finally {
      setTfaBusy(false);
    }
  }

  async function verifyTfa() {
    setTfaBusy(true);
    try {
      const res = await fetch("/api/doctor/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: tfaCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Code incorrect");
        return;
      }
      setTfaEnabled(true);
      setTfaSecret(null);
      setTfaUri(null);
      setTfaCode("");
      setBackupCodes(data.backupCodes);
      toast.success("2FA activé");
    } finally {
      setTfaBusy(false);
    }
  }

  async function disableTfa() {
    setTfaBusy(true);
    try {
      const res = await fetch("/api/doctor/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePw }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        return;
      }
      setTfaEnabled(false);
      setDisablePw("");
      setShowDisable(false);
      toast.success("2FA désactivé");
    } finally {
      setTfaBusy(false);
    }
  }

  function toggleCancelChannel(channel: string) {
    if (!prefs) return;
    const has = prefs.cancelAlertChannels.includes(channel);
    setPrefs({
      ...prefs,
      cancelAlertChannels: has
        ? prefs.cancelAlertChannels.filter((c) => c !== channel)
        : [...prefs.cancelAlertChannels, channel],
    });
  }

  function toggleOffset(field: "reminderOffsetsHours" | "cancelAlertOffsetsHours", hours: number) {
    if (!prefs) return;
    const cur = prefs[field];
    const has = cur.includes(hours);
    setPrefs({
      ...prefs,
      [field]: has ? cur.filter((h) => h !== hours) : [...cur, hours].sort((a, b) => b - a),
    });
  }

  function addCustomOffset(
    field: "reminderOffsetsHours" | "cancelAlertOffsetsHours",
    hours: number
  ) {
    if (!prefs || !Number.isFinite(hours) || hours < 0) return;
    const rounded = Math.round(hours);
    if (prefs[field].includes(rounded)) return;
    setPrefs({
      ...prefs,
      [field]: [...prefs[field], rounded].sort((a, b) => b - a),
    });
  }

  if (loading || !prefs) {
    return <div className="p-6 text-sm text-gray-500">Chargement...</div>;
  }

  const TABS: Array<{ id: TabId; label: string; icon: typeof Bell }> = [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "reminders", label: "Rappels patients", icon: Clock },
    { id: "cancel-alerts", label: "Alertes d'annulation", icon: AlertTriangle },
    { id: "security", label: "Sécurité", icon: Lock },
    { id: "about", label: "À propos", icon: Info },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-sm text-gray-500">
          Notifications, sécurité, rappels et alertes d&apos;annulation.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === t.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "notifications" && (
        <>
          <Section icon={Bell} title="Canaux par événement">
            <p className="text-sm text-gray-500 mb-4">
              Choisissez comment vous souhaitez être averti pour chaque type d&apos;événement.
            </p>
            <ToggleGroup>
              <Toggle
                icon={<Mail className="h-4 w-4" />}
                label="Email — Nouvelle réservation"
                value={prefs.emailNewBooking}
                onChange={(v) => setPrefs({ ...prefs, emailNewBooking: v })}
              />
              <Toggle
                icon={<Mail className="h-4 w-4" />}
                label="Email — Annulation patient"
                value={prefs.emailCancellation}
                onChange={(v) => setPrefs({ ...prefs, emailCancellation: v })}
              />
              <Toggle
                icon={<Mail className="h-4 w-4" />}
                label="Email — Résumé quotidien"
                value={prefs.emailDailyDigest}
                onChange={(v) => setPrefs({ ...prefs, emailDailyDigest: v })}
              />
              <Toggle
                icon={<Smartphone className="h-4 w-4" />}
                label="Push — Nouvelle réservation"
                value={prefs.pushNewBooking}
                onChange={(v) => setPrefs({ ...prefs, pushNewBooking: v })}
              />
              <Toggle
                icon={<Smartphone className="h-4 w-4" />}
                label="Push — Annulation patient"
                value={prefs.pushCancellation}
                onChange={(v) => setPrefs({ ...prefs, pushCancellation: v })}
              />
              <Toggle
                icon={<MessageSquare className="h-4 w-4" />}
                label="SMS (peut entraîner des frais)"
                value={prefs.smsEnabled}
                onChange={(v) => setPrefs({ ...prefs, smsEnabled: v })}
              />
            </ToggleGroup>
          </Section>
          <SaveBar onSave={savePrefs} saving={savingPrefs} />
        </>
      )}

      {activeTab === "reminders" && (
        <>
          <Section icon={Clock} title="Rappels patients — activation">
            <Toggle
              icon={<Bell className="h-4 w-4" />}
              label="Envoyer des rappels automatiques aux patients"
              value={prefs.pushRemindersEnabled}
              onChange={(v) => setPrefs({ ...prefs, pushRemindersEnabled: v })}
            />
          </Section>
          <Section icon={Clock} title="Quand envoyer le rappel ?">
            <p className="text-sm text-gray-500 mb-4">
              Le patient recevra un rappel à chacune des échéances ci-dessous avant son
              rendez-vous. Sélectionnez autant de moments que nécessaire.
            </p>
            <OffsetChips
              presets={REMINDER_PRESETS}
              value={prefs.reminderOffsetsHours}
              onToggle={(h) => toggleOffset("reminderOffsetsHours", h)}
              onAddCustom={(h) => addCustomOffset("reminderOffsetsHours", h)}
              maxHours={720}
              disabled={!prefs.pushRemindersEnabled}
            />
          </Section>
          <SaveBar onSave={savePrefs} saving={savingPrefs} />
        </>
      )}

      {activeTab === "cancel-alerts" && (
        <>
          <Section icon={AlertTriangle} title="Canaux d'alerte par défaut">
            <p className="text-sm text-gray-500 mb-4">
              Lorsque vous annulez un rendez-vous, ces canaux sont pré-cochés dans la modale.
            </p>
            <div className="flex gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => toggleCancelChannel(c.value)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                    prefs.cancelAlertChannels.includes(c.value)
                      ? "bg-primary text-white"
                      : "border border-border bg-white text-foreground hover:bg-secondary"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Section>

          <Section icon={Clock} title="Quand prévenir le patient ?">
            <p className="text-sm text-gray-500 mb-4">
              Choisissez le moment où le message est envoyé, calculé par rapport à l&apos;heure
              initiale du rendez-vous. "Immédiatement" envoie dès l&apos;annulation.
            </p>
            <OffsetChips
              presets={CANCEL_PRESETS}
              value={prefs.cancelAlertOffsetsHours}
              onToggle={(h) => toggleOffset("cancelAlertOffsetsHours", h)}
              onAddCustom={(h) => addCustomOffset("cancelAlertOffsetsHours", h)}
              maxHours={168}
            />
          </Section>

          <Section icon={MessageSquare} title="Modèle de message">
            <textarea
              value={prefs.cancelAlertTemplate ?? ""}
              onChange={(e) => setPrefs({ ...prefs, cancelAlertTemplate: e.target.value })}
              placeholder="Bonjour {patientName}, votre rendez-vous du {dateHeure} est annulé. Merci de reporter via {lienReporter}."
              rows={4}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Placeholders : <code>{"{patientName}"}</code>, <code>{"{dateHeure}"}</code>,{" "}
              <code>{"{lienReporter}"}</code>
            </p>
          </Section>
          <SaveBar onSave={savePrefs} saving={savingPrefs} />
        </>
      )}

      {activeTab === "security" && (
        <>
          <Section icon={Lock} title="Mot de passe">
            <div className="space-y-3 max-w-md">
              <PasswordField
                label="Mot de passe actuel"
                value={pwCurrent}
                onChange={setPwCurrent}
              />
              <PasswordField
                label="Nouveau mot de passe"
                value={pwNew}
                onChange={setPwNew}
              />
              <PasswordField
                label="Confirmer le nouveau mot de passe"
                value={pwConfirm}
                onChange={setPwConfirm}
              />
              <button
                onClick={changePassword}
                disabled={changingPw || !pwCurrent || !pwNew}
                className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {changingPw ? "Mise à jour..." : "Changer le mot de passe"}
              </button>
            </div>
          </Section>

          <Section icon={ShieldCheck} title="Authentification à deux facteurs (2FA)">
            {tfaEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  2FA activé — votre compte est protégé par une vérification supplémentaire.
                </div>
                {backupCodes && (
                  <BackupCodesCard codes={backupCodes} onDismiss={() => setBackupCodes(null)} />
                )}
                {showDisable ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                    <p className="text-sm text-red-800">
                      Saisissez votre mot de passe pour désactiver le 2FA.
                    </p>
                    <input
                      type="password"
                      value={disablePw}
                      onChange={(e) => setDisablePw(e.target.value)}
                      className="w-full rounded-xl border border-red-200 px-3 py-2"
                      placeholder="Mot de passe"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setShowDisable(false);
                          setDisablePw("");
                        }}
                        className="rounded-xl border border-border bg-white px-3 py-1.5 text-sm"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={disableTfa}
                        disabled={tfaBusy}
                        className="rounded-xl bg-red-600 text-white px-3 py-1.5 text-sm hover:bg-red-700 disabled:opacity-60"
                      >
                        Désactiver
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDisable(true)}
                    className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Désactiver le 2FA
                  </button>
                )}
              </div>
            ) : tfaSecret && tfaUri ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-700">
                  1. Ouvre ton application d&apos;authentification (Google Authenticator, Authy,
                  1Password…) et scanne ce QR code.
                </div>
                <div className="rounded-xl border border-border bg-white p-4 inline-flex flex-col items-center gap-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      tfaUri
                    )}`}
                    alt="QR code 2FA"
                    className="h-48 w-48"
                  />
                  <div className="text-[11px] text-gray-500">
                    ou entre manuellement :{" "}
                    <code className="font-mono bg-secondary px-1 rounded">{tfaSecret}</code>
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase text-gray-500 tracking-wide">
                    2. Entre le code à 6 chiffres
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={tfaCode}
                    onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ""))}
                    className="mt-1 w-40 rounded-xl border border-border px-3 py-2 text-center text-lg tracking-widest font-mono"
                    placeholder="000000"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={verifyTfa}
                    disabled={tfaBusy || tfaCode.length !== 6}
                    className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  >
                    Valider et activer
                  </button>
                  <button
                    onClick={() => {
                      setTfaSecret(null);
                      setTfaUri(null);
                      setTfaCode("");
                    }}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Protégez votre compte avec une vérification à deux facteurs. Vous aurez
                  besoin d&apos;une application comme Google Authenticator, Authy ou 1Password.
                </p>
                <button
                  onClick={startTfa}
                  disabled={tfaBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  <QrCode className="h-4 w-4" />
                  Activer le 2FA
                </button>
              </div>
            )}
          </Section>
        </>
      )}

      {activeTab === "about" && (
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-teal-50 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Doktori</h2>
              <p className="text-sm text-gray-500">Version 0.1.0 (beta)</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Doktori est une plateforme de gestion médicale et de prise de rendez-vous en ligne,
            développée par <strong>RandomWalkers</strong>, une agence de développement logiciel basée en Tunisie.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-foreground mb-1">Développeur</div>
              <div className="text-gray-600">RandomWalkers</div>
              <div className="text-gray-400 text-xs mt-0.5">Tunisie</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-foreground mb-1">Plateforme</div>
              <a href="https://doktori.tn" target="_blank" rel="noreferrer" className="text-teal-600 hover:underline font-medium">
                doktori.tn
              </a>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-foreground mb-1">Droits</div>
              <div className="text-gray-600">© 2026 RandomWalkers. Tous droits réservés.</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-foreground mb-1">Licence</div>
              <div className="text-gray-600">Propriétaire — usage commercial réservé</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Bell;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ToggleGroup({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border -my-3">{children}</div>;
}

function Toggle({
  icon,
  label,
  value,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 py-3 cursor-pointer select-none">
      {icon && <span className="text-gray-500">{icon}</span>}
      <span className="text-sm text-foreground flex-1">{label}</span>
      <span
        onClick={() => onChange(!value)}
        className={`inline-flex h-6 w-11 rounded-full p-0.5 transition-colors ${
          value ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase text-gray-500 tracking-wide">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Enregistrement..." : "Enregistrer"}
      </button>
    </div>
  );
}

function formatOffsetLabel(hours: number): string {
  if (hours === 0) return "Immédiatement";
  if (hours < 24) return `${hours} h avant`;
  if (hours % 24 === 0) return `${hours / 24} j avant`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return `${d} j ${h} h avant`;
}

function OffsetChips({
  presets,
  value,
  onToggle,
  onAddCustom,
  maxHours,
  disabled,
}: {
  presets: Array<{ hours: number; label: string }>;
  value: number[];
  onToggle: (hours: number) => void;
  onAddCustom: (hours: number) => void;
  maxHours: number;
  disabled?: boolean;
}) {
  const [custom, setCustom] = useState("");
  const extras = value.filter((h) => !presets.some((p) => p.hours === h));

  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = value.includes(p.hours);
          return (
            <button
              key={p.hours}
              onClick={() => onToggle(p.hours)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "border border-border bg-white text-foreground hover:bg-secondary"
              }`}
            >
              {active && <CheckCircle2 className="h-3.5 w-3.5" />}
              {p.label}
            </button>
          );
        })}
        {extras.map((h) => (
          <button
            key={h}
            onClick={() => onToggle(h)}
            className="inline-flex items-center gap-1 rounded-xl bg-primary text-white px-3 py-1.5 text-sm font-medium"
          >
            {formatOffsetLabel(h)}
            <XIcon className="h-3 w-3" />
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-400" />
        <input
          type="number"
          min={0}
          max={maxHours}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Heures personnalisées"
          className="w-44 rounded-xl border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={() => {
            const h = Number(custom);
            if (!Number.isNaN(h) && h >= 0 && h <= maxHours) {
              onAddCustom(h);
              setCustom("");
            }
          }}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 text-sm hover:bg-secondary"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {value.length === 0 && (
        <p className="mt-3 text-xs text-amber-600">
          Aucune échéance sélectionnée — aucun message ne sera envoyé.
        </p>
      )}
      {value.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Actif : {value.map(formatOffsetLabel).join(" · ")}
        </p>
      )}
    </div>
  );
}

function BackupCodesCard({
  codes,
  onDismiss,
}: {
  codes: string[];
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copyAll() {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <KeyRound className="h-4 w-4 text-amber-700 mt-0.5" />
        <div className="flex-1 text-sm text-amber-900">
          <div className="font-semibold">Codes de secours</div>
          <p className="text-xs">
            Conservez-les en lieu sûr — ils servent à vous connecter si vous perdez votre
            application d&apos;authentification. Chaque code n&apos;est utilisable qu&apos;une fois.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-white rounded-xl border border-amber-200 p-3">
        {codes.map((c, i) => (
          <div key={i} className="text-amber-900">
            {c}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={copyAll}
          className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copié" : "Copier"}
        </button>
        <button
          onClick={onDismiss}
          className="rounded-xl bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-800"
        >
          J&apos;ai sauvegardé les codes
        </button>
      </div>
    </div>
  );
}
