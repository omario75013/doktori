"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Calendar,
  Syringe,
  Pill,
  Loader2,
} from "lucide-react";

interface Prefs {
  emailAppointments: boolean;
  emailMarketing: boolean;
  emailNews: boolean;
  smsAppointments: boolean;
  smsReminders: boolean;
  pushAppointments: boolean;
  pushMessages: boolean;
  appointmentReminderOffsets: number[];
  vaccineRemindersEnabled: boolean;
  vaccineReminderDaysBefore: number;
  medicationRemindersEnabled: boolean;
}

const VACCINE_DAYS_CHOICES = [7, 14, 30, 60, 90, 180];

export default function NotificationsPage() {
  const t = useTranslations("patient.parametres.notifications");
  const OFFSET_CHOICES: Array<{ value: number; label: string }> = [
    { value: 720, label: t("offsets.month") },
    { value: 168, label: t("offsets.week") },
    { value: 48, label: t("offsets.days2") },
    { value: 24, label: t("offsets.day1") },
    { value: 2, label: t("offsets.hours2") },
    { value: 0, label: t("offsets.sameDay") },
  ];
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me/notification-prefs", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setPrefs({
            emailAppointments: !!d.emailAppointments,
            emailMarketing: !!d.emailMarketing,
            emailNews: !!d.emailNews,
            smsAppointments: !!d.smsAppointments,
            smsReminders: !!d.smsReminders,
            pushAppointments: !!d.pushAppointments,
            pushMessages: !!d.pushMessages,
            appointmentReminderOffsets: Array.isArray(d.appointmentReminderOffsets)
              ? d.appointmentReminderOffsets
              : [168, 24, 2],
            vaccineRemindersEnabled: d.vaccineRemindersEnabled ?? true,
            vaccineReminderDaysBefore: d.vaccineReminderDaysBefore ?? 30,
            medicationRemindersEnabled: d.medicationRemindersEnabled ?? true,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save(patch: Partial<Prefs>) {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    try {
      const res = await fetch("/api/me/notification-prefs", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) toast.error(t("toast.saveError"));
    } finally {
      setSaving(false);
    }
  }

  function toggleOffset(value: number) {
    if (!prefs) return;
    const has = prefs.appointmentReminderOffsets.includes(value);
    const next = has
      ? prefs.appointmentReminderOffsets.filter((v) => v !== value)
      : [...prefs.appointmentReminderOffsets, value].sort((a, b) => b - a);
    void save({ appointmentReminderOffsets: next });
  }

  if (loading || !prefs) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="ds-eyebrow">{t("eyebrow")}</div>
          <h1 className="ds-page-title">{t("title")}</h1>
          <p className="ds-page-sub">
            {t("subtitle")}
          </p>
        </div>
        {saving && (
          <div
            className="inline-flex items-center gap-2 text-[12.5px] font-semibold"
            style={{ color: "var(--ink-500)" }}
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("saving")}
          </div>
        )}
      </div>

      <Section title={t("channels.title")} subtitle={t("channels.subtitle")}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ChannelCard
            icon={<Mail className="w-4 h-4" />}
            title={t("channels.email.title")}
            sub={t("channels.email.sub")}
            on={prefs.emailAppointments}
            onChange={(v) => save({ emailAppointments: v })}
          />
          <ChannelCard
            icon={<MessageSquare className="w-4 h-4" />}
            title={t("channels.sms.title")}
            sub={t("channels.sms.sub")}
            on={prefs.smsAppointments}
            onChange={(v) => save({ smsAppointments: v })}
          />
          <ChannelCard
            icon={<Smartphone className="w-4 h-4" />}
            title={t("channels.push.title")}
            sub={t("channels.push.sub")}
            on={prefs.pushAppointments}
            onChange={(v) => save({ pushAppointments: v })}
          />
        </div>
      </Section>

      <Section
        icon={<Calendar className="w-4 h-4" />}
        title={t("rdvReminders.title")}
        subtitle={t("rdvReminders.subtitle")}
      >
        <div className="flex flex-wrap gap-2">
          {OFFSET_CHOICES.map((c) => {
            const on = prefs.appointmentReminderOffsets.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleOffset(c.value)}
                className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition ${
                  on
                    ? "bg-[color:var(--primary-600)] text-white"
                    : "border border-[color:var(--line-cool)] bg-white text-[color:var(--ink-700)] hover:border-[color:var(--primary-300)]"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11.5px] mt-2" style={{ color: "var(--ink-500)" }}>
          {t("rdvReminders.note")}
        </p>
      </Section>

      <Section
        icon={<Syringe className="w-4 h-4" />}
        title={t("vaccines.title")}
        subtitle={t("vaccines.subtitle")}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[13.5px] font-semibold" style={{ color: "var(--ink-900)" }}>
            {t("vaccines.enable")}
          </span>
          <Toggle
            on={prefs.vaccineRemindersEnabled}
            onChange={(v) => save({ vaccineRemindersEnabled: v })}
          />
        </div>
        {prefs.vaccineRemindersEnabled && (
          <div className="flex flex-wrap gap-2">
            {VACCINE_DAYS_CHOICES.map((d) => {
              const on = prefs.vaccineReminderDaysBefore === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => save({ vaccineReminderDaysBefore: d })}
                  className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition ${
                    on
                      ? "bg-[color:var(--primary-600)] text-white"
                      : "border border-[color:var(--line-cool)] bg-white text-[color:var(--ink-700)] hover:border-[color:var(--primary-300)]"
                  }`}
                >
                  {t("vaccines.daysBefore", { n: d })}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        icon={<Pill className="w-4 h-4" />}
        title={t("meds.title")}
        subtitle={t("meds.subtitle")}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[13.5px] font-semibold" style={{ color: "var(--ink-900)" }}>
              {t("meds.rowTitle")}
            </div>
            <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
              {t("meds.rowSub")}
            </div>
          </div>
          <Toggle
            on={prefs.medicationRemindersEnabled}
            onChange={(v) => save({ medicationRemindersEnabled: v })}
          />
        </div>
        {prefs.medicationRemindersEnabled && (
          <a
            href="/dossier-medical/traitements"
            className="ds-btn ds-btn-soft ds-btn-sm mt-3 inline-flex"
          >
            <Pill className="w-3.5 h-3.5" /> {t("meds.configure")}
          </a>
        )}
      </Section>

      <Section icon={<Bell className="w-4 h-4" />} title={t("otherEmail.title")}>
        <RowToggle
          label={t("otherEmail.healthTips.label")}
          sub={t("otherEmail.healthTips.sub")}
          on={prefs.emailNews}
          onChange={(v) => save({ emailNews: v })}
        />
        <RowToggle
          label={t("otherEmail.offers.label")}
          sub={t("otherEmail.offers.sub")}
          on={prefs.emailMarketing}
          onChange={(v) => save({ emailMarketing: v })}
        />
      </Section>
    </>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ds-card-patient mb-4 p-5">
      <div className="flex items-start gap-3 mb-3">
        {icon && (
          <div
            className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
            style={{ background: "var(--primary-50)", color: "var(--primary-600)" }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1">
          <div className="font-bold text-[15px]" style={{ color: "var(--ink-900)" }}>
            {title}
          </div>
          {subtitle && (
            <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function ChannelCard({
  icon,
  title,
  sub,
  on,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChange(!on)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!on);
        }
      }}
      className="rounded-xl border p-3 text-start transition cursor-pointer"
      style={{
        borderColor: on ? "var(--primary-500)" : "var(--line-cool)",
        background: on ? "var(--primary-50)" : "#fff",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-7 h-7 rounded-lg grid place-items-center"
          style={{
            background: on ? "var(--primary-600)" : "var(--surface-2)",
            color: on ? "#fff" : "var(--ink-700)",
          }}
        >
          {icon}
        </span>
        <span className="font-bold text-[13.5px]" style={{ color: "var(--ink-900)" }}>
          {title}
        </span>
        <span className="ms-auto">
          <Toggle on={on} onChange={onChange} />
        </span>
      </div>
      <div className="text-[12px]" style={{ color: "var(--ink-500)" }}>
        {sub}
      </div>
    </div>
  );
}

function RowToggle({
  label,
  sub,
  on,
  onChange,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: "1px solid var(--line-cool)" }}
    >
      <div className="flex-1">
        <div className="font-semibold text-[13.5px]" style={{ color: "var(--ink-900)" }}>
          {label}
        </div>
        {sub && (
          <div className="text-[12px]" style={{ color: "var(--ink-500)" }}>
            {sub}
          </div>
        )}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      aria-pressed={on}
      className="relative shrink-0"
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        background: on ? "var(--primary-500)" : "var(--line-strong)",
        transition: "background .15s",
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
        style={{ left: on ? 19 : 3, transition: "left .15s" }}
      />
    </button>
  );
}
