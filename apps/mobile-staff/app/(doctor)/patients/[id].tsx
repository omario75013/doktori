import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

// Multi-tab doctor view of a single patient. Mirrors the web fiche at
// /(medecin)/patients/[id]/page.tsx but trimmed to mobile: read-mostly,
// with a quick "+ Certificat" creation form. Edition of profile/dossier
// is handled separately; here we expose phone call + referral as the two
// primary actions in the sticky header.

type PatientDetail = {
  patient: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    bloodType: string | null;
    cin: string | null;
    cnamNumber: string | null;
    insuranceProvider: string | null;
    insuranceNumber: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    heightCm: number | null;
    weightKg: string | number | null;
    occupation: string | null;
    addressStreet: string | null;
    addressCity: string | null;
    nationality: string | null;
  };
  appointments: Array<{
    id: string;
    startsAt: string;
    status: string;
    reason: string | null;
  }>;
  medical: {
    allergies: string | null;
    chronicConditions: string | null;
    currentMeds: string | null;
    notes: string | null;
  } | null;
};

type Prescription = {
  id: string;
  content: string;
  createdAt: string;
  appointmentId: string | null;
  verificationToken: string | null;
};

type Certificate = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  appointmentId: string | null;
  verificationToken: string | null;
};

type PatientDoc = {
  id: string;
  fileUrl?: string;
  fileName?: string;
  title?: string | null;
  uploadedBy?: "patient" | "doctor";
  createdAt?: string;
  mimeType?: string;
};

type TimelineEvent = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  occurredAt: string;
};

type TabId =
  | "general"
  | "dossier"
  | "rdv"
  | "ordonnances"
  | "certificats"
  | "documents"
  | "timeline";

