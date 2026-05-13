import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Alert, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Loader, Empty, formatDate } from "./_ui";

// Mirrors the doctor referrals web shape returned by /api/doctor/referrals.
// Direction is derived client-side from from/to vs the current doctor's id —
// the GET endpoint doesn't accept a ?direction= filter, but it does return
// fromDoctorId / toDoctorId so we can split locally.
type Referral = {
  id: string;
  fromDoctorId: string;
  toDoctorId: string;
  patientId: string;
  reason: string;
  shareMedicalRecord: boolean;
  patientConsentStatus: "pending" | "granted" | "denied";
  suggestedAppointmentAt: string | null;
  notesForReceivingDoctor?: string | null;
  status: "pending" | "accepted" | "declined" | "completed";
  createdAt: string;
  patientName: string;
  patientPhone: string;
  // Legacy fields kept for backward compat with older mobile cache.
  fromDoctorName?: string;
  toDoctorName?: string;
  counterpartName?: string;
  counterpartSpecialty?: string | null;
};

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FED7AA", fg: "#9A3412" },
  accepted: { bg: "#DCFCE7", fg: "#166534" },
  declined: { bg: "#FECACA", fg: "#991B1B" },
  completed: { bg: "#DBEAFE", fg: "#1E40AF" },
};

const CONSENT_TONES: Record<string, { bg: string; fg: string; border: string }> = {
  pending: { bg: "#FFF7ED", fg: "#9A3412", border: "#FED7AA" },
  granted: { bg: "#F0FDF4", fg: "#166534", border: "#BBF7D0" },
  denied: { bg: "#FEF2F2", fg: "#991B1B", border: "#FECACA" },
};

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: t("doctor.refs.statusPending"),
    accepted: t("doctor.refs.statusAccepted"),
    declined: t("doctor.refs.statusDeclined"),
    completed: t("doctor.refs.statusDone"),
  };
  return map[status] ?? status;
}

function consentLabel(status: string, shared: boolean): string {
  if (!shared) return t("doctor.referencements.dossierNotShared");
  if (status === "granted") return t("doctor.referencements.dossierShared");
  if (status === "denied") return t("doctor.referencements.dossierDenied");
  return t("doctor.referencements.dossierPending");
}

