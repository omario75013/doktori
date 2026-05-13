import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  Linking,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  radii,
  api,
  t,
  getApiBaseUrl,
} from "@doktori/mobile-core";
import { Screen, Card, Loader, Empty, formatDate, formatMillimes } from "./_ui";

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  patientName: string;
  patientPhone: string;
};

type ClaimStatus = "draft" | "submitted" | "reimbursed" | "rejected";

type Claim = {
  id: string;
  cnamNumber: string;
  patientRole: "assure" | "ayant_droit";
  amount: number;
  consultationDate: string;
  status: ClaimStatus;
  submittedAt: string | null;
  reimbursedAt: string | null;
  createdAt: string;
  patientName: string;
  patientId: string;
};

type ClaimsResponse = {
  rows: Claim[];
  totals: { count: number; amount: number; byStatus: Record<string, number> };
};

type StatusFilter = "all" | ClaimStatus;

const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "draft",
  "submitted",
  "reimbursed",
  "rejected",
];

const STATUS_COLORS: Record<ClaimStatus, string> = {
  draft: colors.foregroundSecondary,
  submitted: "#2563eb",
  reimbursed: colors.teal,
  rejected: "#dc2626",
};

/**
 * CNAM screen — mobile. Shows recent appointments + the list of CNAM
 * bordereaux (claims) issued by the doctor, with filter chips, search,
 * and a view modal that links out to the web print URL.
 */