export default function PatientFicheScreen() {
  useLocale();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const patientId = String(params.id);

  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("general");
  const [showRefer, setShowRefer] = useState(false);
  const [showNewCert, setShowNewCert] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const res = await api<PatientDetail>(`/api/patients/${patientId}`);
      setDetail(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  }, [patientId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (error) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <Header title={params.name ?? t("doctor.patientFiche.title")} onBack={() => router.back()} />
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadDetail}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <Header title={params.name ?? t("doctor.patientFiche.title")} onBack={() => router.back()} />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      </SafeAreaView>
    );
  }

  const p = detail.patient;
  const age = p.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)
      )
    : null;

  const tabs: Array<{ id: TabId; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = [
    { id: "general", label: t("doctor.patientFiche.tabs.general"), icon: "person" },
    { id: "dossier", label: t("doctor.patientFiche.tabs.dossier"), icon: "document-text" },
    { id: "rdv", label: t("doctor.patientFiche.tabs.rdv"), icon: "calendar" },
    { id: "ordonnances", label: t("doctor.patientFiche.tabs.ordonnances"), icon: "medkit" },
    { id: "certificats", label: t("doctor.patientFiche.tabs.certificats"), icon: "ribbon" },
    { id: "documents", label: t("doctor.patientFiche.tabs.documents"), icon: "folder" },
    { id: "timeline", label: t("doctor.patientFiche.tabs.timeline"), icon: "time" },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <Header
        title={p.name}
        onBack={() => router.back()}
        right={
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconBtn}
              onPress={() => Linking.openURL(`tel:${p.phone}`)}
              accessibilityLabel={t("doctor.patientFiche.actions.call")}
            >
              <Ionicons name="call" size={18} color={colors.teal} />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={() => setShowRefer(true)}
              accessibilityLabel={t("doctor.patientFiche.actions.refer")}
            >
              <Ionicons name="share-social" size={18} color={colors.teal} />
            </Pressable>
          </View>
        }
      />

      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { writingDirection: "ltr" }]} numberOfLines={1}>
          {p.phone}
          {age !== null ? ` · ${age} ${t("doctor.patientFiche.yearsShort")}` : ""}
          {p.gender ? ` · ${p.gender}` : ""}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsBarScroll}
        contentContainerStyle={styles.tabsBar}
      >
        {tabs.map((tt) => {
          const active = tab === tt.id;
          return (
            <Pressable
              key={tt.id}
              onPress={() => setTab(tt.id)}
              style={[styles.tabPill, active && styles.tabPillActive]}
            >
              <Ionicons
                name={tt.icon}
                size={14}
                color={active ? "#FFFFFF" : colors.foreground}
              />
              <Text style={[styles.tabPillText, active && { color: "#FFFFFF" }]}>
                {tt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }}>
        {tab === "general" && <GeneralTab detail={detail} age={age} />}
        {tab === "dossier" && <DossierTab detail={detail} />}
        {tab === "rdv" && <AppointmentsTab detail={detail} />}
        {tab === "ordonnances" && <PrescriptionsTab patientId={patientId} />}
        {tab === "certificats" && (
          <CertificatesTab
            patientId={patientId}
            onNew={() => setShowNewCert(true)}
            refreshKey={showNewCert ? 0 : 1}
          />
        )}
        {tab === "documents" && <DocumentsTab patientId={patientId} />}
        {tab === "timeline" && <TimelineTab patientId={patientId} detail={detail} />}
      </View>

      <Modal
        visible={showRefer}
        animationType="slide"
        onRequestClose={() => setShowRefer(false)}
      >
        <ReferPatientModal
          patientId={patientId}
          patientName={p.name}
          onClose={() => setShowRefer(false)}
        />
      </Modal>

      <Modal
        visible={showNewCert}
        animationType="slide"
        onRequestClose={() => setShowNewCert(false)}
      >
        <NewCertificateModal
          patientId={patientId}
          onClose={() => setShowNewCert(false)}
          onCreated={() => setShowNewCert(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

function Header({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.iconBtn}>
        <Ionicons name="arrow-back" size={20} color={colors.foreground} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {right ?? <View style={{ width: 36 }} />}
    </View>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────

function GeneralTab({ detail, age }: { detail: PatientDetail; age: number | null }) {
  const p = detail.patient;
  return (
    <ScrollView contentContainerStyle={styles.tabScroll}>
      <Card title={t("doctor.patientFiche.general.identity")}>
        <Kv label={t("doctor.patientFiche.general.name")} value={p.name} />
        <Kv
          label={t("doctor.patientFiche.general.dob")}
          value={
            p.dateOfBirth
              ? `${new Date(p.dateOfBirth).toLocaleDateString("fr-FR")}${age !== null ? ` (${age} ${t("doctor.patientFiche.yearsShort")})` : ""}`
              : "—"
          }
        />
        <Kv label={t("doctor.patientFiche.general.gender")} value={p.gender ?? "—"} />
        <Kv label={t("doctor.patientFiche.general.cin")} value={p.cin ?? "—"} mono />
        <Kv label={t("doctor.patientFiche.general.nationality")} value={p.nationality ?? "—"} />
      </Card>

      <Card title={t("doctor.patientFiche.general.contact")}>
        <Kv label={t("doctor.patientFiche.general.phone")} value={p.phone} mono ltr />
        <Kv label="Email" value={p.email ?? "—"} />
        <Kv
          label={t("doctor.patientFiche.general.address")}
          value={[p.addressStreet, p.addressCity].filter(Boolean).join(", ") || "—"}
        />
      </Card>

      <Card title={t("doctor.patientFiche.general.insurance")}>
        <Kv label={t("doctor.patientFiche.general.cnam")} value={p.cnamNumber ?? "—"} mono />
        <Kv label={t("doctor.patientFiche.general.insurer")} value={p.insuranceProvider ?? "—"} />
        <Kv
          label={t("doctor.patientFiche.general.insuranceNo")}
          value={p.insuranceNumber ?? "—"}
          mono
        />
      </Card>

      <Card title={t("doctor.patientFiche.general.morphology")}>
        <Kv label={t("doctor.patientFiche.general.bloodType")} value={p.bloodType ?? "—"} />
        <Kv
          label={t("doctor.patientFiche.general.allergies")}
          value={detail.medical?.allergies || "—"}
        />
      </Card>
    </ScrollView>
  );
}

function DossierTab({ detail }: { detail: PatientDetail }) {
  const m = detail.medical;
  return (
    <ScrollView contentContainerStyle={styles.tabScroll}>
      <Card title={t("doctor.patientFiche.dossier.allergies")} highlight="red">
        <Text style={styles.bodyText}>{m?.allergies || t("common.notProvided")}</Text>
      </Card>
      <Card title={t("doctor.patientFiche.dossier.chronic")} highlight="orange">
        <Text style={styles.bodyText}>{m?.chronicConditions || t("common.notProvided")}</Text>
      </Card>
      <Card title={t("doctor.patientFiche.dossier.currentMeds")} highlight="blue">
        <Text style={styles.bodyText}>{m?.currentMeds || t("common.notProvided")}</Text>
      </Card>
      <Card title={t("doctor.patientFiche.dossier.notes")}>
        <Text style={styles.bodyText}>{m?.notes || t("common.notProvided")}</Text>
      </Card>
    </ScrollView>
  );
}

function AppointmentsTab({ detail }: { detail: PatientDetail }) {
  if (detail.appointments.length === 0) {
    return <EmptyTab label={t("doctor.patientFiche.rdv.empty")} />;
  }
  return (
    <ScrollView contentContainerStyle={styles.tabScroll}>
      {detail.appointments.map((a) => (
        <View key={a.id} style={styles.apptRow}>
          <View style={styles.apptDate}>
            <Text style={styles.apptDay}>
              {new Date(a.startsAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </Text>
            <Text style={styles.apptTime}>
              {new Date(a.startsAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            {a.reason && <Text style={styles.apptReason}>{a.reason}</Text>}
            <StatusBadge status={a.status} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "confirmed"
      ? { bg: "#DCFCE7", fg: "#166534" }
      : status === "cancelled"
        ? { bg: "#FECACA", fg: "#991B1B" }
        : status === "completed"
          ? { bg: "#DBEAFE", fg: "#1E3A8A" }
          : status === "no_show"
            ? { bg: "#FED7AA", fg: "#9A3412" }
            : { bg: colors.bgSecondary, fg: colors.foregroundSecondary };
  return (
    <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.statusBadgeText, { color: tone.fg }]}>
        {t(`doctor.patientFiche.status.${status}`)}
      </Text>
    </View>
  );
}

function PrescriptionsTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<Prescription[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api<Prescription[]>(`/api/prescriptions?patientId=${patientId}`);
        if (alive) setList(r);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "");
      }
    })();
    return () => {
      alive = false;
    };
  }, [patientId]);

  if (error) return <ErrorBox error={error} />;
  if (!list) return <Loading />;
  if (list.length === 0) return <EmptyTab label={t("doctor.patientFiche.ordonnances.empty")} />;

  return (
    <ScrollView contentContainerStyle={styles.tabScroll}>
      {list.map((p) => (
        <Pressable
          key={p.id}
          style={styles.docCard}
          onPress={() =>
            Linking.openURL(`https://doktori.tn/ordonnance/${p.id}`).catch(() => {})
          }
        >
          <View style={styles.docCardHeader}>
            <Ionicons name="medkit" size={18} color={colors.teal} />
            <Text style={styles.docCardDate}>
              {new Date(p.createdAt).toLocaleDateString("fr-FR")}
            </Text>
          </View>
          <Text style={styles.docCardBody} numberOfLines={3}>
            {plainExcerpt(p.content)}
          </Text>
          <Text style={styles.docCardOpen}>{t("doctor.patientFiche.openInBrowser")} →</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function CertificatesTab({
  patientId,
  onNew,
  refreshKey,
}: {
  patientId: string;
  onNew: () => void;
  refreshKey: number;
}) {
  const [list, setList] = useState<Certificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api<Certificate[]>(
          `/api/medical-certificates?patientId=${patientId}`
        );
        if (alive) setList(r);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "");
      }
    })();
    return () => {
      alive = false;
    };
  }, [patientId, refreshKey]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subActionBar}>
        <Pressable style={styles.primaryBtn} onPress={onNew}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>
            {t("doctor.patientFiche.certificats.new")}
          </Text>
        </Pressable>
      </View>
      {error ? (
        <ErrorBox error={error} />
      ) : !list ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyTab label={t("doctor.patientFiche.certificats.empty")} />
      ) : (
        <ScrollView contentContainerStyle={styles.tabScroll}>
          {list.map((c) => (
            <View key={c.id} style={styles.docCard}>
              <View style={styles.docCardHeader}>
                <Ionicons name="ribbon" size={18} color={colors.teal} />
                <Text style={styles.docCardDate}>
                  {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                </Text>
              </View>
              <Text style={styles.docCardTitle}>{c.title}</Text>
              <Text style={styles.docCardBody} numberOfLines={3}>
                {plainExcerpt(c.content)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function DocumentsTab({ patientId }: { patientId: string }) {
  const [items, setItems] = useState<PatientDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api<{ items: PatientDoc[] }>(
          `/api/doctor/patient-documents?patientId=${patientId}`
        );
        if (alive) setItems(r.items ?? []);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "");
      }
    })();
    return () => {
      alive = false;
    };
  }, [patientId]);

  if (error) return <ErrorBox error={error} />;
  if (!items) return <Loading />;
  if (items.length === 0) return <EmptyTab label={t("doctor.patientFiche.documents.empty")} />;

  return (
    <ScrollView contentContainerStyle={styles.tabScroll}>
      {items.map((d) => {
        const name = d.title || d.fileName || t("doctor.patientFiche.documents.unnamed");
        return (
          <Pressable
            key={d.id}
            style={styles.docCard}
            onPress={() => {
              if (d.fileUrl) Linking.openURL(d.fileUrl).catch(() => {});
            }}
          >
            <View style={styles.docCardHeader}>
              <Ionicons
                name={d.mimeType?.startsWith("image/") ? "image" : "document"}
                size={18}
                color={colors.teal}
              />
              <Text style={styles.docCardDate}>
                {d.createdAt
                  ? new Date(d.createdAt).toLocaleDateString("fr-FR")
                  : ""}
              </Text>
            </View>
            <Text style={styles.docCardTitle} numberOfLines={2}>
              {name}
            </Text>
            <Text style={styles.docCardOpen}>
              {d.uploadedBy === "doctor"
                ? t("doctor.patientFiche.documents.byDoctor")
                : t("doctor.patientFiche.documents.byPatient")}
              {"  •  "}
              {t("doctor.patientFiche.openInBrowser")} →
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TimelineTab({
  patientId,
  detail,
}: {
  patientId: string;
  detail: PatientDetail;
}) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Try the server timeline first. If it 401s (the route still uses cookie-only
  // auth() and won't accept a Bearer JWT) we fall back to a client-side merge
  // of appointments + prescriptions + certificates.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api<{ events: TimelineEvent[] } | TimelineEvent[]>(
          `/api/patients/${patientId}/timeline`
        );
        if (!alive) return;
        const arr = Array.isArray(r) ? r : r.events ?? [];
        setEvents(arr);
      } catch {
        // Fallback — synthesize from data we already have + extra fetches.
        try {
          const [presc, certs] = await Promise.all([
            api<Prescription[]>(`/api/prescriptions?patientId=${patientId}`).catch(() => []),
            api<Certificate[]>(`/api/medical-certificates?patientId=${patientId}`).catch(() => []),
          ]);
          if (!alive) return;
          const merged: TimelineEvent[] = [
            ...detail.appointments.map((a) => ({
              id: `a-${a.id}`,
              kind: "appointment",
              title: a.reason || t("doctor.patientFiche.timeline.appointment"),
              body: a.status,
              occurredAt: a.startsAt,
            })),
            ...presc.map((p) => ({
              id: `p-${p.id}`,
              kind: "prescription",
              title: t("doctor.patientFiche.timeline.prescription"),
              body: plainExcerpt(p.content),
              occurredAt: p.createdAt,
            })),
            ...certs.map((c) => ({
              id: `c-${c.id}`,
              kind: "certificate",
              title: c.title,
              body: t("doctor.patientFiche.timeline.certificate"),
              occurredAt: c.createdAt,
            })),
          ].sort(
            (x, y) => new Date(y.occurredAt).getTime() - new Date(x.occurredAt).getTime()
          );
          if (alive) setEvents(merged);
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : "");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [patientId, detail.appointments]);

  if (error) return <ErrorBox error={error} />;
  if (!events) return <Loading />;
  if (events.length === 0) return <EmptyTab label={t("doctor.patientFiche.timeline.empty")} />;

  return (
    <ScrollView contentContainerStyle={styles.tabScroll}>
      {events.map((ev) => (
        <View key={ev.id} style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.timelineDate}>
              {new Date(ev.occurredAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
            <Text style={styles.timelineTitle}>{ev.title}</Text>
            {ev.body && (
              <Text style={styles.timelineBody} numberOfLines={2}>
                {ev.body}
              </Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Modals ──────────────────────────────────────────────────────────────

function NewCertificateModal({
  patientId,
  onClose,
  onCreated,
}: {
  patientId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (title.trim().length < 3) {
      setError(t("doctor.patientFiche.certificats.titleRequired"));
      return;
    }
    if (content.trim().length < 3) {
      setError(t("doctor.patientFiche.certificats.contentRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api("/api/medical-certificates", {
        method: "POST",
        body: { patientId, title: title.trim(), content: content.trim() },
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <Header
        title={t("doctor.patientFiche.certificats.newTitle")}
        onBack={onClose}
        right={
          <Pressable onPress={submit} style={[styles.iconBtn, styles.saveBtn]} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.formScroll}>
        {error && <Text style={styles.formError}>{error}</Text>}
        <Text style={styles.formLabel}>
          {t("doctor.patientFiche.certificats.titleLabel")} *
        </Text>
        <TextInput
          style={styles.formInput}
          value={title}
          onChangeText={setTitle}
          placeholder={t("doctor.patientFiche.certificats.titlePlaceholder")}
          placeholderTextColor={colors.foregroundSecondary}
        />
        <Text style={styles.formLabel}>
          {t("doctor.patientFiche.certificats.contentLabel")} *
        </Text>
        <TextInput
          style={[styles.formInput, { minHeight: 180, textAlignVertical: "top" }]}
          value={content}
          onChangeText={setContent}
          placeholder={t("doctor.patientFiche.certificats.contentPlaceholder")}
          placeholderTextColor={colors.foregroundSecondary}
          multiline
        />
      </ScrollView>
    </SafeAreaView>
  );
}

type Peer = {
  id: string;
  name: string;
  specialty?: string | null;
  photoUrl?: string | null;
};

function ReferPatientModal({
  patientId,
  patientName,
  onClose,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
}) {
  const [peers, setPeers] = useState<Peer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [shareDossier, setShareDossier] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api<Peer[]>("/api/doctor/network/peers");
        if (alive) setPeers(Array.isArray(r) ? r : []);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!peers) return [];
    const q = query.trim().toLowerCase();
    if (!q) return peers;
    return peers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.specialty ?? "").toLowerCase().includes(q)
    );
  }, [peers, query]);

  async function submit() {
    if (!selected) return;
    if (reason.trim().length < 3) {
      Alert.alert("", t("doctor.patientFiche.refer.reasonRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/doctor/referrals", {
        method: "POST",
        body: {
          toDoctorId: selected,
          patientId,
          reason: reason.trim(),
          shareMedicalRecord: shareDossier,
          notesForReceivingDoctor: notes.trim() || null,
        },
      });
      Alert.alert("", t("doctor.patientFiche.refer.success"));
      onClose();
    } catch (e) {
      Alert.alert(
        "",
        e instanceof Error ? e.message : t("doctor.patientFiche.refer.failed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <Header
        title={t("doctor.patientFiche.refer.title", { name: patientName })}
        onBack={onClose}
      />
      <ScrollView contentContainerStyle={styles.formScroll}>
        <Text style={styles.formLabel}>{t("doctor.patientFiche.refer.toLabel")}</Text>
        {error ? (
          <Text style={styles.formError}>{error}</Text>
        ) : !peers ? (
          <ActivityIndicator color={colors.teal} />
        ) : peers.length === 0 ? (
          <Text style={styles.bodyText}>{t("doctor.patientFiche.refer.emptyPeers")}</Text>
        ) : (
          <>
            <TextInput
              style={styles.formInput}
              value={query}
              onChangeText={setQuery}
              placeholder={t("doctor.patientFiche.refer.searchPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
            />
            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              {filtered.map((p) => {
                const active = selected === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelected(active ? null : p.id)}
                    style={[styles.peerRow, active && styles.peerRowActive]}
                  >
                    <View style={styles.peerAvatar}>
                      <Text style={styles.peerInitials}>
                        {p.name
                          .split(" ")
                          .slice(0, 2)
                          .map((s) => s[0])
                          .join("")
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.peerName}>Dr {p.name.replace(/^Dr\.?\s*/i, "")}</Text>
                      {p.specialty && (
                        <Text style={styles.peerSpec}>{p.specialty}</Text>
                      )}
                    </View>
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.teal} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.formLabel}>{t("doctor.patientFiche.refer.reasonLabel")} *</Text>
        <TextInput
          style={[styles.formInput, { minHeight: 60, textAlignVertical: "top" }]}
          value={reason}
          onChangeText={setReason}
          placeholder={t("doctor.patientFiche.refer.reasonPlaceholder")}
          placeholderTextColor={colors.foregroundSecondary}
          multiline
        />

        <Text style={styles.formLabel}>{t("doctor.patientFiche.refer.notesLabel")}</Text>
        <TextInput
          style={[styles.formInput, { minHeight: 60, textAlignVertical: "top" }]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t("doctor.patientFiche.refer.notesPlaceholder")}
          placeholderTextColor={colors.foregroundSecondary}
          multiline
        />

        <Pressable
          onPress={() => setShareDossier((v) => !v)}
          style={styles.checkRow}
        >
          <Ionicons
            name={shareDossier ? "checkbox" : "square-outline"}
            size={20}
            color={shareDossier ? colors.teal : colors.foregroundSecondary}
          />
          <Text style={styles.checkLabel}>{t("doctor.patientFiche.refer.shareDossier")}</Text>
        </Pressable>

        <Pressable
          onPress={submit}
          disabled={submitting || !selected || reason.trim().length < 3}
          style={[
            styles.primaryBtn,
            {
              opacity: submitting || !selected || reason.trim().length < 3 ? 0.5 : 1,
              marginTop: spacing.md,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={16} color="#FFFFFF" />
          )}
          <Text style={styles.primaryBtnText}>{t("doctor.patientFiche.refer.send")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Small bits ──────────────────────────────────────────────────────────

function Card({
  title,
  children,
  highlight,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: "red" | "orange" | "blue";
}) {
  const tones: Record<string, string> = {
    red: "#FECACA",
    orange: "#FED7AA",
    blue: "#BFDBFE",
  };
  return (
    <View
      style={[
        styles.card,
        highlight && { borderLeftWidth: 4, borderLeftColor: tones[highlight] },
      ]}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>{children}</View>
    </View>
  );
}

function Kv({
  label,
  value,
  mono,
  ltr,
}: {
  label: string;
  value: string;
  mono?: boolean;
  ltr?: boolean;
}) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text
        style={[
          styles.kvValue,
          mono && { fontFamily: "monospace" },
          ltr && { writingDirection: "ltr" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="cube-outline" size={32} color={colors.foregroundSecondary} />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

function Loading() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={colors.teal} />
    </View>
  );
}

function ErrorBox({ error }: { error: string }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{error || t("common.error")}</Text>
    </View>
  );
}

// Strip HTML tags + decode the few entities the prescription pipeline emits,
// so the truncated previews don't show "<p><strong>" raw markup.
function plainExcerpt(html: string): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  headerActions: { flexDirection: "row", gap: spacing.xs },
  iconBtn: {
    height: 36,
    width: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  saveBtn: { backgroundColor: colors.teal },

  metaRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  metaText: { fontSize: 12, color: colors.foregroundSecondary },

  tabsBarScroll: { flexGrow: 0, flexShrink: 0 },
  tabsBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: "center",
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  tabPillActive: { backgroundColor: colors.teal },
  tabPillText: { fontSize: 12, fontWeight: "600", color: colors.foreground },

  tabScroll: { padding: spacing.lg, paddingBottom: spacing["2xl"], gap: spacing.md },

  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  kvLabel: { fontSize: 13, color: colors.foregroundSecondary },
  kvValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
    flex: 1,
    textAlign: "right",
  },
  bodyText: { fontSize: 13, color: colors.foreground, lineHeight: 18 },

  apptRow: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  apptDate: { alignItems: "center", width: 60 },
  apptDay: { fontSize: 12, fontWeight: "700", color: colors.teal },
  apptTime: { fontSize: 11, color: colors.foregroundSecondary, fontFamily: "monospace" },
  apptReason: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  docCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  docCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  docCardDate: { fontSize: 11, color: colors.foregroundSecondary, fontWeight: "600" },
  docCardTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  docCardBody: { fontSize: 12, color: colors.foregroundSecondary, lineHeight: 16 },
  docCardOpen: { fontSize: 11, color: colors.teal, fontWeight: "700" },

  subActionBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  empty: { padding: spacing["2xl"], alignItems: "center", gap: spacing.sm },
  emptyText: { color: colors.foregroundSecondary, fontSize: 13 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorBox: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  errorText: { color: colors.danger, fontSize: 13, textAlign: "center" },
  retryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },

  timelineItem: {
    flexDirection: "row",
    gap: spacing.md,
    paddingLeft: spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal,
    marginTop: 6,
  },
  timelineDate: { fontSize: 11, color: colors.foregroundSecondary, fontWeight: "600" },
  timelineTitle: { fontSize: 13, fontWeight: "700", color: colors.foreground, marginTop: 2 },
  timelineBody: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },

  formScroll: { padding: spacing.lg, paddingBottom: spacing["2xl"], gap: spacing.sm },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.md,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bgSecondary,
  },
  formError: { color: colors.danger, fontSize: 13 },

  peerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  peerRowActive: { borderColor: colors.teal, backgroundColor: "#ECFEFF" },
  peerAvatar: {
    height: 36,
    width: 36,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  peerInitials: { fontSize: 11, fontWeight: "800", color: colors.teal },
  peerName: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  peerSpec: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkLabel: { fontSize: 13, color: colors.foreground, flex: 1 },
});