export default function Referencements() {
  useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const [incoming, setIncoming] = useState<Referral[]>([]);
  const [outgoing, setOutgoing] = useState<Referral[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [details, setDetails] = useState<Referral | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [rows, me] = await Promise.all([
        api<Referral[]>("/api/doctor/referrals").catch(() => [] as Referral[]),
        api<{ id: string }>("/api/doctor/profile").catch(() => null),
      ]);
      const myId = me?.id ?? null;
      setMeId(myId);
      const list = Array.isArray(rows) ? rows : [];
      // Split by direction. If we can't tell (no me), fall back to legacy fields.
      const inc: Referral[] = [];
      const out: Referral[] = [];
      for (const r of list) {
        const isOutgoing = myId ? r.fromDoctorId === myId : !!r.toDoctorName;
        if (isOutgoing) out.push(r);
        else inc.push(r);
      }
      setIncoming(inc);
      setOutgoing(out);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(r: Referral, action: "accept" | "decline" | "complete") {
    setBusyId(r.id);
    try {
      await api(`/api/doctor/referrals/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (action === "accept") {
        // Web behaviour: accept then navigate to RDV creation for that patient.
        router.push({
          pathname: "/(doctor)/rendez-vous",
          params: {
            newRdvFor: r.patientId,
            newRdvName: r.patientName,
          },
        } as never);
      }
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("doctor.referencements.errorGeneric");
      Alert.alert(t("common.error"), msg);
    } finally {
      setBusyId(null);
    }
  }

  function confirmDecline(r: Referral) {
    Alert.alert(
      t("doctor.referencements.declineConfirmTitle"),
      t("doctor.referencements.declineConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("doctor.referencements.actionDecline"),
          style: "destructive",
          onPress: () => act(r, "decline"),
        },
      ],
    );
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.refs.title") }} />
        <Loader />
      </>
    );
  }

  const list = tab === "incoming" ? incoming : outgoing;

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.refs.title") }} />
      <Screen>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === "incoming" && styles.tabActive]}
            onPress={() => setTab("incoming")}
          >
            <Text style={[styles.tabText, tab === "incoming" && styles.tabTextActive]}>
              {t("doctor.refs.tabReceived", { count: incoming.length })}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === "outgoing" && styles.tabActive]}
            onPress={() => setTab("outgoing")}
          >
            <Text style={[styles.tabText, tab === "outgoing" && styles.tabTextActive]}>
              {t("doctor.refs.tabSent", { count: outgoing.length })}
            </Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <Empty
            icon="swap-horizontal-outline"
            title={
              tab === "incoming"
                ? t("doctor.referencements.emptyIncoming")
                : t("doctor.referencements.emptyOutgoing")
            }
          />
        ) : (
          list.map((r) => {
            const tone = STATUS_TONES[r.status] ?? { bg: colors.bgSecondary, fg: colors.teal };
            const counterpart =
              tab === "incoming"
                ? r.fromDoctorName ?? r.counterpartName ?? ""
                : r.toDoctorName ?? r.counterpartName ?? "";
            const showAccept = tab === "incoming" && r.status === "pending";
            const showComplete = tab === "incoming" && r.status === "accepted";
            const canViewDossier =
              tab === "incoming" && r.shareMedicalRecord && r.patientConsentStatus === "granted";
            const isBusy = busyId === r.id;

            return (
              <View key={r.id} style={styles.row}>
                <View style={styles.rowHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patient}>
                      {r.patientName}
                      {r.patientPhone ? (
                        <Text style={styles.patientPhone}> · {r.patientPhone}</Text>
                      ) : null}
                    </Text>
                    <Text style={styles.other}>
                      {tab === "incoming"
                        ? t("doctor.referencements.fromLabel")
                        : t("doctor.referencements.toLabel")}{" "}
                      Dr. {counterpart.replace(/^Dr\.?\s*/i, "")}
                      {r.counterpartSpecialty ? ` · ${r.counterpartSpecialty}` : ""}
                    </Text>
                    <Text style={styles.reason} numberOfLines={2}>
                      {r.reason}
                    </Text>
                    <Text style={styles.date}>{formatDate(r.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.badgeText, { color: tone.fg }]}>
                        {statusLabel(r.status)}
                      </Text>
                    </View>
                    {r.shareMedicalRecord && (
                      <ConsentBadge status={r.patientConsentStatus} />
                    )}
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => setDetails(r)}
                    style={styles.btnGhost}
                  >
                    <Ionicons name="information-circle-outline" size={14} color={colors.foreground} />
                    <Text style={styles.btnGhostText}>{t("doctor.referencements.detailsButton")}</Text>
                  </Pressable>

                  {showAccept && (
                    <>
                      <Pressable
                        disabled={isBusy}
                        onPress={() => act(r, "accept")}
                        style={[styles.btnPrimary, isBusy && styles.btnDisabled]}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="calendar" size={14} color="#FFFFFF" />
                        )}
                        <Text style={styles.btnPrimaryText}>
                          {t("doctor.referencements.actionAcceptAndBook")}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={isBusy}
                        onPress={() => confirmDecline(r)}
                        style={[styles.btnGhost, isBusy && styles.btnDisabled]}
                      >
                        <Ionicons name="close" size={14} color={colors.foreground} />
                        <Text style={styles.btnGhostText}>
                          {t("doctor.referencements.actionDecline")}
                        </Text>
                      </Pressable>
                    </>
                  )}

                  {showComplete && (
                    <>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/(doctor)/rendez-vous",
                            params: { newRdvFor: r.patientId, newRdvName: r.patientName },
                          } as never)
                        }
                        style={styles.btnPrimary}
                      >
                        <Ionicons name="calendar" size={14} color="#FFFFFF" />
                        <Text style={styles.btnPrimaryText}>
                          {t("doctor.referencements.actionBookRdv")}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={isBusy}
                        onPress={() => act(r, "complete")}
                        style={[styles.btnGhost, isBusy && styles.btnDisabled]}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color={colors.foreground} />
                        ) : (
                          <Ionicons name="checkmark" size={14} color={colors.foreground} />
                        )}
                        <Text style={styles.btnGhostText}>
                          {t("doctor.referencements.actionMarkCompleted")}
                        </Text>
                      </Pressable>
                    </>
                  )}

                  {canViewDossier && (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/(doctor)/patients/[id]",
                          params: { id: r.patientId },
                        } as never)
                      }
                      style={styles.btnDossier}
                    >
                      <Ionicons name="folder-open-outline" size={14} color={colors.teal} />
                      <Text style={styles.btnDossierText}>
                        {t("doctor.referencements.actionViewDossier")}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}

        <DetailsModal
          referral={details}
          direction={tab}
          onClose={() => setDetails(null)}
        />
      </Screen>
    </>
  );
}

function ConsentBadge({ status }: { status: string }) {
  const tone = CONSENT_TONES[status] ?? CONSENT_TONES.pending;
  const label =
    status === "granted"
      ? t("doctor.referencements.consentGranted")
      : status === "denied"
        ? t("doctor.referencements.consentDenied")
        : t("doctor.referencements.consentPending");
  return (
    <View
      style={[
        styles.consentBadge,
        { backgroundColor: tone.bg, borderColor: tone.border },
      ]}
    >
      <Text style={[styles.consentBadgeText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

function DetailsModal({
  referral,
  direction,
  onClose,
}: {
  referral: Referral | null;
  direction: "incoming" | "outgoing";
  onClose: () => void;
}) {
  if (!referral) return null;
  const counterpart =
    direction === "incoming"
      ? referral.fromDoctorName ?? referral.counterpartName ?? ""
      : referral.toDoctorName ?? referral.counterpartName ?? "";

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>
              {t("doctor.referencements.detailsTitle")}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.foregroundSecondary} />
            </Pressable>
          </View>

          <Section label={t("doctor.referencements.patientLabel")}>
            <Text style={styles.modalValue}>{referral.patientName}</Text>
            {referral.patientPhone ? (
              <Text style={styles.modalSub}>{referral.patientPhone}</Text>
            ) : null}
          </Section>

          <Section
            label={
              direction === "incoming"
                ? t("doctor.referencements.referredByLabel")
                : t("doctor.referencements.referredToLabel")
            }
          >
            <Text style={styles.modalValue}>
              Dr. {counterpart.replace(/^Dr\.?\s*/i, "")}
              {referral.counterpartSpecialty ? ` · ${referral.counterpartSpecialty}` : ""}
            </Text>
          </Section>

          <Section label={t("doctor.referencements.reasonLabel")}>
            <Text style={styles.modalValue}>{referral.reason}</Text>
          </Section>

          {referral.notesForReceivingDoctor ? (
            <Section label={t("doctor.referencements.notesLabel")}>
              <Text style={styles.modalValue}>{referral.notesForReceivingDoctor}</Text>
            </Section>
          ) : null}

          {referral.suggestedAppointmentAt ? (
            <Section label={t("doctor.referencements.suggestedRdvLabel")}>
              <Text style={styles.modalValue}>
                {formatDate(referral.suggestedAppointmentAt)}
              </Text>
            </Section>
          ) : null}

          <View style={styles.modalGrid}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>{t("doctor.referencements.statusLabel")}</Text>
              <Text style={styles.modalValue}>{statusLabel(referral.status)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>{t("doctor.referencements.dossierLabel")}</Text>
              <Text style={styles.modalValue}>
                {consentLabel(referral.patientConsentStatus, referral.shareMedicalRecord)}
              </Text>
            </View>
          </View>

          <Text style={styles.modalDate}>
            {t("doctor.referencements.sentOn", { date: formatDate(referral.createdAt) })}
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.modalLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.foregroundSecondary },
  tabTextActive: { color: colors.teal, fontWeight: "700" },

  row: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  rowHead: { flexDirection: "row", gap: spacing.sm },
  patient: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  patientPhone: { fontWeight: "400", color: colors.foregroundSecondary },
  other: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  reason: { fontSize: 12, color: colors.foreground, marginTop: 4 },
  date: { fontSize: 10, color: colors.foregroundSecondary, marginTop: 4 },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 9, fontWeight: "700" },
  consentBadge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  consentBadgeText: { fontSize: 9, fontWeight: "600" },

  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  btnGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  btnGhostText: { fontSize: 11, fontWeight: "600", color: colors.foreground },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
  },
  btnPrimaryText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  btnDossier: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal,
    backgroundColor: colors.bgSecondary,
  },
  btnDossierText: { fontSize: 11, fontWeight: "700", color: colors.teal },
  btnDisabled: { opacity: 0.5 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: colors.bg,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 15, fontWeight: "800", color: colors.foreground },
  modalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalValue: { fontSize: 13, color: colors.foreground },
  modalSub: { fontSize: 12, color: colors.foregroundSecondary },
  modalGrid: {
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  modalDate: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    marginTop: spacing.sm,
  },
});