export default function Cnam() {
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Claim | null>(null);

  const load = useCallback(async () => {
    try {
      const a = await api<Appointment[]>("/api/appointments/doctor");
      setAppts(a.filter((x) => x.status === "completed"));
    } catch {
      setAppts([]);
    }
    try {
      const c = await api<ClaimsResponse>("/api/cnam/claims");
      setClaims(c.rows);
    } catch {
      setClaims([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredClaims = useMemo(() => {
    if (!claims) return [];
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (q && !c.patientName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [claims, filter, search]);

  if (!appts || !claims) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.cnam.title") }} />
        <Loader />
      </>
    );
  }

  const lastMonth = appts.filter((a) => {
    const d = new Date(a.startsAt);
    return Date.now() - d.getTime() < 31 * 24 * 3600 * 1000;
  });

  const totalAmount = filteredClaims.reduce((s, c) => s + c.amount, 0);

  return (
    <>
      <Stack.Screen options={{ title: "CNAM" }} />
      <Screen>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Stat label={t("doctor.cnam.consultations30d")} value={String(lastMonth.length)} />
          <Stat label={t("doctor.cnam.totalCompleted")} value={String(appts.length)} />
        </View>

        <Card title={t("doctor.cnam.guideTitle")}>
          <Row icon="document-text">{t("doctor.cnam.step1")}</Row>
          <Row icon="create">{t("doctor.cnam.step2")}</Row>
          <Row icon="cloud-upload">{t("doctor.cnam.step3")}</Row>
        </Card>

        <Card title={t("doctor.cnamForms.sectionTitle", { count: filteredClaims.length })}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={14} color={colors.foregroundSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("doctor.cnamForms.searchPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              style={styles.searchInput}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {STATUS_FILTERS.map((f) => {
              const active = filter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(
                      f === "all"
                        ? "doctor.cnamForms.filterAll"
                        : `doctor.cnamForms.filter${cap(f)}`
                    )}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredClaims.length === 0 ? (
            <Empty
              icon="document-attach-outline"
              title={t("doctor.cnamForms.noForms")}
              sub={t("doctor.cnamForms.createHint")}
            />
          ) : (
            <>
              <Text style={styles.totalLine}>
                {t("doctor.cnamForms.totalAmount", { count: filteredClaims.length })} —{" "}
                {formatMillimes(totalAmount)}
              </Text>
              {filteredClaims.slice(0, 50).map((c) => (
                <Pressable key={c.id} style={styles.row} onPress={() => setSelected(c)}>
                  <View style={styles.icon}>
                    <Ionicons name="document-attach" size={16} color={colors.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{c.patientName}</Text>
                    <Text style={styles.sub}>
                      {formatDate(c.consultationDate)} · {formatMillimes(c.amount)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: STATUS_COLORS[c.status] + "22" },
                    ]}
                  >
                    <Text style={[styles.statusPillText, { color: STATUS_COLORS[c.status] }]}>
                      {t(`doctor.cnamForms.status${cap(c.status)}`)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </Card>

        <Card title={t("doctor.cnam.listTitle", { count: appts.length })}>
          {appts.length === 0 ? (
            <Empty icon="document-attach-outline" title={t("doctor.cnam.noConsultations")} />
          ) : (
            appts.slice(0, 10).map((a) => (
              <Pressable
                key={a.id}
                style={styles.row}
                onPress={() =>
                  Alert.alert(
                    a.patientName,
                    `${formatDate(a.startsAt)}\n${a.patientPhone}\n\n${t("doctor.cnam.webHint")}`
                  )
                }
              >
                <View style={styles.icon}>
                  <Ionicons name="calendar" size={16} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{a.patientName}</Text>
                  <Text style={styles.sub}>{formatDate(a.startsAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.foregroundSecondary} />
              </Pressable>
            ))
          )}
        </Card>
      </Screen>

      <ClaimModal claim={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function ClaimModal({
  claim,
  onClose,
}: {
  claim: Claim | null;
  onClose: () => void;
}) {
  if (!claim) return null;

  const openPrint = async () => {
    const url = `${getApiBaseUrl().replace(/\/$/, "")}/cnam/${claim.id}/print`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error("no");
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("doctor.cnamForms.openPrintError"), url);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("doctor.cnamForms.viewTitle")}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          <Field label={t("doctor.cnamForms.fieldPatient")} value={claim.patientName} />
          <Field
            label={t("doctor.cnamForms.fieldDate")}
            value={formatDate(claim.consultationDate)}
          />
          <Field
            label={t("doctor.cnamForms.fieldCnam")}
            value={claim.cnamNumber}
            mono
          />
          <Field
            label={t("doctor.cnamForms.fieldRole")}
            value={t(
              claim.patientRole === "assure"
                ? "doctor.cnamForms.roleAssure"
                : "doctor.cnamForms.roleAyantDroit"
            )}
          />
          <Field
            label={t("doctor.cnamForms.fieldAmount")}
            value={formatMillimes(claim.amount)}
          />
          <Field
            label={t("doctor.cnamForms.fieldStatus")}
            value={t(`doctor.cnamForms.status${cap(claim.status)}`)}
          />

          <Pressable style={styles.printBtn} onPress={openPrint}>
            <Ionicons name="open-outline" size={16} color="#fff" />
            <Text style={styles.printBtnText}>{t("doctor.cnamForms.openPrint")}</Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t("doctor.cnamForms.close")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && { fontFamily: "monospace" }]}>{value}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.guideRow}>
      <Ionicons name={icon} size={16} color={colors.teal} />
      <Text style={styles.guideText}>{children}</Text>
    </View>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.teal },
  statLabel: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: "center",
  },
  guideRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  guideText: { flex: 1, fontSize: 12, color: colors.foreground, lineHeight: 17 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  icon: {
    height: 34,
    width: 34,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },

  // Search + filter chips
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.foreground,
    paddingVertical: 2,
  },
  chipsRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.bgSecondary,
  },
  chipActive: { backgroundColor: colors.teal },
  chipText: { fontSize: 11, fontWeight: "600", color: colors.foregroundSecondary },
  chipTextActive: { color: "#fff" },

  totalLine: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    marginVertical: spacing.xs,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: { fontSize: 10, fontWeight: "700" },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: colors.foreground },
  field: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bgSecondary,
  },
  fieldLabel: { fontSize: 11, color: colors.foregroundSecondary, fontWeight: "600" },
  fieldValue: { fontSize: 12, color: colors.foreground, fontWeight: "700" },
  printBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  printBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  closeBtn: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  closeBtnText: { color: colors.foregroundSecondary, fontWeight: "600", fontSize: 12 },
});
